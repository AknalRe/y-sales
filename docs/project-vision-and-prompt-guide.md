# YukTrackingSales / Sales Tracking - Project Vision and Prompt Guide

Dokumen ini adalah pegangan bersama untuk user dan Codex setiap kali melanjutkan pekerjaan di project `sales-tracking`. Tujuannya agar visi produk, alur bisnis, keputusan teknis, dan arah implementasi tetap konsisten walaupun percakapan sudah panjang.

## Identitas Project

Nama kerja project: YukTrackingSales / Yuk Tracking Sales Management System.

Project ini adalah platform multi-company untuk mengelola aktivitas sales lapangan dari jadwal kunjungan outlet sampai check-in/check-out, transaksi, bukti foto, stok sales, approval admin, piutang, invoice, dan laporan. Sistem harus terasa seperti aplikasi operasional harian untuk admin/company owner dan sales, bukan hanya dashboard tampilan.

## Visi Produk

YukTrackingSales harus menjadi sistem operasional sales lapangan yang:

- memastikan sales benar-benar hadir dan melakukan visit ke outlet yang tepat;
- membantu admin/company owner menjadwalkan outlet yang harus dikunjungi sales;
- mencatat check-in dan check-out sales/karyawan secara umum;
- mencatat check-in dan check-out outlet dengan GPS, radius outlet, waktu, dan bukti foto bila diwajibkan;
- mencatat in/out stok dan manajemen stok oleh admin/non-sales;
- menjaga stok sales agar berkurang hanya melalui transaksi yang valid dan bisa diaudit;
- mendukung transaksi langsung, piutang, dan konsinyasi;
- mewajibkan atau mengizinkan bukti foto transaksi sesuai setting company;
- mengelola profil company, titik kantor, timezone, dan integrasi teknis yang memengaruhi absensi, visit, media, dan verifikasi wajah;
- menyediakan approval admin untuk transaksi, stok, bukti foto, outlet, dan proses penting lain;
- memisahkan invoice outlet dari invoice platform;
- bisa dikembangkan sebagai SaaS yang setting company dan akses platform-nya dikelola dari admin platform.

## Prinsip Utama

- Backend adalah sumber kebenaran flow bisnis, permission, tenant boundary, status entity, dan validasi.
- Frontend wajib mengikuti flow backend, bukan membuat aturan bisnis sendiri yang berbeda.
- Setiap data operasional harus tenant-aware: data company A tidak boleh terlihat oleh company B.
- Fitur yang belum wajib sekarang tetap dirancang agar bisa diaktifkan melalui setting.
- Approval harus meninggalkan audit trail.
- Sales mobile harus sederhana, cepat, dan hanya menampilkan pekerjaan sales tersebut.
- Admin company harus bisa review, filter, approve/reject, dan melihat dampak stok/laporan.
- Admin platform harus mengelola company, subscription, billing, dan setting platform tanpa mencampur domain transaksi outlet.

## Flow Bisnis Yang Disepakati

### 1. Absensi Sales/Karyawan

Absensi adalah kehadiran kerja umum, berbeda dari visit outlet.

Flow:

1. User melakukan check-in kerja.
2. Sistem menyimpan waktu, lokasi, dan foto wajah bila setting mewajibkan.
3. User melakukan check-out kerja.
4. Admin bisa review absensi.

Catatan:

- Absensi tidak sama dengan visit outlet.
- Visit outlet tetap butuh schedule/outlet/radius sendiri.
- Company bisa mengatur apakah absensi kerja wajib dilakukan di titik kantor.
- Jika `requireAttendanceAtOffice` aktif, backend memvalidasi lokasi absensi terhadap latitude/longitude company dan default radius company.
- Jika titik kantor belum diatur, backend harus menolak check-in absensi dengan pesan yang jelas.
- Backend wajib menolak absensi jika GPS integrity gagal: fake/mock GPS terdeteksi, koordinat invalid, akurasi invalid, timestamp lokasi basi, timestamp masa depan, atau perpindahan lokasi tidak wajar.
- Web browser tidak bisa memastikan fake GPS secara absolut; jika aplikasi mobile/native nanti bisa membaca flag mocked location, kirim ke backend sebagai `isMocked=true`/`isMockedLocation=true` agar langsung gagal.
- Jika `requireFaceIdentityMatchForAttendance` aktif, absensi wajib memanggil provider face recognition dan mencocokkan wajah dengan template aktif user. Jika tidak cocok, sesi masuk `manual_review`.

