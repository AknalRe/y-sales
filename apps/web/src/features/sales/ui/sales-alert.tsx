import { AlertCircle, CheckCircle2, Info, WifiOff, X } from 'lucide-react';
import { toast } from '@/utils/helpers/toast-bridge';

export type SalesAlertTone = 'success' | 'error' | 'warning' | 'info';

const errorPattern = /(gagal|error|tidak terdeteksi|tidak valid|ditolak|di luar radius|radius|gps|lokasi tidak|akurasi|terlalu rendah|salah|expired|kedaluwarsa|invalid|unauthorized|forbidden|tidak ditemukan|tidak bisa|wajib|harus)/i;
const warningPattern = /(offline|sync|sinkron|tersinkron|disimpan offline|menunggu|approval|review|perlu verifikasi)/i;
const successPattern = /(berhasil|terkirim|selesai|tersimpan|disetujui)/i;
let lastToast: { key: string; at: number } | null = null;

export function inferSalesAlertTone(message: string): SalesAlertTone {
  if (errorPattern.test(message)) return 'error';
  if (warningPattern.test(message)) return 'warning';
  if (successPattern.test(message)) return 'success';
  return 'info';
}

export function showSalesAlertToast(message: string, tone?: SalesAlertTone) {
  if (!message) return;

  const resolvedTone = tone ?? inferSalesAlertTone(message);
  const key = `${resolvedTone}:${message}`;
  const now = Date.now();
  if (lastToast?.key === key && now - lastToast.at < 900) return;
  lastToast = { key, at: now };

  const title = resolvedTone === 'success'
    ? 'Berhasil'
    : resolvedTone === 'error'
      ? 'Gagal diproses'
      : resolvedTone === 'warning'
        ? 'Perlu perhatian'
        : 'Informasi';
  const duration = resolvedTone === 'error' ? 6000 : resolvedTone === 'warning' ? 5000 : 3500;

  toast[resolvedTone](title, message, { duration });
}

type SalesAlertProps = {
  message?: string;
  tone?: SalesAlertTone;
  onClose?: () => void;
  className?: string;
};

export function SalesAlert({ message, tone, onClose, className = '' }: SalesAlertProps) {
  if (!message) return null;

  const resolvedTone = tone ?? inferSalesAlertTone(message);
  const Icon = resolvedTone === 'success'
    ? CheckCircle2
    : resolvedTone === 'error'
      ? AlertCircle
      : resolvedTone === 'warning'
        ? WifiOff
        : Info;

  return (
    <div
      className={`sales-alert sales-alert-${resolvedTone} ${className}`.trim()}
      role={resolvedTone === 'error' ? 'alert' : 'status'}
    >
      <Icon size={16} aria-hidden="true" />
      <span>{message}</span>
      {onClose && (
        <button type="button" className="sales-alert-close" onClick={onClose} aria-label="Tutup pesan">
          <X size={14} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
