# Python Face Service

Service ini dipakai oleh provider `internal_python` pada pengaturan Face Verification.

## Install

Linux/server:

```bash
cd /path/to/sales-tracking
pnpm face:setup:linux
```

Windows PowerShell:

```powershell
pnpm face:setup:windows
```

Script setup akan membuat `.venv-face`, menginstall dependency Python, dan menyalin `services/face-service/config.example.json` ke `services/face-service/config.json` bila belum ada.

`config.json` tidak ikut commit. Edit nilai ini di server:

```json
{
  "host": "127.0.0.1",
  "port": 5055,
  "apiKey": "change-this-face-service-key",
  "maxImageBytes": 4194304,
  "threshold": 0.8
}
```

## Jalankan Manual

```bash
.venv-face/bin/python services/face-service/app.py
```

Windows:

```powershell
.\.venv-face\Scripts\python.exe services\face-service\app.py
```

Atau dari root repo jika ingin memakai Python global:

```bash
pnpm face:start
```

Health check:

```bash
curl http://127.0.0.1:5055/health
```

## Jalankan Dengan PM2

File `ecosystem.config.cjs` sudah disiapkan untuk API dan face service.

Jalankan face service saja:

```bash
pm2 start ecosystem.config.cjs --only yuksales-face-service
pm2 save
```

Jalankan API saja:

```bash
pm2 start ecosystem.config.cjs --only yuksales-api
pm2 save
```

Atau jalankan keduanya:

```bash
pm2 start ecosystem.config.cjs
pm2 save
```

PM2 memakai Python dari `.venv-face`, jadi setup harus dijalankan lebih dulu.

## Setting Di Admin

Pengaturan Operasional → Face Verification:

- Aktifkan provider face recognition: ON
- Provider: `Internal Python service`
- Base URL: `http://127.0.0.1:5055/verify`
- API key: samakan dengan `FACE_SERVICE_API_KEY`
- Mode: `detect_and_verify`
- Threshold: mulai dari `0.8`

## Kontrak Response

Backend YukSales mengirim:

```json
{
  "referenceImageUrl": "data:image/jpeg;base64,...",
  "capturedImageUrl": "data:image/jpeg;base64,...",
  "threshold": 0.8,
  "requireLiveness": false
}
```

Service mengembalikan:

```json
{
  "matched": true,
  "confidence": 0.86,
  "livenessStatus": "not_checked",
  "reason": "MATCHED_BY_FACE_CROP_PHASH"
}
```

## Catatan Akurasi

Implementasi awal ini memakai OpenCV Haar Cascade untuk menemukan wajah dan perceptual hash untuk similarity. Ini cukup untuk MVP lokal dan menguji flow end-to-end, tetapi belum setara InsightFace/ArcFace.

Untuk production yang lebih kuat, endpoint `/verify` bisa diganti engine embedding InsightFace tanpa mengubah Node.js API, selama response tetap `matched`, `confidence`, `livenessStatus`, dan `reason`.