### 2. Management Outlet

Outlet adalah master customer/toko/agen yang dikunjungi sales.

Fitur outlet harus mencakup:

- CRUD outlet;
- status outlet: `draft`, `pending_verification`, `active`, `rejected`, `inactive`;
- foto outlet;
- titik lokasi outlet;
- radius geofence outlet;
- verifikasi atau reject outlet oleh admin;
- pemilihan titik lokasi lewat maps, bukan hanya input latitude/longitude manual.

Aturan:

- Outlet harus milik company yang sama dengan user.
- Hanya outlet `active` yang boleh dipakai untuk jadwal visit.
- Radius prioritas: radius khusus outlet, lalu fallback ke default radius company.

### 3. Jadwal Sales

Jadwal sales adalah rencana kerja yang dibuat admin/company owner.

Flow:

1. Admin/company owner memilih sales aktif.
2. Admin memilih outlet aktif.
3. Sistem membuat schedule per outlet untuk tanggal tertentu.
4. Admin bisa approve atau cancel schedule.
5. Sales melihat daftar outlet yang dijadwalkan hari ini.
6. Sales boleh menentukan urutan visit sendiri, tetapi tetap dari list jadwal.

Aturan backend:

- Schedule tidak boleh dibuat untuk user yang tidak aktif.
- Schedule tidak boleh dibuat untuk outlet non-active.
- Outlet yang sama tidak boleh dijadwalkan dua kali untuk sales dan tanggal yang sama, kecuali schedule sebelumnya sudah `cancelled`.
- `GET /visits/today` harus menjadi sumber daftar outlet sales hari ini.

Status schedule:

- `assigned`: jadwal dibuat dan bisa dimulai.
- `approved`: jadwal disetujui dan bisa dimulai.
- `in_progress`: sales sudah check-in pada schedule tersebut.
- `completed`: sales sudah check-out.
- `cancelled`: jadwal dibatalkan.
- `missed`: jadwal terlewat.

### 4. Visit Outlet

Visit outlet adalah bukti sales benar-benar mengunjungi outlet.

Flow:

1. Sales membuka halaman visit.
2. Frontend mengambil list dari `/visits/today`.
3. Sales memilih salah satu schedule/outlet.
4. Sales mengambil foto wajah dan lokasi GPS.
5. Sales check-in.
6. Backend validasi outlet, schedule, tenant, radius, GPS accuracy, dan face setting.
7. Backend juga validasi GPS integrity; fake/mock GPS atau lompatan lokasi tidak wajar harus gagal, bukan masuk approval.
7. Sales melakukan aktivitas di outlet.
8. Sales check-out dengan outcome kunjungan.
9. Schedule berubah menjadi `completed`.

Aturan:

- Frontend sales tidak boleh mengambil semua outlet dari `/outlets` untuk visit.
- Check-in harus mengirim `scheduleId` jika schedule tersedia.
- Outlet check-in harus sama dengan outlet pada schedule.
- Check-in hanya boleh untuk schedule `assigned` atau `approved`.
- Outlet harus `active`.
- Retry check-in dengan `clientRequestId` yang sama harus idempotent dan tidak membuat media/face capture duplikat.

Status visit session:

- `open`: sales sedang berada dalam sesi visit.
- `completed`: visit selesai.
- `invalid_location`: visit perlu review karena lokasi tidak valid.
- `synced`: data offline sudah tersinkron.

Outcome visit:

- `closed_order`;
- `no_order`;
- `follow_up`;
- `outlet_closed`;
- `rejected`;
- `invalid_location`.

### 5. Transaksi Outlet

