# Python Face Service

Service ini dipakai oleh provider `internal_python` pada pengaturan Face Verification.

## Install

```bash
cd /path/to/sales-tracking
python3 -m venv .venv-face
source .venv-face/bin/activate
pip install -r services/face-service/requirements.txt
```

Windows PowerShell:

```powershell
python -m venv .venv-face
.\.venv-face\Scripts\Activate.ps1
pip install -r services/face-service/requirements.txt
```

## Jalankan Manual

```bash
FACE_SERVICE_HOST=127.0.0.1 FACE_SERVICE_PORT=5055 FACE_SERVICE_API_KEY=secret-face-key python services/face-service/app.py
```

Atau dari root repo:

```bash
pnpm face:start
```

Health check:

```bash
curl http://127.0.0.1:5055/health
```

## Jalankan Dengan PM2

```bash
pm2 start "pnpm --filter @yuksales/api start" --name yuksales-api
pm2 start "python services/face-service/app.py" --name yuksales-face-service --cwd /path/to/sales-tracking
pm2 save
```

Jika memakai virtualenv:

```bash
pm2 start "/path/to/sales-tracking/.venv-face/bin/python services/face-service/app.py" --name yuksales-face-service --cwd /path/to/sales-tracking
```

Environment PM2 yang disarankan:

```bash
FACE_SERVICE_HOST=127.0.0.1
FACE_SERVICE_PORT=5055
FACE_SERVICE_API_KEY=secret-face-key
FACE_SERVICE_THRESHOLD=0.8
```

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
