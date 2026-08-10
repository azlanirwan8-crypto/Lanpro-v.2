import pool from '../src/lib/db';

async function testConnection() {
  console.log("Mencoba menghubungkan ke database PostgreSQL (Neon)...");
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query("SELECT VERSION() as version");
    console.log("✅ Berhasil terhubung ke database!");
    console.log("Versi PostgreSQL Server:", (rows as any)[0].version);
    connection.release();
  } catch (error: any) {
    console.error("❌ Gagal terhubung!");
    console.error(error.message);
  } finally {
    process.exit();
  }
}

testConnection();