Transaksi outlet dibuat oleh sales saat masih berada dalam visit yang aktif.

Flow:

1. Sales check-in outlet.
2. Sales membuat transaksi dari produk yang tersedia.
3. Backend memastikan visit masih `open` dan outlet transaksi sama dengan outlet visit.
4. Backend mencari warehouse sales milik user tersebut.
5. Saat transaksi dibuat, stok sales tidak langsung dipotong dari quantity, tetapi masuk `reservedQuantity`.
6. Status transaksi menjadi `pending_approval`.
7. Sales diarahkan upload foto nota/bukti.
8. Admin review transaksi.
9. Jika approved, stok sales benar-benar berkurang dan transaksi menjadi `closed`.
10. Jika rejected, reserved stock dikembalikan.

Aturan:

- Transaksi wajib terhubung ke `visitSessionId`.
- Transaksi outlet harus menggunakan outlet yang sama dengan visit.
- Sales biasa hanya boleh melihat transaksi miliknya sendiri.
- Admin/reviewer boleh melihat transaksi company sesuai permission.
- `GET /sales/orders` harus mendukung filter status, periode, dan sales.

Status transaksi penting:

- `pending_approval`: transaksi menunggu review admin.
- `closed`: transaksi sudah diapprove, stok sudah release/berkurang.
- `rejected`: transaksi ditolak, reserved stock dikembalikan.
- Status teknis transaksi boleh tetap memakai enum existing, tetapi tampilan Verifikasi Nota wajib disederhanakan menjadi 4 status bisnis:
  - `nota pending`: nota sudah dibuat sales dan/atau bukti foto nota sudah masuk, menunggu approval SPV/admin.
  - `nota approved`: nota sudah di-approve SPV/admin dan stok sudah direlease sesuai flow transaksi.
  - `nota settlement`: nota sudah diselesaikan admin, tercetak/terlapor, dan tidak menunggu aksi verifikasi lagi.
  - `nota rejected`: nota tidak sesuai ketentuan dan ditolak.
- Mapping teknis saat ini: `submitted|pending_approval -> pending`, `approved -> approved`, `closed|validated -> settlement`, `rejected -> rejected`.

### 6. Bukti Foto Transaksi

Bukti foto transaksi adalah dokumen keabsahan transaksi outlet.

Flow:

1. Setelah transaksi dibuat, sales upload foto nota/bukti.
2. Media dicatat sebagai owner type `transaction`.
3. Backend membuat relasi `transaction_note_photos`.
4. Admin melihat foto di halaman verifikasi nota.
5. Jika setting `requireTransactionProofPhoto` aktif, admin tidak boleh approve transaksi tanpa foto.

Aturan:

- Sales hanya boleh upload foto untuk transaksi miliknya.
- Sales hanya boleh upload foto saat transaksi masih `pending_approval`.
- Admin dengan permission `media.manage` boleh mengelola media.
- Media/foto harus tenant-aware.

### 7. Stok Sales dan Inventory

Stok sales adalah stok di warehouse tipe `sales_van` yang dimiliki user sales.

Flow stok transaksi:

1. Admin/non-sales mengelola stok dan transfer ke warehouse sales.
2. Sales membuat transaksi dari stok miliknya.
3. Saat order dibuat, quantity tidak langsung berkurang, tetapi `reservedQuantity` naik.
4. Saat admin approve, quantity berkurang dan reserved turun.
5. Saat admin reject, reserved turun tanpa mengurangi quantity.

Aturan:

- Stok sales tidak boleh berkurang diam-diam tanpa transaksi atau movement.
- Transfer/adjustment tidak boleh membuat quantity lebih kecil dari reserved stock.
- Movement stok harus tercatat pada `inventory_movements`.
- Approval transaksi harus mencatat audit log.
- Sales aktif harus memiliki warehouse tipe `sales_van` sebelum stok dikirim.
- Sumber distribusi stok ke sales bisa dipilih dari warehouse aktif yang tersedia; default yang disarankan adalah gudang utama.
- Jika sales belum memiliki warehouse, admin dapat membuatnya dari inventory transfer melalui endpoint ensure gudang sales.
- Ensure gudang sales harus tenant-aware, tidak membuat duplikat, dan hanya boleh untuk user dengan role sales.

