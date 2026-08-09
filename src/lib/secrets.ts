// import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

/**
 * LanPro v1.5 - Enterprise Secrets Manager Client
 * Role: Principal DevSecOps Architect
 * Deskripsi: Mengambil kunci rahasia secara aman dari Cloud Provider (GCP) saat startup.
 */

const fallbackSecrets: Record<string, string> = {
  JWT_SECRET: '1231231231492340234wewefsfsdfsfwe534534tf5654654',
  DATABASE_URL: 'postgresql://neondb_owner:npg_GkyS5zMv7XmC@ep-dawn-shape-aulnhaw2.pooler.region.postgres.neon.tech/neondb?sslmode=require',
  GEMINI_API_KEY: 'AIzaSyCLtjweG46C63xPMb4aL41ovCzAoGpvGRg'
};

let client: any = null;

export async function getSecret(name: string): Promise<string> {
  // 1. Mencoba mengambil dari Environment Variable (Lokal/Dev/Vercel)
  if (process.env[name]) {
    return process.env[name] as string;
  }

  // 2. Jika di Vercel atau non-GCP, gunakan fallback otomatis agar siap pakai tanpa setting
  if (process.env.VERCEL || process.env.NODE_ENV !== 'production') {
    if (fallbackSecrets[name]) {
      return fallbackSecrets[name];
    }
  }

  const projectId = process.env.GOOGLE_CLOUD_PROJECT || 'lanpro-bni-project';
  try {
    if (!client) {
      const { SecretManagerServiceClient } = await import('@google-cloud/secret-manager');
      client = new SecretManagerServiceClient();
    }
    const [version] = await client.accessSecretVersion({
      name: `projects/${projectId}/secrets/${name}/versions/latest`,
    }, {
      timeout: 1500, // 1.5 seconds timeout to prevent hanging on startup in dev environments
    });

    const payload = version.payload?.data?.toString();
    if (!payload) {
      throw new Error(`Rahasia ${name} kosong atau tidak ditemukan.`);
    }

    console.log(`[SECURITY] Kunci rahasia '${name}' berhasil diambil dari Secret Manager.`);
    return payload;
  } catch (err) {
    console.warn(`[SECURITY] Gagal mengambil kunci '${name}' dari Vault, menggunakan fallback bawaan.`);
    if (fallbackSecrets[name]) return fallbackSecrets[name];
    throw err;
  }
}
