# YukTrackingSales / Sales Tracking - Project Vision and Prompt Guide

Dokumen ini adalah pegangan bersama untuk user dan Codex setiap kali melanjutkan pekerjaan di project `sales-tracking`. Tujuannya agar visi produk, alur bisnis, dan keputusan yang sudah disepakati tidak hilang saat membuat prompt baru.

## Identitas Project

Nama kerja project: YukTrackingSales / Yuk Tracking Sales Management System.

Project ini adalah platform multi-company untuk mengelola aktivitas sales lapangan dari jadwal kunjungan outlet sampai transaksi, stok, approval, dan laporan. Sistem harus mendukung kerja operasional harian admin/company owner dan sales, bukan hanya dashboard statis.

## Visi Produk

YukTrackingSales harus menjadi sistem operasional sales lapangan yang:

- memastikan sales benar-benar hadir dan melakukan visit ke outlet yang tepat;
- membantu admin/company owner menjadwalkan outlet yang harus dikunjungi sales;
- mencatat check-in dan check-out sales ( karyawan );
- mencatat check-in dan check-out outlet dengan GPS, radius outlet, waktu, dan bukti foto bila diwajibkan;
- mencatat in out stok dan management stok oleh non-sales;
- menjaga stok sales agar berkurang hanya melalui proses transaksi yang valid dan dapat diaudit;
- mendukung transaksi langsung maupun piutang;
- mewajibkan atau mengizinkan bukti foto transaksi sesuai setting company;
- menyediakan approval admin untuk transaksi, stok, bukti foto, dan proses penting lain;
- memisahkan invoice outlet dari invoice platform;
- bisa dikembangkan menjadi produk SaaS yang company setting-nya dapat dikendalikan dari admin platform.

## Prinsip Bisnis Yang Sudah Disepakati

### 1. Visit Outlet

Sales melakukan kunjungan ke outlet dengan flow:

1. Admin/company owner membuat atau mengatur jadwal outlet untuk sales.
2. Sales melihat daftar outlet yang dijadwalkan.
3. Sales boleh memilih urutan kunjungan sendiri, tetapi outlet tetap harus sesuai list jadwal.
4. Saat sampai outlet, sales melakukan check-in.
5. Sistem validasi lokasi sales terhadap titik outlet dan radius outlet.
6. Sales melakukan aktivitas visit, order, atau pencatatan lain.
7. Sales melakukan check-out.
8. Visit menjadi bukti aktivitas lapangan.

### 2. Jadwal Sales

Jadwal sales adalah rencana kerja yang dibuat admin/company owner.

Yang harus dijaga:

- daftar outlet untuk sales sudah ditentukan oleh admin/company owner;
- sales tidak harus mengikuti urutan outlet secara kaku;
- sales tetap harus mengunjungi outlet dari daftar yang dijadwalkan;
- admin perlu halaman untuk membuat, mengubah, menyetujui, membatalkan, dan melihat realisasi jadwal;
- performa sales dihitung dari target outlet, outlet dikunjungi, durasi, closing, dan omzet.

### 3. Outlet Management

Outlet adalah master customer/toko/agen yang dikunjungi sales.

Fitur outlet harus mencakup:

- CRUD outlet;
- status outlet, seperti pending, active, rejected, inactive;
- foto outlet;
- titik lokasi outlet;
- radius geofence outlet;
- verifikasi atau reject outlet oleh admin;
- pemilihan titik lokasi lewat maps, bukan hanya input latitude/longitude manual.

Radius prioritas:

1. radius khusus outlet;
2. fallback ke setting default company/system.

### 4. Check-In dan Check-Out

Check-in/check-out outlet adalah bukti kehadiran sales di outlet.

Validasi yang diharapkan:

- outlet aktif dan berada di tenant/company yang sama;
- outlet termasuk jadwal sales jika ada jadwal pada hari tersebut;
- GPS sales berada dalam radius outlet;
- akurasi GPS masuk batas toleransi;
- foto wajah atau bukti lain bisa diwajibkan sesuai setting;
- check-out menutup visit session dan menghitung durasi.

### 5. Transaksi Outlet

Transaksi outlet dibuat oleh sales saat atau setelah visit.

Aturan utama:

- transaksi terhubung ke sales, outlet, dan idealnya visit session;
- transaksi bisa pembayaran langsung atau menjadi piutang;
- sales wajib upload foto bukti jika setting company mewajibkan;
- jika setting bukti foto optional, transaksi tetap bisa dibuat tanpa foto;
- transaksi masuk ke status approval/review admin;
- stok sales berkurang setelah transaksi valid sesuai proses approval yang disepakati;
- dokumen foto transaksi menjadi bukti keabsahan transaksi outlet.

### 6. Stok Sales

Stok sales adalah stok yang dibawa atau dimiliki sales untuk aktivitas lapangan.

Prinsipnya:

- stok sales tidak boleh berkurang diam-diam tanpa transaksi atau approval yang jelas;
- transaksi outlet mengurangi stok sales setelah validasi/approval admin;
- admin harus bisa melihat perubahan stok, sumber transaksi, dan status approval;
- stok perlu bisa diaudit dari warehouse pusat, stok sales, dan outlet jika ada konsinyasi.

### 7. Approval Admin

Approval adalah guardrail bisnis.

Area yang perlu approval atau review:

- transaksi sales;
- bukti foto transaksi;
- pengurangan stok sales;
- outlet baru atau perubahan outlet penting;
- jadwal sales jika flow company mengharuskan;
- setoran atau deposit jika modul dipakai.

Approval harus meninggalkan audit trail: siapa yang approve/reject, kapan, alasan, dan status akhir.

### 8. Invoice

