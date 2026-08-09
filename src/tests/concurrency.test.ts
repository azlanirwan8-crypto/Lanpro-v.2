/**
 * LanPro v1.3 - QA Automation Concurrency Test
 * Role: QA Automation Lead
 * Deskripsi: Mensimulasikan Race Condition pada entitas Tasks untuk memvalidasi Optimistic Locking.
 */
import request from 'supertest';

// Catatan: Ganti URL dengan URL endpoint API yang sebenarnya atau gunakan server lokal
const API_BASE = 'http://localhost:3000'; 
const TEST_PROJECT_ID = 'test-proj-1';
const TEST_TASK_ID = 'test-task-1';
const AUTH_TOKEN = 'Bearer YOUR_JWT_TOKEN_HERE'; // Harus token valid dari dev environment

describe('Stress Test: Optimistic Locking Concurrency (LanPro v1.3)', () => {
  
  it('Harus menolak perubahan kedua jika terjadi modifikasi bersamaan pada versi yang sama', async () => {
    // 1. Persiapan: Ambil data awal untuk mendapatkan versi terbaru
    // const initialRes = await request(API_BASE).get(`/api/projects/${TEST_PROJECT_ID}/tasks/${TEST_TASK_ID}`).set('Authorization', AUTH_TOKEN);
    // const currentVersion = initialRes.body.data.version; 
    const currentVersion = 1; // Contoh simulasi

    console.log(`[QA] Memulai simulasi Race Condition pada Task ID: ${TEST_TASK_ID} (Versi Awal: ${currentVersion})`);

    // 2. Simulasi: Kirim dua request PUT secara bersamaan dengan nomor versi yang sama
    const payloadUserA = { title: "Update dari User A", version: currentVersion };
    const payloadUserB = { title: "Update dari User B", version: currentVersion };

    // Mengeksekusi request secara paralel menggunakan Promise.all
    const [responseA, responseB] = await Promise.all([
      request(API_BASE)
        .put(`/api/projects/${TEST_PROJECT_ID}/tasks/${TEST_TASK_ID}`)
        .set('Authorization', AUTH_TOKEN)
        .send(payloadUserA),
      request(API_BASE)
        .put(`/api/projects/${TEST_PROJECT_ID}/tasks/${TEST_TASK_ID}`)
        .set('Authorization', AUTH_TOKEN)
        .send(payloadUserB)
    ]);

    // 3. Assertions (Validasi)
    // Salah satu harus berhasil (200 OK)
    // Satu lainnya harus gagal (409 Conflict)
    
    const results = [responseA.status, responseB.status];
    
    expect(results).toContain(200);
    expect(results).toContain(409);

    const conflictResponse = responseA.status === 409 ? responseA : responseB;
    
    expect(conflictResponse.body.status).toBe('error');
    expect(conflictResponse.body.message).toContain('Konflik Data');
    expect(conflictResponse.body.message).toContain('telah diperbarui oleh pengguna lain');

    console.log('[QA] Hasil Test: Optimistic Locking Berhasil Menangani Race Condition.');
  });
});
