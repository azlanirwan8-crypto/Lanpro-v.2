import mysqlPool from "../../src/lib/db";

async function run() {
  try {
     const connection = await mysqlPool.getConnection();
     await connection.query("ALTER TABLE Tasks MODIFY COLUMN type ENUM('epic', 'task', 'subtask', 'bug', 'meeting', 'document', 'approval') NOT NULL DEFAULT 'task'");
     console.log("Success ALTER");
     connection.release();
  } catch(e: any) {
     console.error(e);
  }
}
run().then(() => process.exit(0));
