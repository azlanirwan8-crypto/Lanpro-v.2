import mysqlPool from "../src/lib/db";

async function run() {
  try {
     const connection = await mysqlPool.getConnection();
     const [rows] = await connection.query(`SHOW COLUMNS FROM Tasks`);
     console.log(rows);
     connection.release();
  } catch(e: any) {
     console.error(e);
  }
}
run().then(() => process.exit(0));