Ada dua jenis invoice yang tidak boleh dicampur:

- Invoice outlet: invoice untuk transaksi penjualan sales ke outlet/customer.
- Invoice platform: invoice untuk pembelian akun, akses company, subscription, atau penggunaan platform secara digital.

Invoice outlet mengikuti flow transaksi outlet.

Invoice platform otomatis dibuat saat user/company membeli akses platform atau paket layanan secara digital.

### 9. Setting Company dan Platform

Beberapa aturan tidak harus selalu aktif dari awal, tetapi harus dirancang agar bisa diaktifkan lewat setting.

Setting yang penting:

- radius default outlet;
- apakah bukti foto transaksi wajib;
- apakah foto wajah visit wajib;
- apakah face recognition aktif;
- apakah approval jadwal wajib;
- apakah transaksi wajib terkait visit session;
- fitur company/subscription/platform access.

Halaman admin platform harus dapat mengatur setting yang bersifat SaaS/platform. Halaman admin company mengatur operasional company masing-masing.

## Role Utama

- Super Admin Platform: mengelola platform, company, paket, akses, invoice platform, dan setting global.
- Admin/Owner Company: mengelola user, sales, outlet, jadwal, produk, stok, transaksi, approval, dan laporan company.
- Supervisor: membantu review jadwal, visit, outlet, dan approval sesuai permission.
- Sales: melihat jadwal, visit outlet, check-in/check-out, membuat transaksi, upload bukti, dan melihat stoknya.

## Arah UI/UX

UI harus terasa seperti aplikasi operasional modern:

- rapi, padat, dan mudah discan;
- cocok untuk admin yang bekerja berulang setiap hari;
- tidak seperti landing page marketing;
- sidebar harus mencerminkan modul bisnis utama;
- tabel, filter, status badge, drawer/modal, dan action button harus jelas;
- action penting harus memberi feedback, loading state, error state, dan success state;
- halaman sales harus nyaman untuk mobile/PWA;
- visual boleh mengikuti referensi style dari project `sistem-mahasura`, tetapi tetap disesuaikan dengan domain sales tracking.

Menu admin company yang perlu ada atau diarahkan:

- Dashboard;
- Management Outlet;
- Jadwalkan Sales;
- Visit Review;
- Sales Transactions;
- Approval;
- Inventory/Stok;
- Products;
- Reports;
- Settings.

## Aturan Teknis Saat Melanjutkan Project

Saat Codex bekerja di project ini:

- baca struktur dan file terkait dulu sebelum mengubah;
- jangan reset atau revert perubahan user yang belum commit;
- jaga perubahan tetap scoped;
- gunakan pattern yang sudah ada di repo;
- jalankan typecheck/build/lint yang relevan bila memungkinkan;
- jika pull dari git, simpan perubahan lokal lebih dulu dengan cara aman;
- jangan mencampur invoice outlet dan invoice platform;
- jangan hardcode base API URL jika sudah bisa dari env;
- jangan menghapus setting yang sudah dibuat untuk membuat fitur optional;
- jangan mengabaikan tenant/company boundary;
- setiap endpoint admin harus menghormati permission dan tenant;
- media/foto harus dilindungi agar tidak bocor lintas tenant.

## Prompt Ulang Yang Disarankan

Gunakan prompt berikut saat ingin melanjutkan development:

```text
Kita sedang mengerjakan project YukTrackingSales / sales-tracking.
Baca dulu docs/project-vision-and-prompt-guide.md agar visi bisnis dan keputusan sebelumnya tetap konsisten.

Fokus project:
- sales visit outlet dengan check-in/check-out;
- jadwal outlet dibuat admin/company owner, sales boleh pilih urutan tapi harus dari list jadwal;
- validasi radius outlet/GPS;
- transaksi outlet langsung atau piutang;
- bukti foto transaksi bisa wajib/optional via setting company;
- stok sales berkurang setelah transaksi valid dan approval admin;
- invoice outlet dipisah dari invoice platform;
- admin platform dapat mengatur setting SaaS/company.

Tolong lanjutkan pekerjaan pada area: [isi area yang ingin dikerjakan].
Sebelum edit, audit file terkait dulu. Jangan reset/revert perubahan lokal yang belum commit. Setelah selesai, verifikasi dengan typecheck/build/test yang relevan dan jelaskan ringkas.
```

## Checklist Saat Menambah Fitur Baru

Sebelum implementasi:

- apakah fitur ini milik platform admin, company admin, supervisor, atau sales?
- apakah harus tenant-aware?
- apakah butuh permission baru?
- apakah butuh setting agar optional?
- apakah ada dampak ke stok, transaksi, invoice, atau approval?
- apakah perlu audit trail?
- apakah UI sudah sesuai workflow harian user?

Sesudah implementasi:

- route/menu tersedia bila user memang perlu mengaksesnya;
- loading, empty, error, dan success state tersedia;
- validasi frontend dan backend konsisten;
- typecheck/build berjalan;
- perubahan tidak merusak flow login, tenant, dan auth.

## Keputusan Penting Yang Perlu Diingat

- Sales boleh menentukan urutan visit sendiri, tetapi tetap dari outlet yang dijadwalkan.
- Bukti foto transaksi harus bisa diwajibkan atau dibuat optional lewat setting.
- Radius outlet sudah menjadi bagian penting dari validasi check-in/check-out.
- Penentuan titik outlet harus bisa lewat maps.
- Stok sales berkurang setelah transaksi valid melalui proses yang bisa direview admin.
- Invoice outlet dan invoice platform adalah dua domain berbeda.
- Fitur yang belum wajib sekarang sebaiknya tetap dirancang agar bisa diaktifkan melalui setting.

