# LanPro v1.2: Master UAT & Validation Manual
**Versi Dokumen:** 1.0 (Enterprise Readiness)  
**Status:** Ready for Execution  
**Target Fitur:** Advanced Audit Trail, Socket.io Real-time, Milestone-to-Sprint Mapper.

---

## 1. Skenario UAT: Advanced Audit Trail & Diff Viewer
Tujuan: Memastikan setiap perubahan data sensitif tercatat secara akurat, immutable, dan dapat ditinjau perbedaannya melalui UI.

| ID Test | Deskripsi Aksi | Langkah Pengujian | Data Input | Hasil yang Diharapkan | Status |
|:--- |:--- |:--- |:--- |:--- |:--- |
| **AUD-01** | Create New Task | Buka Board, tambah task baru via 'Quick Add'. | Title: "UAT Task" | Log muncul di Dashboard Audit dengan badge **CREATE**, nama user tepat, dan Diff Viewer menunjukkan field baru. | [ ] Pass/Fail |
| **AUD-02** | Update Story Points | Buka detail Task, ubah Story Points dari 5 ke 8. | Story Points: 5 -> 8 | Log **UPDATE** muncul. Diff Viewer menampilkan: `storyPoints | 5 | 8` dengan warna hijau/merah. | [ ] Pass/Fail |
| **AUD-03** | Delete Document Wiki | Hapus satu dokumen di Wiki. | Klik Icon Trash | Log **DELETE** muncul. Nilai lama terekam sebagai JSON di detail log. | [ ] Pass/Fail |
| **AUD-04** | x-user-id Validation | Lakukan aksi saat Logout/Session expired. | Aksi Update | Sistem harus menolak aksi atau mencatat 'Guest' jika diizinkan, memastikan header `x-user-id` terkirim. | [ ] Pass/Fail |

---

## 2. Skenario UAT: Real-Time Collaboration (Socket.io)
Tujuan: Memastikan sinkronisasi data antar pengguna terjadi secara instan tanpa perlu refresh halaman (Zero-Latency Workspace).

**Persiapan Alat:**
- Browser 1 (Chrome): Login sebagai **Admin (User A)**.
- Browser 2 (Firefox): Login sebagai **Developer (User B)**.
- Kedua browser membuka proyek yang sama (Project ID yang sama).

| Langkah Pengujian | Instruksi Khusus | Hasil yang Diharapkan |
|:--- |:--- |:--- |
| **Sinkronisasi Kanban** | User A menggeser task "API Design" dari *In Progress* ke *Done*. | Layar User B harus melihat kartu berpindah secara otomatis dengan animasi halus tanpa refresh. |
| **Broadcast Audit Log** | User B membuka tab 'Enterprise Audit'. User A melakukan delete task di tab lain. | Baris log baru harus "melejit" (prepend) ke urutan paling atas di layar User B secara instan. |
| **Isolasi Room** | User A di Proyek Alpha, User B di Proyek Beta. User A gerakkan task. | User B **TIDAK BOLEH** menerima update atau log dari Proyek Alpha (Room Isolation valid). |

---

## 3. Skenario UAT: Milestone-to-Sprint Mapper
Tujuan: Memvalidasi keakuratan kalkulasi progres Waterfall-Agile Hybrid berbasis akumulasi Story Points.

| Langkah Pengujian | Kondisi Awal | Aksi | Hasil yang Diharapkan |
|:--- |:--- |:--- |:--- |
| **Mapping Validasi** | Milestone "MVP Release" terhubung ke "Sprint 1". | Hubungkan Sprint 2 ke Milestone yang sama via Milestone Editor. | API mengupdate tabel `MilestoneSprints` dan menghitung ulang total bobot. |
| **Kalkulasi Progres** | Sprint 1 punya 2 task (Bobot 5 & 5). | Selesaikan 1 task (Status -> Done). | Progres Milestone berubah dari 0% ke 50% di tampilan Dashboard. |
| **Real-time Re-calc** | Milestone menunjukkan 50%. | Tambahkan task baru ke Sprint terkait dengan bobot 10. | Progres Milestone turun secara otomatis menjadi 25% (karena denominator total bobot naik). |

---

## 4. Checklist Security & Performance Closure (Enterprise Grade)

### A. Database Integrity (MySQL Pool)
- [ ] **No Connection Leaks:** Pastikan blok `finally { if (connection) connection.release(); }` ada di setiap endpoint audit dan milestone.
- [ ] **Asynchronous Logging:** Validasi fungsi `createAuditLog` menggunakan `setImmediate` sehingga logging tidak menghambat waktu respon API utama pengguna.
- [ ] **JSON Validation:** Pastikan `oldValues` dan `newValues` disimpan sebagai tipe data JSON/Text di MySQL untuk mendukung query kompleks di masa depan.

### B. Security & Identity
- [ ] **Header Injection:** Validasi bahwa `x-user-id` tidak dapat dimanipulasi untuk mencatat log atas nama orang lain (Server-side session validation).
- [ ] **Sensitive Masking:** Pastikan password atau token rahasia tidak pernah masuk ke dalam `AuditLogs` (Diff Viewer harus mengaburkan field sensitif).

### C. Performance (Frontend)
- [ ] **Pagination/Limit:** Dashboard Audit membatasi fetch awal (misal: 50-100 items) untuk mencegah memori browser penuh.
- [ ] **Socket Cleanup:** Pastikan `socket.disconnect()` dipanggil saat komponen Dashboard di-unmount untuk mencegah zombie connections.

---
**Approver:** __________________________  
**Date:** __________________________
