import mysqlPool from '../../src/lib/db';

async function updateSchema() {
  const connection = await mysqlPool.getConnection();
  try {
    await connection.query('ALTER TABLE Projects ADD COLUMN dashboardLayout JSON;');
    console.log('Added dashboardLayout to Projects.');
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log('Column already exists.');
    } else {
      console.error(err);
    }
  } finally {
    connection.release();
    process.exit(0);
  }
}

updateSchema();