### 8. Piutang dan Konsinyasi

Jika transaksi menggunakan payment method:

- `cash` atau `qris`: payment status awal `paid`.
- `credit`: saat approve, sistem membuat receivable/piutang.
- `consignment`: saat approve, sistem membuat consignment, consignment items, dan warehouse konsinyasi outlet bila belum ada.

Aturan:

- Piutang dan konsinyasi dibuat setelah transaksi valid/approved.
- Piutang dan konsinyasi tetap harus tenant-aware.
- Konsinyasi tidak boleh diperlakukan sebagai stok minus di outlet.
- Barang konsinyasi tetap milik company sampai dilaporkan terjual/dibayar dan disetujui admin.
- Saat transaksi konsinyasi diapprove, stok sales berkurang dan stok warehouse `outlet_consignment` milik outlet bertambah.
- Penanda outlet memiliki konsinyasi aktif adalah `consignments.status = active`, `consignment_items.remainingQuantity > 0`, dan warehouse outlet tipe `outlet_consignment`.
- Update paid/sold/withdraw dapat dilakukan oleh sales mana pun yang sedang visit ke outlet tersebut, tidak harus sales pembuat konsinyasi awal.
- Update dari sales masuk sebagai `consignment_actions.approvalStatus = pending_approval`.
- Admin wajib approve/reject action konsinyasi sebelum `paidQuantity`, `remainingQuantity`, atau stok outlet berubah final.

Flow konsinyasi:

1. Sales membuat transaksi dengan payment method `consignment` saat visit outlet aktif.
2. Admin approve transaksi.
3. Backend memindahkan stok dari warehouse sales ke warehouse konsinyasi outlet (`transfer_out` dan `transfer_in`).
4. Backend membuat `consignments` dan `consignment_items`.
5. Pada visit berikutnya, sales yang mengunjungi outlet melihat sisa konsinyasi outlet.
6. Sales submit laporan `report_sold` atau `withdraw`.
7. Admin approve/reject laporan tersebut.
8. Jika `report_sold` approved, `paidQuantity` naik, `remainingQuantity` turun, dan stok outlet konsinyasi berkurang sebagai sale.
9. Jika `withdraw` approved, `remainingQuantity` turun, stok outlet konsinyasi berkurang, dan stok masuk ke warehouse sales yang menarik barang.

### 9. Approval Admin

Approval adalah guardrail bisnis.

Area yang perlu approval atau review:

- transaksi sales;
- bukti foto transaksi;
- pengurangan stok sales;
- outlet baru atau perubahan outlet penting;
- jadwal sales jika flow company mengharuskan;
- setoran atau deposit jika modul dipakai.

Audit trail minimal:

- siapa actor-nya;
- action;
- entity type dan entity id;
- old values bila ada;
- new values;
- waktu kejadian.

### 10. Invoice

Ada dua jenis invoice yang tidak boleh dicampur:

- Invoice outlet: invoice/nota untuk transaksi penjualan sales ke outlet/customer.
- Invoice platform: invoice untuk pembelian akun, akses company, subscription, atau penggunaan platform digital.

Aturan:

- Invoice outlet mengikuti flow transaksi outlet dan bukti foto nota.
- Invoice platform dikelola oleh admin platform pada modul billing/subscription.
- Jangan membuat endpoint atau UI yang mencampur invoice outlet dan invoice platform.

### 11. Setting Company dan Platform

Setting company tidak hanya berisi toggle operasional. Area ini harus dibagi jelas agar admin memahami dampaknya:

1. Data company.
2. Aturan operasional.
3. Integrasi teknis.
4. Subscription/platform.

Data company yang penting:

- nama company dan legal name;
- email, phone, website, NPWP/tax number;
- alamat kantor;
- city, province, postal code, country;
- latitude dan longitude kantor;
- timezone;
- logo dan cover bila dipakai.

