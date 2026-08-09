import mysqlPool from "../../src/lib/db";

async function run() {
  try {
     const connection = await mysqlPool.getConnection();
     await connection.query(`
      ALTER TABLE Tasks 
      ADD COLUMN estimatedHours DECIMAL(10,2) DEFAULT NULL,
      ADD COLUMN loggedHours DECIMAL(10,2) DEFAULT NULL,
      ADD COLUMN progress INT DEFAULT NULL;
     `);
     console.log("Success ALTER Tasks");
     connection.release();
  } catch(e: any) {
     console.error(e);
  }
}
run().then(() => process.exit(0));
