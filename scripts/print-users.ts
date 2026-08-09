import pool from '../src/lib/db';

async function printUsers() {
  try {
    const connection = await pool.getConnection();
    const [users]: any = await connection.query("SELECT id, uid, username, email, displayName, role FROM Users");
    console.log("Users in database:");
    for (const u of users) {
      console.log(`- ID: ${u.id}, UID: ${u.uid}, Username: ${u.username}, Email: ${u.email}, Name: ${u.displayName}, Role: ${u.role}`);
    }
    connection.release();
  } catch (error: any) {
    console.error("Error:", error);
  } finally {
    process.exit();
  }
}

printUsers();
