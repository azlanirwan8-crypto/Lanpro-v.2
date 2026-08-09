import mysqlPool from "../../src/lib/db";

async function run() {
  let connection;
  try {
    connection = await mysqlPool.getConnection();
    console.log("Connected to database. Modifying Users table...");

    // 1. Alter status column to VARCHAR(50) to support 'pending', 'active', etc.
    try {
      await connection.query("ALTER TABLE Users MODIFY COLUMN status VARCHAR(50) DEFAULT 'pending'");
      console.log("1. Modified Users.status to VARCHAR(50).");
    } catch (e: any) {
      console.error("Error modifying status column:", e.message);
    }

    // 2. Add nama_lengkap VARCHAR(255) if it doesn't exist
    try {
      // Check if nama_lengkap already exists
      const [columns]: any = await connection.query("SHOW COLUMNS FROM Users LIKE 'nama_lengkap'");
      if (columns.length === 0) {
        await connection.query("ALTER TABLE Users ADD COLUMN nama_lengkap VARCHAR(255) AFTER username");
        console.log("2. Added column nama_lengkap to Users table.");
      } else {
        console.log("2. Column nama_lengkap already exists in Users table.");
      }
    } catch (e: any) {
      console.error("Error adding nama_lengkap column:", e.message);
    }

    // 3. Ensure email has a unique constraint if not already
    try {
      await connection.query("ALTER TABLE Users ADD UNIQUE INDEX idx_users_email_unique (email)");
      console.log("3. Added UNIQUE constraint on Users.email.");
    } catch (e: any) {
      if (e.message.includes("Duplicate key name") || e.message.includes("already exists")) {
        console.log("3. UNIQUE constraint on email already exists or is configured.");
      } else {
        console.error("Error adding unique index to email:", e.message);
      }
    }

    // 4. Ensure username has a unique constraint
    try {
      await connection.query("ALTER TABLE Users ADD UNIQUE INDEX idx_users_username_unique (username)");
      console.log("4. Added UNIQUE constraint on Users.username.");
    } catch (e: any) {
      if (e.message.includes("Duplicate key name") || e.message.includes("already exists")) {
        console.log("4. UNIQUE constraint on username already exists or is configured.");
      } else {
        console.error("Error adding unique index to username:", e.message);
      }
    }

    console.log("Database table alteration finished successfully.");
  } catch (error: any) {
    console.error("Error running database alterations:", error);
  } finally {
    if (connection) connection.release();
  }
}

run().then(() => process.exit(0));
