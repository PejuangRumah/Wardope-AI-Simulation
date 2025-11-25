# Panduan Deployment Netlify untuk Wardope AI

## Masalah yang Diperbaiki

Build Netlify gagal karena menggunakan `$env/static/public` dan `$env/static/private` dari SvelteKit, yang tidak tersedia saat SSR build di Netlify.

### Solusi yang Diterapkan

1. **Client-side code** (`src/lib/supabase.ts`): Menggunakan `import.meta.env`
2. **Server-side code** (`src/hooks.server.ts`, `src/lib/services/openai.ts`, API routes): Menggunakan `process.env`

## Cara Deploy ke Netlify

### 1. Setup Environment Variables di Netlify

Masuk ke dashboard Netlify Anda, lalu:

1. Pilih site Anda
2. Pergi ke **Site settings** → **Environment variables**
3. Tambahkan variabel berikut:

| Variable Name | Value | Keterangan |
|--------------|-------|------------|
| `PUBLIC_SUPABASE_URL` | `https://your-project.supabase.co` | URL Supabase project Anda |
| `PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGc...` | Anon/Public key dari Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGc...` | Service role key (PRIVATE!) |
| `OPENAI_API_KEY` | `sk-proj-...` | API key dari OpenAI |

> **⚠️ PENTING**: 
> - `SUPABASE_SERVICE_ROLE_KEY` adalah **private key** yang sangat sensitif
> - Jangan pernah commit key ini ke git atau expose ke client
> - Hanya gunakan di server-side code

### 2. Cara Mendapatkan Keys

#### Supabase Keys
1. Buka [Supabase Dashboard](https://supabase.com/dashboard)
2. Pilih project Anda
3. Pergi ke **Settings** → **API**
4. Copy:
   - **Project URL** → `PUBLIC_SUPABASE_URL`
   - **anon/public key** → `PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY`

#### OpenAI API Key
1. Buka [OpenAI Platform](https://platform.openai.com/api-keys)
2. Login dengan akun Anda
3. Klik **Create new secret key**
4. Copy key tersebut → `OPENAI_API_KEY`

### 3. Deploy

Setelah environment variables di-setup:

1. **Push ke Git**:
   ```bash
   git add .
   git commit -m "Fix Netlify build environment variables"
   git push
   ```

2. **Netlify akan otomatis build** dengan konfigurasi dari `netlify.toml`:
   - Build command: `npm run build`
   - Publish directory: `build`

3. **Monitor build** di Netlify dashboard → **Deploys**

### 4. Troubleshooting

#### Build masih gagal?

1. **Cek environment variables**: Pastikan semua 4 variabel sudah di-set di Netlify
2. **Cek build logs**: Lihat error message di Netlify deploy logs
3. **Test local build**:
   ```bash
   npm run build
   ```
   Jika local build berhasil tapi Netlify gagal, kemungkinan masalah di environment variables

#### Runtime errors setelah deploy?

1. **Cek browser console**: Lihat error messages
2. **Cek Netlify Functions logs**: Pergi ke **Functions** tab di Netlify dashboard
3. **Verify environment variables**: Pastikan values-nya benar (tidak ada typo, tidak ada trailing spaces)

## Perubahan yang Dilakukan

### File yang Diubah

1. **`src/lib/supabase.ts`**
   - ❌ Sebelum: `import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public'`
   - ✅ Sesudah: `import.meta.env.PUBLIC_SUPABASE_URL`

2. **`src/hooks.server.ts`**
   - ❌ Sebelum: `import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public'`
   - ✅ Sesudah: `process.env.PUBLIC_SUPABASE_URL`

3. **`src/lib/services/openai.ts`**
   - ❌ Sebelum: `import { OPENAI_API_KEY } from '$env/static/private'`
   - ✅ Sesudah: `process.env.OPENAI_API_KEY`

4. **`src/routes/api/auth/register/+server.ts`**
   - ❌ Sebelum: `import { env as publicEnv } from '$env/dynamic/public'`
   - ✅ Sesudah: `process.env.PUBLIC_SUPABASE_URL`

### File Baru

- **`netlify.toml`**: Konfigurasi build untuk Netlify

## Kenapa Ini Diperlukan?

SvelteKit's `$env/static/*` dan `$env/dynamic/*` di-generate saat build time, tapi Netlify's SSR build process tidak bisa mengakses modules ini dengan benar. 

Menggunakan `process.env` (server-side) dan `import.meta.env` (client-side) adalah cara yang lebih universal dan kompatibel dengan berbagai platform deployment termasuk Netlify, Vercel, dan lainnya.

## Keamanan

✅ **Aman**: Environment variables di Netlify di-encrypt dan hanya tersedia saat build & runtime
✅ **Best Practice**: Private keys (`SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`) hanya digunakan di server-side
✅ **Public keys**: `PUBLIC_*` prefix menandakan keys yang aman untuk di-expose ke client

---

**Selamat deploy! 🚀**
