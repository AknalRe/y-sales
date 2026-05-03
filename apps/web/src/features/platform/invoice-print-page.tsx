import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Printer, ReceiptText } from 'lucide-react';
import { useAuth } from '../auth/auth-provider';
import { platformGetInvoice, type PlatformInvoiceDetail } from '@/lib/api/platform';

const money = (value: string | number | undefined | null) => `Rp ${Number(value || 0).toLocaleString('id-ID')}`;
const date = (value?: string | null) => value ? new Date(value).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : '-';
const statusLabel: Record<string, string> = {
  draft: 'Draft', issued: 'Issued', paid: 'Paid', overdue: 'Overdue', void: 'Void', cancelled: 'Cancelled',
};

export function PlatformInvoicePrintPage() {
  const { id } = useParams();
  const { accessToken } = useAuth();
  const [invoice, setInvoice] = useState<PlatformInvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!accessToken || !id) return;
    setLoading(true);
    platformGetInvoice(accessToken, id)
      .then(data => setInvoice(data.invoice))
      .catch((e: any) => setError(e.message ?? 'Invoice tidak ditemukan.'))
      .finally(() => setLoading(false));
  }, [accessToken, id]);

  if (loading) return <div className="platform-page"><div className="platform-loading">Memuat invoice...</div></div>;
  if (error || !invoice) return <div className="platform-page"><div className="platform-alert platform-alert-error">{error || 'Invoice tidak ditemukan.'}</div></div>;

  const totalPaid = invoice.payments?.filter(payment => payment.status === 'succeeded').reduce((sum, payment) => sum + Number(payment.amount || 0), 0) ?? 0;
  const balance = Math.max(0, Number(invoice.totalAmount || 0) - totalPaid);

  return (
    <div className="platform-page invoice-print-page-shell">
      <div className="invoice-print-toolbar no-print">
        <Link to="/platform/billing" className="platform-btn platform-btn-ghost"><ArrowLeft size={16} /> Kembali</Link>
        <button id="print-invoice-btn" onClick={() => window.print()} className="platform-btn platform-btn-primary" type="button"><Printer size={16} /> Cetak / Save PDF</button>
      </div>

      <main className="invoice-print-sheet">
        <header className="invoice-print-header">
          <div className="invoice-brand">
            <div className="invoice-logo"><ReceiptText size={28} /></div>
            <div>
              <h1>YukSales</h1>
              <p>Platform SaaS Subscription Billing</p>
            </div>
          </div>
          <div className="invoice-title-box">
            <span>INVOICE</span>
            <strong>{invoice.invoiceNumber}</strong>
            <em className={`platform-status-dot platform-status-${invoice.status}`}>{statusLabel[invoice.status] ?? invoice.status}</em>
          </div>
        </header>

        <section className="invoice-meta-grid">
          <div>
            <span>Ditagihkan Kepada</span>
            <strong>{invoice.company?.name ?? invoice.companyName ?? '-'}</strong>
            <p>{invoice.company?.email ?? '-'}</p>
            <p>{[invoice.company?.city, invoice.company?.province].filter(Boolean).join(', ') || '-'}</p>
          </div>
          <div>
            <span>Detail Invoice</span>
            <dl>
              <div><dt>Tanggal Terbit</dt><dd>{date(invoice.issuedAt)}</dd></div>
              <div><dt>Jatuh Tempo</dt><dd>{date(invoice.dueAt)}</dd></div>
              <div><dt>Billing Cycle</dt><dd>{invoice.billingCycle}</dd></div>
              <div><dt>Billing Reason</dt><dd>{invoice.billingReason}</dd></div>
            </dl>
          </div>
        </section>

        <section className="invoice-period-card">
          <div><span>Periode Layanan</span><strong>{date(invoice.periodStart)} — {date(invoice.periodEnd)}</strong></div>
          <div><span>Plan</span><strong>{invoice.subscription?.planCode ?? '-'}</strong></div>
        </section>

        <section className="invoice-table-card">
          <table className="invoice-items-table">
            <thead>
              <tr><th>Deskripsi</th><th>Qty</th><th>Harga</th><th>Total</th></tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <strong>Subscription {invoice.subscription?.planCode ?? 'Platform'}</strong>
                  <small>{invoice.billingReason} · {invoice.billingCycle}</small>
                </td>
                <td>1</td>
                <td>{money(invoice.subtotalAmount)}</td>
                <td>{money(invoice.subtotalAmount)}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section className="invoice-summary-row">
          <div className="invoice-notes-box">
            <span>Catatan</span>
            <p>{invoice.notes || 'Terima kasih telah menggunakan YukSales.'}</p>
          </div>
          <div className="invoice-total-box">
            <div><span>Subtotal</span><strong>{money(invoice.subtotalAmount)}</strong></div>
            <div><span>Diskon</span><strong>- {money(invoice.discountAmount)}</strong></div>
            <div><span>Pajak</span><strong>{money(invoice.taxAmount)}</strong></div>
            <div className="invoice-grand-total"><span>Total</span><strong>{money(invoice.totalAmount)}</strong></div>
            <div><span>Dibayar</span><strong>{money(totalPaid)}</strong></div>
            <div><span>Sisa</span><strong>{money(balance)}</strong></div>
          </div>
        </section>

        {invoice.payments && invoice.payments.length > 0 && (
          <section className="invoice-payments-box">
            <h2>Riwayat Pembayaran</h2>
            {invoice.payments.map(payment => (
              <div key={payment.id} className="invoice-payment-line">
                <span>{date(payment.paidAt)} · {payment.method} · {payment.paymentRef ?? 'manual'}</span>
                <strong>{money(payment.amount)}</strong>
              </div>
            ))}
          </section>
        )}

        <footer className="invoice-print-footer">
          <p>Invoice ini dibuat secara otomatis oleh YukSales Platform Billing.</p>
          <strong>yuksales.id</strong>
        </footer>
      </main>
    </div>
  );
}
