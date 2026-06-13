import { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx-js-style';
import {
  AlertTriangle, Camera, CheckCircle2, Clock, Download, Eye, MapPin, RefreshCw,
  RotateCcw, Search, ShieldAlert, ShieldCheck, X, XCircle,
} from 'lucide-react';

import {
  getAttendanceReport,
  getAttendanceReview,
  updateAttendanceReview,
  type AttendanceReportRow,
  type AttendanceReportSummary,
  type AttendanceReviewItem,
  type AttendanceReviewParams,
} from '../../../lib/api/client';
import { useAuth } from '../../auth/auth-provider';

const validationLabels: Record<string, string> = {
  valid: 'Valid',
  invalid_location: 'Lokasi Tidak Valid',
  face_not_detected: 'Wajah Tidak Terdeteksi',
  manual_review: 'Manual Review',
};

const statusLabels: Record<string, string> = {
  open: 'Sedang Check-In',
  closed: 'Selesai',
  flagged: 'Tidak Disetujui',
};

function today() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
}

function formatTime(value?: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDuration(minutes = 0) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h <= 0) return `${m}m`;
  return `${h}j ${m}m`;
}

function isReviewed(row: AttendanceReviewItem) {
  return row.validationStatus === 'valid' || row.status === 'flagged';
}

function approvalMessage(action: 'approve' | 'reject' | 'reset') {
  if (action === 'approve') return 'Absensi disetujui sebagai valid.';
  if (action === 'reset') return 'Review absensi direset ke manual review.';
  return 'Absensi ditandai tidak disetujui.';
}

function mapsUrl(latitude?: string | null, longitude?: string | null) {
  if (!latitude || !longitude) return '';
  return `https://www.google.com/maps?q=${encodeURIComponent(`${latitude},${longitude}`)}`;
}

