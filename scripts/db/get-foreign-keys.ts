import pool from '../src/lib/db';

async function getForeignKeys() {
  try {
    const connection = await pool.getConnection();
    const [dbRes]: any = await connection.query("SELECT DATABASE() as db");
    const activeDb = dbRes[0].db;
    console.log("Active Database:", activeDb);

    const [tables]: any = await connection.query("SHOW TABLES");
    console.log("Tables:");
    for (const t of tables) {
      console.log(`- ${Object.values(t)[0]}`);
    }

    const [rows]: any = await connection.query(`
      SELECT 
        TABLE_NAME, 
        COLUMN_NAME, 
        CONSTRAINT_NAME, 
        REFERENCED_TABLE_NAME, 
        REFERENCED_COLUMN_NAME 
      FROM 
        INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
      WHERE 
        REFERENCED_TABLE_SCHEMA = ?
    `, [activeDb]);
    
    console.log("\nForeign Keys:");
    for (const r of rows) {
      console.log(`- ${r.TABLE_NAME}.${r.COLUMN_NAME} -> ${r.REFERENCED_TABLE_NAME}.${r.REFERENCED_COLUMN_NAME} (Constraint: ${r.CONSTRAINT_NAME})`);
    }

    // Also get foreign key delete rules
    const [rules]: any = await connection.query(`
      SELECT 
        CONSTRAINT_NAME,
        UPDATE_RULE,
        DELETE_RULE,
        TABLE_NAME
      FROM 
        INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS
      WHERE 
        CONSTRAINT_SCHEMA = ?
    `, [activeDb]);

    console.log("\nReferential constraints delete/update rules:");
    for (const r of rules) {
      console.log(`- ${r.TABLE_NAME} (Constraint: ${r.CONSTRAINT_NAME}): DELETE=${r.DELETE_RULE}, UPDATE=${r.UPDATE_RULE}`);
    }

    connection.release();
  } catch (error: any) {
    console.error("Error:", error.message);
  } finally {
    process.exit();
  }
}

getForeignKeys();
