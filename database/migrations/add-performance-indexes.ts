import mysqlPool from "../../src/lib/db";

async function run() {
  let connection;
  try {
     connection = await mysqlPool.getConnection();
     
     console.log("Starting Solution Architecture optimization queries...");

     // 1. Add Index for Hierarchical self-join query parentId on Tasks table
     try {
       await connection.query(`
         ALTER TABLE Tasks ADD INDEX idx_tasks_parentId (parentId);
       `);
       console.log("✅ Created index idx_tasks_parentId successfully.");
     } catch (e: any) {
       if (e.code === 'ER_DUP_KEYNAME') {
         console.log("ℹ️ Index idx_tasks_parentId already exists.");
       } else {
         console.warn("⚠️ Warning creating idx_tasks_parentId:", e.message);
       }
     }

     // 2. Add Composite Index for Project & Status on Tasks (Kanban / Board query optimization)
     try {
       await connection.query(`
         ALTER TABLE Tasks ADD INDEX idx_tasks_project_status (projectId, status);
       `);
       console.log("✅ Created composite index idx_tasks_project_status successfully.");
     } catch (e: any) {
       if (e.code === 'ER_DUP_KEYNAME') {
         console.log("ℹ️ Index idx_tasks_project_status already exists.");
       } else {
         console.warn("⚠️ Warning creating idx_tasks_project_status:", e.message);
       }
     }

     // 3. Add Composite Index for Project & Sprint on Tasks (Sprint planning query optimization)
     try {
       await connection.query(`
         ALTER TABLE Tasks ADD INDEX idx_tasks_project_sprint (projectId, sprintId);
       `);
       console.log("✅ Created composite index idx_tasks_project_sprint successfully.");
     } catch (e: any) {
       if (e.code === 'ER_DUP_KEYNAME') {
         console.log("ℹ️ Index idx_tasks_project_sprint already exists.");
       } else {
         console.warn("⚠️ Warning creating idx_tasks_project_sprint:", e.message);
       }
     }

     // 4. Add Composite Index for Project & Type on Tasks (Epic vs Task queries)
     try {
       await connection.query(`
         ALTER TABLE Tasks ADD INDEX idx_tasks_project_type (projectId, type);
       `);
       console.log("✅ Created composite index idx_tasks_project_type successfully.");
     } catch (e: any) {
       if (e.code === 'ER_DUP_KEYNAME') {
         console.log("ℹ️ Index idx_tasks_project_type already exists.");
       } else {
         console.warn("⚠️ Warning creating idx_tasks_project_type:", e.message);
       }
     }

     console.log("🎉 Solutions Architecture database optimization completed successfully!");

  } catch (e: any) {
     console.error("❌ Fatal error during optimization script:", e);
  } finally {
     if (connection) {
       connection.release();
     }
  }
}

run().then(() => process.exit(0));
