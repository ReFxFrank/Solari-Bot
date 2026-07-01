# Cloudflare Origin Certificate

Caddy (in `docker-compose.prod.yml`) serves the dashboard's internal HTTPS leg
with a **Cloudflare Origin Certificate** so Cloudflare can run SSL/TLS mode
**Full (strict)**. These files are secrets and are git-ignored — they live only
on the VPS.

## How to create them

1. Cloudflare dashboard → your domain → **SSL/TLS → Origin Server → Create
   Certificate**. Accept the defaults (RSA, `*.solari.gg, solari.gg`, 15 years).
2. Save the two blocks Cloudflare shows you, on the VPS, in this directory:
   - **Origin Certificate** → `origin.pem`
   - **Private Key** → `origin.key`
3. Set SSL/TLS mode to **Full (strict)** (SSL/TLS → Overview).
4. Launch with the prod overlay (see `SETUP.md` §11).

```
infra/caddy/certs/
├── origin.pem   # the certificate  (git-ignored)
└── origin.key   # the private key  (git-ignored — never commit)
```
