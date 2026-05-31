# Consignment Flow

Dokumen ini menjadi kontrak ringkas untuk flow konsinyasi YukSales.

## Prinsip

- Konsinyasi adalah titip jual ke outlet, bukan penjualan final saat barang dititipkan.
- Stok outlet konsinyasi tidak boleh minus.
- Barang tetap milik company sampai outlet melaporkan terjual/dibayar dan action disetujui admin.
- Sales yang melakukan update konsinyasi tidak harus sales pembuat transaksi awal. Konsinyasi melekat ke outlet dan company.

## Flow Utama

1. Sales check-in ke outlet sesuai jadwal.
2. Sales membuat transaksi dengan payment method `consignment`.
3. Admin approve transaksi.
4. Backend membuat `consignments` dan `consignment_items`.
5. Backend memindahkan stok dari warehouse sales ke warehouse outlet tipe `outlet_consignment`.
6. Sales berikutnya yang visit outlet dapat melihat sisa konsinyasi.
7. Sales submit action:
   - `report_sold`: outlet melaporkan barang terjual/dibayar.
   - `withdraw`: sales menarik barang dari outlet.
   - `collect_payment`: sales mencatat pembayaran tanpa perubahan qty.
8. Action masuk `pending_approval`.
9. Admin approve/reject action.
10. Setelah approve:
    - `report_sold`: `paidQuantity` naik, `remainingQuantity` turun, stok outlet konsinyasi turun.
    - `withdraw`: `remainingQuantity` turun, stok outlet konsinyasi turun, stok sales penarik naik.

## Endpoint Utama

- `POST /sales/orders`: membuat transaksi konsinyasi dari visit aktif.
- `POST /sales/orders/:id/approve`: admin approve transaksi dan transfer stok ke outlet konsinyasi.
- `GET /sales/consignments?outletId=...`: sales melihat konsinyasi aktif outlet saat visit.
- `POST /sales/consignments/:id/actions`: sales submit update konsinyasi.
- `GET /consignment-actions?status=pending_approval`: admin melihat action yang menunggu approval.
- `POST /consignment-actions/:id/approve`: admin posting perubahan final.
- `POST /consignment-actions/:id/reject`: admin menolak laporan sales.
