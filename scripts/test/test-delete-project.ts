import pool from '../src/lib/db';

async function testDelete() {
  try {
    const connection = await pool.getConnection();
    const [projects]: any = await connection.query("SELECT id, name, ownerId FROM Projects");
    console.log("Projects in database:");
    for (const p of projects) {
      console.log(`- ID: ${p.id}, Name: ${p.name}, OwnerId: ${p.ownerId}`);
      
      // Let's count some related items
      const [[{ count: memberCount }]]: any = await connection.query("SELECT COUNT(*) as count FROM ProjectMembers WHERE projectId = ?", [p.id]);
      const [[{ count: taskCount }]]: any = await connection.query("SELECT COUNT(*) as count FROM Tasks WHERE projectId = ?", [p.id]);
      
      console.log(`  Members: ${memberCount}, Tasks: ${taskCount}`);
    }

    connection.release();
  } catch (error: any) {
    console.error("Test error:", error);
  } finally {
    process.exit();
  }
}

testDelete();
