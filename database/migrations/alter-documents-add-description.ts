import mysqlPool from "../../src/lib/db";

async function run() {
  try {
     const connection = await mysqlPool.getConnection();
     await connection.query(`
      ALTER TABLE Documents ADD COLUMN description TEXT;
     `);
     console.log("Success ALTER Documents (add description)");
     connection.release();
  } catch(e: any) {
     console.error(e);
  }
}
run().then(() => process.exit(0));