Catatan:

- Latitude/longitude company adalah titik utama company/kantor dan bisa menjadi referensi absensi kantor.
- Titik outlet tetap diatur pada master outlet masing-masing.
- Absensi outlet/visit tetap memakai radius outlet; absensi kerja umum bisa memakai titik company bila flow company mengharuskan.

Aturan operasional company yang penting:

- default radius outlet;
- max GPS accuracy;
- apakah absensi boleh lebih dari satu sesi per hari;
- apakah absensi wajib berada di titik kantor company;
- apakah bukti foto transaksi wajib;
- apakah foto wajah absensi wajib;
- apakah foto wajah visit wajib;
- apakah live detector wajah di kamera sales aktif;
- apakah face identity match aktif;
- face match threshold;
- liveness check;
- reject visit on face mismatch;
- mode dan timeout face verification.

Integrasi teknis company yang penting:

- Cloudflare R2 atau S3-compatible storage untuk foto nota, foto outlet, bukti visit, produk, dan dokumen;
- face recognition provider: `mock`, `internal_python`, `custom_http`, `aws_rekognition`, `azure_face`, atau `google_vertex`;
- payment provider bila modul pembayaran digital dipakai;
- notification provider bila reminder/alert otomatis dipakai.

Aturan integrasi:

- Integrasi eksternal jangka panjang disimpan per company pada `company_integrations`.
- Secret seperti API key, access key, dan secret access key tidak boleh tampil full di frontend.
- Jika secret yang tampil masked disimpan ulang tanpa diganti, backend harus mempertahankan secret lama.
- Jika integrasi storage company aktif, upload media memakai konfigurasi company tersebut.
- Jika integrasi storage company nonaktif atau belum ada, backend boleh fallback ke storage dari environment server.
- Jika face recognition nonaktif, sistem boleh fallback ke mode mock/policy lokal sesuai setting.

Setting platform yang penting:

- company/subscription/plan;
- feature catalog;
- billing dan invoice platform;
- limit user/outlet/visit sesuai plan.

## Mapping Backend dan Frontend

### Backend Source of Truth

- `/visits/today`: list schedule dan outlet yang boleh dikunjungi sales hari ini.
- `/visits/check-in`: validasi schedule, outlet, GPS/radius, face, dan idempotency.
- `/visits/check-out`: menutup visit dan mengubah schedule menjadi completed.
- `/sales/orders`: list transaksi dengan access control sales vs admin.
- `/sales/orders/:id/approve`: approval transaksi, release stok, create receivable/consignment bila perlu.
- `/sales/orders/:id/reject`: reject transaksi dan release reserved stock.
- `/media/upload-url` dan `/media/complete`: upload bukti transaksi dengan guard ownership.
- `/inventory/*`: manajemen warehouse, balance, transfer, movement, adjustment.
- `/settings/general`: setting operasional company.
- `/company/profile`: profil company, kode perusahaan, alamat, koordinat kantor, timezone, dan identitas bisnis. `code` perusahaan menjadi awalan generator kode karyawan dengan format `KODE_COMPANY-urutan`, contoh `YKS-001`.
- `/integrations`: konfigurasi integrasi eksternal per company, seperti storage dan face provider.
- `/platform/*`: company, subscription, plans, billing platform.

### Frontend Yang Harus Mengikuti Backend

Sales:

- Home sales membaca summary dan visit milik sales tersebut.
- Visit page mengambil outlet dari `/visits/today`, bukan `/outlets`.
- Visit check-in mengirim `scheduleId`.
- Transaksi hanya bisa dibuat setelah active visit.
- Setelah transaksi dibuat, user diarahkan upload Foto Nota.
- Foto Nota hanya upload untuk transaksi `pending_approval`.

Admin company:

