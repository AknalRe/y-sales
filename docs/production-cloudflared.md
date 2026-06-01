# Production Deploy Dengan Cloudflared Tunnel

Dokumen ini menjelaskan pola deploy production untuk YukSales/YukTrackingSales saat frontend diakses lewat Cloudflare Tunnel.

## Penyebab 404 `File not found`

Frontend web memakai React Router `BrowserRouter`. Artinya route seperti:

- `/login`
- `/sales/attendance`
- `/sales/transactions`
- `/admin/dashboard`

adalah route milik frontend, bukan file fisik di folder `dist`.

Jika folder `apps/web/dist` diserve memakai static server biasa seperti `python -m http.server`, refresh atau direct open ke route tersebut akan dicari sebagai file/folder sungguhan. Hasilnya muncul:

```text
Error response
Error code: 404
Message: File not found.
```

Solusinya: static server harus fallback semua route frontend ke `index.html`.

## Build

```bash
pnpm install
pnpm db:migrate
pnpm --filter @yuksales/web build
pnpm --filter @yuksales/api build
```

Pastikan `VITE_API_BASE_URL` di `.env` sudah mengarah ke domain API production sebelum build web.

## Opsi 1: Nginx

Contoh konfigurasi frontend:

```nginx
server {
    listen 127.0.0.1:5173;
    server_name _;

    root /home/panel-renaldi/project/yuktrackingsales/sales-tracking2/apps/web/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /assets/ {
        try_files $uri =404;
        access_log off;
        expires 30d;
    }
}
```

Contoh konfigurasi API:

```nginx
server {
    listen 127.0.0.1:4000;
    server_name _;

    location / {
        proxy_pass http://127.0.0.1:4001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Jalankan API di port internal, misalnya `4001`, lalu Nginx expose local `4000`.

## Opsi 2: Caddy

Contoh Caddyfile frontend:

```caddyfile
:5173 {
    root * /home/panel-renaldi/project/yuktrackingsales/sales-tracking2/apps/web/dist
    try_files {path} /index.html
    file_server
}
```

Contoh Caddyfile API:

```caddyfile
:4000 {
    reverse_proxy 127.0.0.1:4001
}
```

## Cloudflared

Frontend tunnel harus mengarah ke server frontend yang sudah punya fallback SPA.

Contoh `~/.cloudflared/config.yml`:

```yaml
tunnel: yuktracking
credentials-file: /root/.cloudflared/<tunnel-id>.json

ingress:
  - hostname: s.yukdatang.my.id
    service: http://127.0.0.1:5173
  - hostname: api.yukdatang.my.id
    service: http://127.0.0.1:4000
  - service: http_status:404
```

Jangan arahkan hostname frontend langsung ke `python -m http.server` kecuali server tersebut sudah diganti dengan Nginx/Caddy atau server lain yang punya fallback ke `index.html`.

## Environment Production

Contoh `.env`:

```env
DATABASE_URL=postgres://user:password@localhost:5432/yuksales
API_PORT=4001
CORS_ORIGIN=https://s.yukdatang.my.id
VITE_API_BASE_URL=https://api.yukdatang.my.id
JWT_SECRET=change-this-secret
```

Jika frontend dan API memakai satu hostname, gunakan path proxy seperti `/api`, tetapi routing proxy-nya harus dibuat konsisten di Nginx/Caddy.

## Checklist Saat 404

1. Buka `https://s.yukdatang.my.id/` harus tampil app.
2. Buka langsung `https://s.yukdatang.my.id/login` harus tetap tampil app, bukan 404.
3. Refresh di `/sales/attendance` harus tetap tampil app.
4. Pastikan cloudflared mengarah ke Nginx/Caddy, bukan static server tanpa fallback.
5. Pastikan `apps/web/dist/index.html` ada setelah build.