function formatDateTimeForExport(value?: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleString('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

const excelHeaderStyle = {
  font: { bold: true, color: { rgb: 'FFFFFF' } },
  fill: { fgColor: { rgb: 'C75A18' } },
  alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
  border: {
    top: { style: 'thin', color: { rgb: 'E5E7EB' } },
    bottom: { style: 'thin', color: { rgb: 'E5E7EB' } },
    left: { style: 'thin', color: { rgb: 'E5E7EB' } },
    right: { style: 'thin', color: { rgb: 'E5E7EB' } },
  },
};

const excelBodyStyle = {
  alignment: { vertical: 'top', wrapText: true },
  border: {
    top: { style: 'thin', color: { rgb: 'E5E7EB' } },
    bottom: { style: 'thin', color: { rgb: 'E5E7EB' } },
    left: { style: 'thin', color: { rgb: 'E5E7EB' } },
    right: { style: 'thin', color: { rgb: 'E5E7EB' } },
  },
};

const excelTitleStyle = {
  font: { bold: true, sz: 16, color: { rgb: '0F172A' } },
  alignment: { vertical: 'center' },
};

const excelLinkStyle = {
  ...excelBodyStyle,
  font: { color: { rgb: '2563EB' }, underline: true },
};

function styleWorksheet(sheet: XLSX.WorkSheet, headerRowIndex = 0) {
  const range = XLSX.utils.decode_range(sheet['!ref'] ?? 'A1:A1');
  for (let row = range.s.r; row <= range.e.r; row += 1) {
    for (let column = range.s.c; column <= range.e.c; column += 1) {
      const address = XLSX.utils.encode_cell({ r: row, c: column });
      const cell = sheet[address];
      if (!cell) continue;
      cell.s = row === headerRowIndex ? excelHeaderStyle : excelBodyStyle;
    }
  }
  sheet['!autofilter'] = {
    ref: XLSX.utils.encode_range({
      s: { r: headerRowIndex, c: range.s.c },
      e: { r: range.e.r, c: range.e.c },
    }),
  };
}

export function AttendanceReviewPage() {
  const { accessToken } = useAuth();
  const [rows, setRows] = useState<AttendanceReviewItem[]>([]);
  const [reportRows, setReportRows] = useState<AttendanceReportRow[]>([]);
  const [summary, setSummary] = useState<AttendanceReportSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [selectedRow, setSelectedRow] = useState<AttendanceReviewItem | null>(null);
  const [filters, setFilters] = useState({
    from: today(),
    to: today(),
    status: '',
    validationStatus: '',
    q: '',
  });

  const params = useMemo<AttendanceReviewParams>(() => ({
    from: filters.from || undefined,
    to: filters.to || undefined,
    status: filters.status || undefined,
    validationStatus: filters.validationStatus || undefined,
    q: filters.q.trim() || undefined,
  }), [filters]);

  async function load() {
    if (!accessToken) return;
    setLoading(true);
    setError('');
    try {
      const [reviewResult, reportResult] = await Promise.all([
        getAttendanceReview(accessToken, params),
        getAttendanceReport(accessToken, params),
      ]);
      setRows(reviewResult.attendance);
      setSummary(reportResult.summary);
      setReportRows(reportResult.rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat review absensi');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, filters.q.trim() ? 350 : 0);
    return () => window.clearTimeout(timer);
  }, [accessToken, params]);

  async function handleApproval(row: AttendanceReviewItem, action: 'approve' | 'reject' | 'reset') {
    if (!accessToken) return;
    setSavingId(row.id);
    setError('');
    setMessage('');
    try {
      await updateAttendanceReview(accessToken, row.id, action);
      setMessage(approvalMessage(action));
      await load();
      setSelectedRow((current) => current?.id === row.id ? null : current);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memproses approval absensi');
    } finally {
      setSavingId('');
    }
  }

  function exportExcel() {
    const workbook = XLSX.utils.book_new();
    workbook.Props = {
      Title: 'Laporan Absensi Sales',
      Subject: 'Review dan rekap absensi sales',
      Author: 'YukSales',
      CreatedDate: new Date(),
    };

    const summarySheet = XLSX.utils.aoa_to_sheet([
      ['Laporan Absensi Sales'],
      ['Periode', `${filters.from || 'Awal'} s/d ${filters.to || 'Akhir'}`],
      ['Total Sesi', summary?.totalSessions ?? 0],
      ['Valid', summary?.validSessions ?? 0],
      ['Perlu Review', summary?.issueSessions ?? 0],
      ['Open', summary?.openSessions ?? 0],
      ['Closed', summary?.closedSessions ?? 0],
      ['Tidak Disetujui', summary?.flaggedSessions ?? 0],
      ['Total Durasi Kerja', formatDuration(summary?.totalWorkMinutes ?? 0)],
    ]);
    summarySheet.A1.s = excelTitleStyle;
    summarySheet['!cols'] = [{ wch: 24 }, { wch: 32 }];
    summarySheet['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }];

    const reportSheet = XLSX.utils.aoa_to_sheet([
      ['Nama', 'Kode Karyawan', 'Email', 'Total Sesi', 'Valid', 'Perlu Review', 'Open', 'Closed', 'Tidak Disetujui', 'Durasi Kerja'],
      ...reportRows.map((row) => [
        row.salesName,
        row.employeeCode ?? '-',
        row.salesEmail ?? '-',
        row.totalSessions,
        row.validSessions,
        row.issueSessions,
        row.openSessions,
        row.closedSessions,
        row.flaggedSessions,
        formatDuration(row.totalWorkMinutes),
      ]),
    ]);
    reportSheet['!cols'] = [
      { wch: 28 }, { wch: 16 }, { wch: 28 }, { wch: 12 }, { wch: 10 },
      { wch: 16 }, { wch: 10 }, { wch: 10 }, { wch: 18 }, { wch: 18 },
    ];
    styleWorksheet(reportSheet);

    const detailSheet = XLSX.utils.aoa_to_sheet([
      [
        'Tanggal', 'Nama Sales', 'Kode Karyawan', 'Email', 'Status', 'Validasi',
        'Check-in', 'Check-out', 'Durasi', 'Face Match', 'Jarak Kantor',
        'Akurasi GPS', 'Latitude In', 'Longitude In', 'Maps Check-in',
        'Latitude Out', 'Longitude Out', 'Maps Check-out',
      ],
      ...rows.map((row) => [
        row.workDate,
        row.salesName,
        row.employeeCode ?? '-',
        row.salesEmail ?? '-',
        statusLabels[row.status] ?? row.status,
        validationLabels[row.validationStatus] ?? row.validationStatus,
        formatDateTimeForExport(row.checkInAt),
        formatDateTimeForExport(row.checkOutAt),
        formatDuration(row.workMinutes ?? 0),
        row.faceDetected ? `${Math.round(Number(row.faceConfidence ?? 0) * 100)}%` : 'Tidak terdeteksi',
        row.checkInDistanceM ? `${row.checkInDistanceM} m` : '-',
        row.checkInAccuracyM ? `${row.checkInAccuracyM} m` : '-',
        row.checkInLatitude ?? '-',
        row.checkInLongitude ?? '-',
        mapsUrl(row.checkInLatitude, row.checkInLongitude) || '-',
        row.checkOutLatitude ?? '-',
        row.checkOutLongitude ?? '-',
        mapsUrl(row.checkOutLatitude, row.checkOutLongitude) || '-',
      ]),
    ]);
    detailSheet['!cols'] = [
      { wch: 14 }, { wch: 28 }, { wch: 16 }, { wch: 28 }, { wch: 18 }, { wch: 22 },
      { wch: 20 }, { wch: 20 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 },
      { wch: 14 }, { wch: 14 }, { wch: 28 }, { wch: 14 }, { wch: 14 }, { wch: 28 },
    ];
    styleWorksheet(detailSheet);

    rows.forEach((row, index) => {
      const excelRow = index + 2;
      const checkInLink = mapsUrl(row.checkInLatitude, row.checkInLongitude);
      const checkOutLink = mapsUrl(row.checkOutLatitude, row.checkOutLongitude);
      const checkInCell = detailSheet[`O${excelRow}`];
      const checkOutCell = detailSheet[`R${excelRow}`];
      if (checkInCell && checkInLink) {
        checkInCell.v = 'Buka Maps';
        checkInCell.l = { Target: checkInLink, Tooltip: 'Buka lokasi check-in di Google Maps' };
        checkInCell.s = excelLinkStyle;
      }
      if (checkOutCell && checkOutLink) {
        checkOutCell.v = 'Buka Maps';
        checkOutCell.l = { Target: checkOutLink, Tooltip: 'Buka lokasi check-out di Google Maps' };
        checkOutCell.s = excelLinkStyle;
      }
    });

    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Ringkasan');
    XLSX.utils.book_append_sheet(workbook, reportSheet, 'Rekap Sales');
    XLSX.utils.book_append_sheet(workbook, detailSheet, 'Detail Absensi');
    XLSX.writeFile(workbook, `laporan-absensi-${filters.from || 'awal'}-${filters.to || 'akhir'}.xlsx`, { compression: true });
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">
            <ShieldCheck size={24} />
            Review Absensi Sales
          </h1>
          <p className="admin-page-subtitle">Validasi absensi, setujui atau tidak setujui sesi, dan lihat laporan absensi sales.</p>
        </div>
        <button onClick={load} className="admin-btn-ghost" type="button" disabled={loading}>
          <RefreshCw size={15} className={loading ? 'spin' : ''} />
          Refresh
        </button>
      </div>

      {error && <div className="admin-alert admin-alert-error"><AlertTriangle size={15} /> {error}</div>}
      {message && <div className="admin-alert admin-alert-success"><CheckCircle2 size={15} /> {message}</div>}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <StatCard label="Total Sesi" value={summary?.totalSessions ?? 0} />
        <StatCard label="Valid" value={summary?.validSessions ?? 0} tone="success" />
        <StatCard label="Perlu Review" value={summary?.issueSessions ?? 0} tone="warning" />
        <StatCard label="Open" value={summary?.openSessions ?? 0} />
        <StatCard label="Closed" value={summary?.closedSessions ?? 0} />
        <StatCard label="Tidak Disetujui" value={summary?.flaggedSessions ?? 0} tone="danger" />
      </section>

      <section className="mt-5 rounded-[1.5rem] border border-admin-border bg-admin-bg-card p-4 shadow-[0_1px_1px_0_rgba(0,_0,_0,_0.025)]">
        <div className="grid gap-3 items-center xl:grid-cols-[160px_160px_180px_220px_minmax(220px,1fr)_auto]">
          <input className="admin-input w-full h-[42px]" type="date" value={filters.from} onChange={(e) => setFilters((current) => ({ ...current, from: e.target.value }))} />
          <input className="admin-input w-full h-[42px]" type="date" value={filters.to} onChange={(e) => setFilters((current) => ({ ...current, to: e.target.value }))} />
          <select className="admin-select w-full h-[42px]" value={filters.status} onChange={(e) => setFilters((current) => ({ ...current, status: e.target.value }))}>
            <option value="">Semua status</option>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
            <option value="flagged">Tidak Disetujui</option>
          </select>
          <select className="admin-select w-full h-[42px]" value={filters.validationStatus} onChange={(e) => setFilters((current) => ({ ...current, validationStatus: e.target.value }))}>
            <option value="">Semua validasi</option>
            <option value="valid">Valid</option>
            <option value="invalid_location">Lokasi Tidak Valid</option>
            <option value="face_not_detected">Wajah Tidak Terdeteksi</option>
            <option value="manual_review">Manual Review</option>
          </select>
          <div className="admin-search-box !mb-0 h-[42px] !py-0 px-3">
            <Search size={18} />
            <input
              className="h-full"
              placeholder="Cari sales, email, HP, kode karyawan..."
              value={filters.q}
              onChange={(e) => setFilters((current) => ({ ...current, q: e.target.value }))}
            />
            {filters.q && (
              <button className="admin-search-clear" type="button" onClick={() => setFilters((current) => ({ ...current, q: '' }))} aria-label="Bersihkan pencarian">
                <X size={14} />
              </button>
            )}
          </div>
          <button className="admin-btn-ghost justify-center h-[42px]" type="button" onClick={exportExcel} disabled={!reportRows.length && !rows.length}>
            <Download size={15} /> Excel
          </button>
        </div>
      </section>

      {loading && !rows.length ? (
        <div className="admin-loading">
          <RefreshCw size={18} className="spin" />
          <span>Memuat data absensi...</span>
        </div>
      ) : (
        <div className="mt-4 grid gap-2.5">
          {rows.map((row) => (
            <article key={row.id} className="grid gap-3 rounded-2xl border border-admin-border bg-admin-bg-card p-3 shadow-sm lg:grid-cols-[64px_minmax(240px,1fr)_minmax(420px,1.5fr)_auto] lg:items-center">
              <button
                className="h-16 w-16 overflow-hidden rounded-xl border border-admin-border-subtle bg-admin-bg shadow-inner"
                type="button"
                onClick={() => setSelectedRow(row)}
                title="Lihat foto absensi"
              >
                {row.faceImageUrl ? (
                  <img src={row.faceImageUrl} alt={row.salesName} className="h-full w-full object-cover" />
                ) : (
                  <span className="grid h-full place-items-center text-admin-border">
                    <Camera size={24} />
                  </span>
                )}
              </button>

              <div className="min-w-0">
                <div className="flex flex-wrap gap-1.5">
                  <Badge text={statusLabels[row.status] ?? row.status} tone={row.status === 'flagged' ? 'danger' : row.status === 'closed' ? 'success' : 'info'} />
                  <Badge text={validationLabels[row.validationStatus] ?? row.validationStatus} tone={row.validationStatus === 'valid' ? 'success' : 'warning'} />
                </div>
                <h2 className="mt-1 truncate text-sm font-black text-admin-foreground">{row.salesName}</h2>
                <p className="truncate text-[11px] font-semibold text-admin-muted">
                  {row.employeeCode ?? '-'} · {row.salesEmail ?? 'Tanpa email'} · {row.workDate}
                </p>
              </div>

              <div className="grid gap-1.5 sm:grid-cols-2 xl:grid-cols-4">
                <CompactMetric icon={Clock} label="Durasi" value={formatDuration(row.workMinutes ?? 0)} />
                <CompactMetric icon={Camera} label="Wajah" value={row.faceDetected ? `${Math.round(Number(row.faceConfidence ?? 0) * 100)}%` : 'Tidak'} />
                <CompactMetric icon={MapPin} label="Jarak" value={`${row.checkInDistanceM ?? '-'}m`} />
                <CompactMetric icon={MapPin} label="Akurasi" value={`${row.checkInAccuracyM ?? '-'}m`} />
              </div>

              <div className="flex flex-wrap justify-end gap-2">
                <button className="admin-btn-ghost px-3 py-2 text-xs" type="button" onClick={() => setSelectedRow(row)}>
                  <Eye size={14} /> Detail
                </button>
                {!isReviewed(row) ? (
                  <>
                    <button
                      className="admin-btn-ghost px-3 py-2 text-xs"
                      type="button"
                      disabled={savingId === row.id}
                      onClick={() => handleApproval(row, 'approve')}
                    >
                      <CheckCircle2 size={14} /> Setujui
                    </button>
                    <button
                      className="admin-btn-ghost px-3 py-2 text-xs"
                      type="button"
                      disabled={savingId === row.id}
                      onClick={() => handleApproval(row, 'reject')}
                    >
                      <XCircle size={14} /> Tolak
                    </button>
                  </>
                ) : (
                  <button
                    className="admin-btn-ghost px-3 py-2 text-xs"
                    type="button"
                    disabled={savingId === row.id}
                    onClick={() => handleApproval(row, 'reset')}
                  >
                    <RotateCcw size={14} /> Reset
                  </button>
                )}
              </div>
            </article>
          ))}

          {!rows.length && (
            <div className="rounded-[2rem] border-2 border-dashed border-admin-border py-20 text-center text-admin-muted">
              <ShieldAlert size={46} className="mx-auto mb-4 opacity-30" />
              <p className="text-base font-black text-admin-foreground">Belum ada data absensi</p>
              <p className="text-sm">Ubah filter atau tunggu sales melakukan absensi.</p>
            </div>
          )}
        </div>
      )}

      {selectedRow && (
        <AttendancePhotoModal
          row={selectedRow}
          saving={savingId === selectedRow.id}
          onClose={() => setSelectedRow(null)}
          onAction={handleApproval}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, tone = 'default' }: { label: string; value: number; tone?: 'default' | 'success' | 'warning' | 'danger' }) {
  const color = tone === 'success' ? 'var(--admin-success)' : tone === 'warning' ? 'var(--admin-warning)' : tone === 'danger' ? 'var(--admin-danger)' : 'var(--admin-accent)';
  return (
    <div className="rounded-[1.25rem] border border-admin-border bg-admin-bg-card p-4 shadow-[0_1px_1px_0_rgba(0,_0,_0,_0.025)]">
      <p className="text-xs font-black uppercase tracking-wide text-admin-muted">{label}</p>
      <strong className="mt-2 block text-2xl font-black" style={{ color }}>{value}</strong>
    </div>
  );
}

function Badge({ text, tone }: { text: string; tone: 'success' | 'warning' | 'danger' | 'info' }) {
  const cls = tone === 'success'
    ? 'bg-admin-success-soft text-admin-success'
    : tone === 'danger'
      ? 'bg-admin-danger-soft text-admin-danger'
      : tone === 'warning'
        ? 'bg-admin-warning-soft text-admin-warning'
        : 'bg-admin-accent-shadow text-admin-accent';
  return <span className={`rounded-xl px-2.5 py-1 text-[11px] font-black ${cls}`}>{text}</span>;
}

function Metric({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-admin-border-subtle bg-admin-bg/50 p-3">
      <div className="mb-1 flex items-center gap-2 text-admin-accent">
        <Icon size={13} strokeWidth={3} />
        <span className="text-[10px] font-black uppercase tracking-widest text-admin-subtle">{label}</span>
      </div>
      <p className="text-sm font-bold leading-tight text-admin-foreground">{value}</p>
    </div>
  );
}

function CompactMetric({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-xl border border-admin-border-subtle bg-admin-bg/45 px-2.5 py-2">
      <Icon size={13} className="shrink-0 text-admin-accent" strokeWidth={3} />
      <div className="min-w-0">
        <p className="text-[9px] font-black uppercase tracking-wider text-admin-subtle">{label}</p>
        <p className="truncate text-xs font-black text-admin-foreground">{value}</p>
      </div>
    </div>
  );
}

function AttendancePhotoModal({
  row,
  saving,
  onClose,
  onAction,
}: {
  row: AttendanceReviewItem;
  saving: boolean;
  onClose: () => void;
  onAction: (row: AttendanceReviewItem, action: 'approve' | 'reject' | 'reset') => void;
}) {
  const reviewed = isReviewed(row);
  const checkInMapsUrl = mapsUrl(row.checkInLatitude, row.checkInLongitude);
  const checkOutMapsUrl = mapsUrl(row.checkOutLatitude, row.checkOutLongitude);
  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-black/45 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-[1.75rem] border border-admin-border bg-admin-bg-card shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-admin-border-subtle p-5">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-admin-accent">Detail Absensi</p>
            <h2 className="truncate text-xl font-black text-admin-foreground">{row.salesName}</h2>
            <p className="text-xs font-semibold text-admin-muted">{row.employeeCode ?? '-'} · {row.salesEmail ?? 'Tanpa email'} · {row.workDate}</p>
          </div>
          <button className="admin-btn-ghost h-10 w-10 justify-center p-0" type="button" onClick={onClose} aria-label="Tutup detail absensi">
            <X size={18} />
          </button>
        </div>

        <div className="grid max-h-[calc(92vh-92px)] overflow-y-auto md:grid-cols-[minmax(260px,0.85fr)_1fr]">
          <div className="bg-admin-bg p-5">
            <div className="aspect-[4/5] overflow-hidden rounded-[1.25rem] border border-admin-border-subtle bg-admin-bg-card shadow-inner">
              {row.faceImageUrl ? (
                <img src={row.faceImageUrl} alt={`Foto absensi ${row.salesName}`} className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full place-items-center text-admin-border">
                  <Camera size={58} />
                </div>
              )}
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Badge text={statusLabels[row.status] ?? row.status} tone={row.status === 'flagged' ? 'danger' : row.status === 'closed' ? 'success' : 'info'} />
              <Badge text={validationLabels[row.validationStatus] ?? row.validationStatus} tone={row.validationStatus === 'valid' ? 'success' : 'warning'} />
            </div>
          </div>

          <div className="p-5">
            <div className="grid gap-2 sm:grid-cols-2">
              <Metric icon={Clock} label="Durasi Absensi" value={formatDuration(row.workMinutes ?? 0)} />
              <Metric icon={Camera} label="Face Match" value={row.faceDetected ? `Terdeteksi ${Math.round(Number(row.faceConfidence ?? 0) * 100)}%` : 'Tidak terdeteksi'} />
              <Metric icon={MapPin} label="Jarak Kantor" value={`${row.checkInDistanceM ?? '-'}m`} />
              <Metric icon={MapPin} label="Akurasi GPS" value={`${row.checkInAccuracyM ?? '-'}m`} />
            </div>

            <div className="mt-4 rounded-2xl border border-admin-border-subtle p-4">
              <p className="text-xs font-black uppercase tracking-wider text-admin-muted">Waktu Absensi</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <InfoLine label="Check-in" value={formatTime(row.checkInAt)} />
                <InfoLine label="Check-out" value={formatTime(row.checkOutAt)} />
                <InfoLine label="Latitude in" value={row.checkInLatitude ?? '-'} />
                <InfoLine label="Longitude in" value={row.checkInLongitude ?? '-'} />
                <InfoLine label="Latitude out" value={row.checkOutLatitude ?? '-'} />
                <InfoLine label="Longitude out" value={row.checkOutLongitude ?? '-'} />
              </div>
              <div className="mt-4 flex flex-wrap gap-2 border-t border-admin-border-subtle pt-3">
                <MapLink href={checkInMapsUrl} label="Buka Maps Check-in" />
                <MapLink href={checkOutMapsUrl} label="Buka Maps Check-out" />
              </div>
            </div>

            <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-admin-border-subtle pt-4">
              {!reviewed ? (
                <>
                  <button className="admin-btn-ghost px-4 py-2 text-sm" type="button" disabled={saving} onClick={() => onAction(row, 'reject')}>
                    <XCircle size={15} /> Tidak Setujui
                  </button>
                  <button className="admin-btn-primary px-4 py-2 text-sm" type="button" disabled={saving} onClick={() => onAction(row, 'approve')}>
                    <CheckCircle2 size={15} /> Setujui Absensi
                  </button>
                </>
              ) : (
                <button className="admin-btn-ghost px-4 py-2 text-sm" type="button" disabled={saving} onClick={() => onAction(row, 'reset')}>
                  <RotateCcw size={15} /> Reset Review
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-black uppercase tracking-wider text-admin-subtle">{label}</p>
      <p className="mt-1 text-sm font-bold text-admin-foreground">{value}</p>
    </div>
  );
}

function MapLink({ href, label }: { href: string; label: string }) {
  if (!href) {
    return (
      <button className="admin-btn-ghost px-3 py-2 text-xs" type="button" disabled>
        <MapPin size={14} /> {label}
      </button>
    );
  }

  return (
    <a className="admin-btn-ghost px-3 py-2 text-xs" href={href} target="_blank" rel="noreferrer">
      <MapPin size={14} /> {label}
    </a>
  );
}
