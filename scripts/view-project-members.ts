import pool from '../src/lib/db';

async function printMembers() {
  try {
    const connection = await pool.getConnection();
    const [rows]: any = await connection.query("SELECT * FROM ProjectMembers");
    console.log("ProjectMembers in database:");
    for (const r of rows) {
      console.log(`- ProjectID: ${r.projectId}, UserID: ${r.userId}, Role: ${r.role}`);
    }
    connection.release();
  } catch (error: any) {
    console.error("Error:", error);
  } finally {
    process.exit();
  }
}

printMembers();