- Management Outlet memakai `/outlets`.
- Jadwalkan Sales memakai outlet `active` dan user sales aktif.
- Verifikasi Nota default filter ke `pending_approval`.
- Approve transaksi berarti stok langsung release/berkurang.
- Stock page harus menampilkan quantity, reserved, available, dan movement.
- Settings page mengatur data company, radius, GPS, foto, face policy, face provider, dan cloud storage.
- Settings page mengatur provider pencarian maps per company: OpenStreetMap/Photon sebagai default open-source, Google Places API resmi jika company mengisi API key, atau Custom HTTP untuk layanan pencarian eksternal yang compliant.
- Settings page harus membedakan data company, aturan operasional, dan integrasi teknis.

Admin platform:

- Company, plan, feature, billing, dan invoice platform berada di route `/platform`.
- Admin platform bisa masuk company view dengan tenant context yang jelas.

## Role dan Permission

Role utama:

- Super Admin Platform: mengelola platform, company, paket, akses, invoice platform, dan setting global.
- Admin/Owner Company: mengelola user, sales, outlet, jadwal, produk, stok, transaksi, approval, dan laporan company.
- Supervisor: review jadwal, visit, outlet, dan transaksi sesuai permission.
- Sales: melihat jadwal, visit outlet, check-in/check-out, membuat transaksi, upload bukti, dan melihat datanya sendiri.

Permission penting:

- `visits.execute`: sales menjalankan visit.
- `visits.review`: admin/supervisor review visit dan jadwal.
- `outlets.manage`: admin mengelola outlet.
- `sales.view`: melihat transaksi sales.
- `sales.order.create`: sales membuat order.
- `sales.order.review`: admin/supervisor approve/reject order.
- `inventory.manage`: admin mengelola stok.
- `media.manage`: admin mengelola media.
- `settings.manage`: admin mengelola setting company.
- `invoice.review`: admin review nota/transaksi.

Catatan seed:

- Perubahan permission di seed hanya otomatis berlaku setelah seed/migration dijalankan.
- Database existing mungkin perlu cleanup role permission manual jika role lama sudah telanjur punya permission yang tidak sesuai, misalnya sales lama masih punya `outlets.manage`.

## Arah UI/UX

UI harus terasa seperti aplikasi operasional modern:

- rapi, padat, dan mudah discan;
- cocok untuk admin yang bekerja berulang setiap hari;
- tidak seperti landing page marketing;
- sidebar mencerminkan modul bisnis utama;
- tabel, filter, status badge, drawer/modal, dan action button jelas;
- action penting punya loading, empty, error, success state;
- halaman sales nyaman untuk mobile/PWA;
- visual boleh mengikuti referensi style dari project `sistem-mahasura`, tetapi tetap disesuaikan dengan domain sales tracking.

Menu admin company yang perlu ada:

- Dashboard;
- Management Outlet;
- Jadwalkan Sales;
- Tracking/Visit Review;
- Verifikasi Nota;
- Manajemen Stok;
- Piutang;
- Laporan;
- Sales Accounts;
- Users/Roles;
- Subscription;
- Pengaturan Operasional.

Menu sales yang perlu ada:

- Home;
- Visit;
- Transaksi;
- Foto Nota;
- Profil;
- Absensi.

## Aturan Teknis Saat Melanjutkan Project

Saat Codex bekerja di project ini:

- baca dokumen ini dulu;
- baca file terkait sebelum mengubah;
- jangan reset atau revert perubahan user yang belum commit;
- jaga perubahan tetap scoped;
- gunakan pattern yang sudah ada di repo;
- jalankan typecheck/build/lint yang relevan bila memungkinkan;
- jika pull dari git, simpan perubahan lokal lebih dulu dengan cara aman;
- jangan mencampur invoice outlet dan invoice platform;
- jangan hardcode base API URL jika sudah bisa dari env;
- jangan menghapus setting yang membuat fitur optional;
- jangan mengabaikan tenant/company boundary;
- jangan mencampur data company, setting operasional, integrasi teknis, dan setting platform dalam satu konsep backend yang kabur;
- jangan menampilkan secret integrasi secara penuh di frontend;
- saat update secret yang masked, pertahankan secret lama jika user tidak mengganti nilainya;
- setiap endpoint admin harus menghormati permission dan tenant;
- media/foto harus dilindungi agar tidak bocor lintas tenant;
- backend harus menjadi sumber validasi final, frontend hanya membantu UX.

