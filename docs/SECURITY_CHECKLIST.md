# BNI IT Governance: Security Hardening Checklists
## Pengamanan Kode & Repositori

Ikuti langkah-langkah berikut untuk memastikan kunci rahasia tidak bocor ke repositori Git:

### 1. Verifikasi .gitignore
Pastikan file berikut terdaftar di `.gitignore` dan tidak pernah di-commit:
- [ ] `.env` (Paling Kritikal)
- [ ] `*.pem` / `*.key` (Kunci SSH/Private)
- [ ] `node_modules/`
- [ ] `dist/`
- [ ] `google-creds.json` (Kunci Akun Layanan)

### 2. Perintah Pembersihan Un-track
Jika file rahasia tidak sengaja terindeks, jalankan:
```bash
# Hapus file dari index git tanpa menghapus file fisik
git rm --cached .env
git rm --cached -r certs/

# Commit perubahan pengapusan index
git commit -m "BNI-FIX: Menghapus data sensitif dari pelacakan git"
```

### 3. Rotasi Kunci (Secret Rotation)
Setelah melakukan pengamanan repositori, Anda WAJIB mengganti (merotasi) seluruh kredensial yang pernah terpapar di Git History:
- [ ] Generate `JWT_SECRET` baru.
- [ ] Ubah password Database MySQL.
- [ ] Cabut `SSH_PRIVATE_KEY` lama dari server dan pasang yang baru.

### 4. Aktivasi GitHub Secret Scanning
- Buka repositori di GitHub.
- Masuk ke **Settings** > **Code security and analysis**.
- Pastikan **Secret scanning** diaktifkan (Push Protection).

---
**Tertanda:**  
*Principal DevSecOps Architect*
