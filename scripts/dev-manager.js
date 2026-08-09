const chokidar = require('chokidar');
const axios = require('axios');
const { exec } = require('child_process');

// ==========================================
// 1. AXIOS INTERCEPTOR: EXPONENTIAL BACKOFF & CIRCUIT BREAKER
// ==========================================

const apiClient = axios.create({
  baseURL: 'https://ais-dev-rtfupl3iuxpisvz4rpxjvd-272931749989.asia-southeast1.run.app',
});

// State untuk Circuit Breaker
let circuitBreakerOpen = false;
let circuitBreakerResetTime = 0;
const CIRCUIT_BREAKER_DURATION = 5 * 60 * 1000; // 5 menit

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;
    
    // Inisialisasi state retry pada config request
    if (!config || !config.retryCount) {
      config.retryCount = 0;
    }

    // Periksa status Circuit Breaker
    if (circuitBreakerOpen) {
      if (Date.now() > circuitBreakerResetTime) {
        console.log('[CIRCUIT BREAKER] Resetting circuit breaker. Mengizinkan request kembali.');
        circuitBreakerOpen = false;
      } else {
        const remaining = Math.ceil((circuitBreakerResetTime - Date.now()) / 1000);
        return Promise.reject(new Error(`[CIRCUIT BREAKER] Terbuka. Request ditolak. Coba lagi dalam ${remaining} detik.`));
      }
    }

    // Tangani HTTP 429 Too Many Requests
    if (error.response && error.response.status === 429) {
      console.warn(`[API] Terkena Rate Limit 429 pada ${config.url}`);
      
      const maxRetries = 3;
      if (config.retryCount < maxRetries) {
        config.retryCount += 1;
        
        // Jitter & Exponential Backoff: Retry 1 (5s), Retry 2 (15s), Retry 3 (45s)
        const baseDelay = 5000; 
        const multiplier = Math.pow(3, config.retryCount - 1);
        const jitter = Math.random() * 1000; 
        const delay = (baseDelay * multiplier) + jitter;
        
        console.log(`[RETRY] Menunggu ${(delay/1000).toFixed(1)}s sebelum percobaan ke-${config.retryCount}...`);
        
        await new Promise((resolve) => setTimeout(resolve, delay));
        return apiClient(config); // Coba request lagi
      } else {
        // Jika sudah maksimal retry dan masih 429, buka Circuit Breaker
        console.error('[CIRCUIT BREAKER] Terlalu banyak 429. Mengaktifkan Circuit Breaker selama 5 menit.');
        circuitBreakerOpen = true;
        circuitBreakerResetTime = Date.now() + CIRCUIT_BREAKER_DURATION;
        return Promise.reject(new Error('Maksimal retry tercapai. Circuit breaker diaktifkan.'));
      }
    }

    return Promise.reject(error);
  }
);

// ==========================================
// 2. PRE-COMPILATION CHECK (LINTING)
// ==========================================

function runPrecheck() {
  return new Promise((resolve, reject) => {
    console.log('[PRE-CHECK] Menjalankan validasi sintaks lokal...');
    exec('npm run lint', (error, stdout, stderr) => {
      if (error) {
        console.error('[PRE-CHECK GAGAL] Ditemukan error sintaks. Restart dibatalkan untuk menghemat kuota.');
        console.error(stdout || stderr);
        return resolve(false);
      }
      console.log('[PRE-CHECK SUKSES] Kode valid. Melanjutkan proses restart.');
      resolve(true);
    });
  });
}

// ==========================================
// 3. FILE WATCHER & DEBOUNCING
// ==========================================

let restartTimeout = null;
const DEBOUNCE_DELAY = 15000; // 15 detik

async function triggerRestart() {
  const isValid = await runPrecheck();
  if (!isValid) return;

  console.log('[RESTART] Mengirim instruksi restart ke Control Plane...');
  try {
    // Simulasi pemanggilan endpoint restart internal AI Studio
    // await apiClient.post('/__aistudio_internal_control_plane/dev/op/restart');
    console.log('[RESTART SUKSES] Dev server berhasil di-restart.');
  } catch (error) {
    console.error(`[RESTART GAGAL] ${error.message}`);
  }
}

function handleFileChange(path) {
  console.log(`[WATCHER] Perubahan terdeteksi pada file: ${path}`);
  
  if (restartTimeout) {
    clearTimeout(restartTimeout);
    console.log(`[DEBOUNCE] Menunda restart. Menunggu perubahan mereda...`);
  }

  restartTimeout = setTimeout(() => {
    triggerRestart();
  }, DEBOUNCE_DELAY);
}

// Inisialisasi Watcher pada direktori src
const watcher = chokidar.watch('./src', {
  ignored: /(^|[\/\\])\../, // Abaikan file tersembunyi
  persistent: true
});

watcher
  .on('change', path => handleFileChange(path))
  .on('unlink', path => handleFileChange(path));

console.log('[WATCHER] Berjalan. Memantau direktori ./src ...');