## Checklist Audit Flow

Gunakan checklist ini sebelum menganggap fitur selesai:

- Apakah endpoint backend tenant-aware?
- Apakah permission sesuai role?
- Apakah sales hanya melihat data miliknya sendiri?
- Apakah admin/reviewer melihat data company sesuai permission?
- Apakah frontend memakai endpoint yang benar untuk role tersebut?
- Apakah status backend dan label/status frontend konsisten?
- Apakah flow stok memperhitungkan reserved stock?
- Apakah approval menulis audit log?
- Apakah bukti foto transaksi mengikuti setting company?
- Apakah data company dan koordinat company sudah dipakai sesuai konteksnya, bukan menggantikan radius outlet?
- Apakah integrasi storage/face provider tersimpan per company dan tidak bocor lintas tenant?
- Apakah secret integrasi aman saat dibaca dan saat disimpan ulang?
- Apakah error dari backend bisa dipahami user frontend?
- Apakah typecheck/build/lint sudah dijalankan?

## Prompt Ulang Yang Disarankan

Gunakan prompt berikut saat ingin melanjutkan development:

```text
Kita sedang mengerjakan project YukTrackingSales / sales-tracking.
Baca dulu docs/project-vision-and-prompt-guide.md agar visi bisnis dan keputusan sebelumnya tetap konsisten.

Fokus project:
- sales visit outlet dengan check-in/check-out;
- jadwal outlet dibuat admin/company owner, sales boleh pilih urutan tapi harus dari list jadwal;
- sales frontend harus memakai /visits/today untuk outlet visit;
- validasi radius outlet/GPS dilakukan backend;
- transaksi outlet dibuat saat visit open;
- transaksi masuk pending_approval, stok sales masuk reserved, lalu stok berkurang setelah admin approve;
- bukti foto transaksi bisa wajib/optional via setting company;
- data company, koordinat kantor, face provider, dan cloud storage diatur dari Pengaturan Operasional admin company;
- sales hanya boleh upload foto transaksi miliknya yang masih pending_approval;
- invoice outlet dipisah dari invoice platform;
- admin platform mengatur company, subscription, billing, dan akses platform.

Tolong lanjutkan pekerjaan pada area: [isi area yang ingin dikerjakan].
Sebelum edit, audit backend flow dan cek apakah frontend sudah mengikuti backend.
Jangan reset/revert perubahan lokal yang belum commit.
Setelah selesai, verifikasi dengan typecheck/build/lint yang relevan dan jelaskan ringkas.
```

## Backlog dan Risiko Yang Perlu Diingat

- Bersihkan warning lint lama secara bertahap, terutama missing dependency React hooks.
- Tambahkan test integration untuk flow visit -> transaksi -> upload foto -> approve -> stok release.
- Tambahkan migrasi/utility untuk sinkronisasi permission role existing jika seed berubah.
- Audit e2e dengan user sales asli dan admin asli, bukan hanya super admin.
- Perjelas UI untuk available stock vs reserved stock di halaman transaksi sales.
- Buat laporan lebih lengkap: achievement visit, closing rate, revenue, piutang, konsinyasi.
- Pastikan invoice platform tetap terpisah dari invoice outlet.

## Keputusan Penting Yang Tidak Boleh Hilang

- Sales boleh menentukan urutan visit sendiri, tetapi tetap dari outlet yang dijadwalkan.
- Bukti foto transaksi harus bisa diwajibkan atau dibuat optional lewat setting.
- Radius outlet adalah validasi utama check-in/check-out outlet.
- Penentuan titik outlet harus bisa lewat maps.
- Stok sales berkurang setelah transaksi valid dan admin approval.
- Saat transaksi dibuat, stok masuk reserved dulu, bukan langsung berkurang.
- Invoice outlet dan invoice platform adalah dua domain berbeda.
- Fitur yang belum wajib sekarang sebaiknya tetap dirancang agar bisa diaktifkan melalui setting.
