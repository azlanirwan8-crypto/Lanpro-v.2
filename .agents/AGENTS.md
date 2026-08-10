# Aturan Eksekusi Agen AI (Lanpro-v.2)

Setiap kali Anda (Agen AI) ditugaskan untuk menambah, memodifikasi, atau menghapus kode pada proyek ini, **ANDA WAJIB MEMATUHI STRUKTUR CLEAN ARCHITECTURE** yang telah ditetapkan.

## Aturan Struktur Direktori

### 1. FRONTEND (`/src`)
Dilarang keras meletakkan komponen UI, state, atau hooks di file utama (seperti `App.tsx` atau `AppContainer.tsx`). File utama harus dijaga seminimal mungkin (maksimal 300 baris).
- **`src/features/`**: Setiap domain fitur baru (misal: `chat`, `payment`) WAJIB dibuatkan folder tersendiri di sini. Semua komponen spesifik untuk fitur tersebut harus masuk ke dalam foldernya. Dilarang mencampur fitur. Jika file melebihi 1000 baris, terapkan pola *Container Pattern* dan pecah file.
- **`src/components/`**: HANYA untuk komponen UI primitif (tombol, input, modal dasar) yang *stateless* dan dapat digunakan ulang di seluruh aplikasi.
- **`src/hooks/`**: Semua *custom React hooks* (state, context, event listener) harus diletakkan di sini. Dilarang menjejalkan ratusan state di dalam komponen JSX.
- **`src/lib/`**: Konfigurasi API, Firebase, dan Database. TIDAK BOLEH MENGANDUNG KREDENSIAL *HARDCODED*. Semuanya harus menggunakan `process.env`.

### 2. BACKEND (`/server`)
Dilarang keras menambahkan rute API berserta logikanya langsung ke dalam `server.ts`. File `server.ts` murni hanya untuk titik masuk (*entry point*) dan *middleware* tingkat atas.
- **`server/routes/`**: WAJIB digunakan HANYA untuk mendaftarkan URL endpoint. Dilarang memasukkan logika bisnis (seperti pengecekan *if-else* database) di sini.
- **`server/controllers/`**: Semua logika bisnis dan eksekusi (seperti `async (req, res)`) WAJIB diletakkan di sini.
- **`server/middleware/`**: Penanganan *Error* Global, pengecekan Token (JWT), dan Hak Akses (RBAC) wajib diletakkan di sini.

### 3. LARANGAN KERAS
- **Jangan pernah melakukan bypass pada Global Error Handler.**
- **Jangan pernah menyisipkan Token Rahasia, Password, atau URL Database langsung ke dalam kode (.ts, .tsx).**
- **Jangan membangun komponen raksasa (God Components).** Jika file melewati 800 baris, Anda harus memecahnya.

Setiap pekerjaan Anda yang melanggar struktur ini akan ditolak secara otomatis.
