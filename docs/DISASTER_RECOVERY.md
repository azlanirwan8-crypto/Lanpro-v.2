# LanPro v1.5: Disaster Recovery Runbook (Buku Panduan Pemulihan Bencana)
**Versi:** 1.0 (Enterprise Standard)  
**Terakhir Diperbarui:** 2026-05-23  
**Status:** Dokumen Rahasia Perusahaan

---

## 🚨 Skenario: Kerusakan Sistem Total (Total System Failure)
Dokumen ini digunakan ketika infrastruktur LanPro (Kontainer, Disk, atau Server) mengalami kerusakan permanen atau korupsi data yang mengakibatkan layanan terhenti.

### Tahap 1: Isolasi & Pengalihan Trafik
1. Hubungi Pusat Komunikasi Operasional.
2. Edit `nginx.conf` di server Load Balancer (atau Cloud Load Balancer):
   - Alihkan semua trafik ke halaman pemeliharaan statis.
   - Gunakan kode status HTTP 503 (Service Unavailable).
3. Matikan semua kontainer LanPro yang tersisa untuk mencegah penulisan data korup lebih lanjut:
   ```bash
   docker-compose down
   ```

### Tahap 2: Restorasi Database (MySQL)
Langkah ini mengasumsikan Server MySQL baru atau volume data telah dibersihkan.

1. **Identifikasi Backup Terakhir:**
   Cari file backup di direktori penyimpanan aman (GCS/S3/Off-site storage):
   ```bash
   ls -lh /backups/mysql/lanpro_backup_*.tar.gz
   ```
2. **Ekstrak File Backup:**
   ```bash
   tar -xzvf lanpro_backup_YYYY-MM-DD_HH-MM-SS.sql.tar.gz
   ```
3. **Injeksi Data ke Database Baru:**
   Pastikan kontainer database sudah berjalan. Jalankan perintah restorasi:
   ```bash
   docker exec -i lanpro-db mysql -u root -p$(PASSWORD_ROOT) lanpro_prod < lanpro_backup_YYYY-MM-DD_HH-MM-SS.sql
   ```
4. **Validasi Integritas Data:**
   Masuk ke database dan jalankan query audit sederhana:
   ```sql
   SELECT COUNT(*) FROM Tasks;
   SELECT version FROM Tasks LIMIT 10;
   SELECT * FROM AuditLogs ORDER BY createdAt DESC LIMIT 5;
   ```
   *Pastikan kolom 'version' (v1.3) ada dan data tidak kosong.*

### Tahap 3: Pemulihan Layanan (Rolling Restart)
1. Perbarui variabel lingkungan di file `.env` (JWT_SECRET, DB_PASS, dll).
2. Bangun ulang infrastruktur menggunakan Docker Compose:
   ```bash
   docker-compose up -d --build
   ```
3. Pantau log real-time untuk memastikan tidak ada error koneksi:
   ```bash
   docker-compose logs -f lanpro-backend
   ```

### Tahap 4: Verifikasi & Serah Terima Kembali
1. Uji endpoint `/api/health-check` secara internal.
2. Lakukan pengujian manual pada Papan Kanban (Cek fitur Optimistic Locking).
3. Jika stabil, ubah konfigurasi Nginx kembali ke upstream produksi dan pantau dashboard Grafana secara intensif selama 60 menit ke depan.

---
**Pusat Bantuan SRE:** +62-XXX-XXXX-XXXX (Telepon Darurat)
