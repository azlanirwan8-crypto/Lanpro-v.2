import mysqlPool from '../../src/lib/db';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

export async function runMigrations() {
  // --- AUTO MIGRATION: DATABASE SCHEMAS ---
  if (!process.env.VERCEL) {
    try {
      
      const checkConn = await mysqlPool.getConnection();
      try {
    const addCol = async (table, col, type) => {
      try {
        const [rows] = await checkConn.query(`SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`, [table, col]);
        if (!rows || rows.length === 0) {
          await checkConn.query(`ALTER TABLE ${table} ADD COLUMN ${col} ${type}`);
          console.log(`[MIGRATION] Kolom ${col} ditambahkan ke ${table}.`);
        } else {
          console.log(`[MIGRATION] Kolom ${col} sudah ada di ${table}.`);
        }
      } catch (e) {
        if (e.code === 'ER_DUP_FIELDNAME') {
           console.log(`[MIGRATION] Kolom ${col} sudah ada di ${table}.`);
        } else {
           console.warn(`[MIGRATION] Warning ${table}.${col}:`, e);
        }
      }
    };

      await addCol("Projects", "dashboard_layout", "JSON");
      await addCol("ProjectMembers", "parentAdminId", "VARCHAR(36)");
      await addCol("Tasks", "version", "INT NOT NULL DEFAULT 1");
      await addCol("Users", "phone", "VARCHAR(50)");
      await addCol("Users", "lastSeen", "VARCHAR(50)");
      await addCol("Tasks", "orderIndex", "INT NOT NULL DEFAULT 0");
      await addCol("Tasks", "isBlocked", "TINYINT(1) DEFAULT 0");
      await addCol("Tasks", "dueDate", "VARCHAR(50)");
      await addCol("MasterData", "role_type", "VARCHAR(20)");

      try {
        await checkConn.query(`CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON Tasks (assigneeId);`);
        console.log("[MIGRATION] Index idx_tasks_assignee_id pada tabel Tasks berhasil dipastikan ada.");
      } catch (e: any) {
        if (!e.message?.includes("Duplicate key name") && !e.message?.includes("already exists")) {
          console.warn("[MIGRATION] Warning idx_tasks_assignee_id:", e);
        }
      }

      try {
        await checkConn.query(`CREATE INDEX IF NOT EXISTS idx_tasks_assignee_reporter ON Tasks (assigneeId, reporterId);`);
        console.log("[MIGRATION] Composite Index idx_tasks_assignee_reporter pada tabel Tasks berhasil dipastikan ada.");
      } catch (e: any) {
        if (!e.message?.includes("Duplicate key name") && !e.message?.includes("already exists")) {
          console.warn("[MIGRATION] Warning idx_tasks_assignee_reporter:", e);
        }
      }

      // 2. Messages Table
      try {
        await checkConn.query(`
          CREATE TABLE IF NOT EXISTS Messages (
            id VARCHAR(36) PRIMARY KEY,
            senderId VARCHAR(36) NOT NULL,
            receiverId VARCHAR(36) NOT NULL,
            message TEXT NOT NULL,
            timestamp VARCHAR(50) NOT NULL,
            \`read\` TINYINT(1) DEFAULT 0
          );
        `);
        console.log("[MIGRATION] Tabel Messages berhasil dipastikan ada.");
      } catch (msgErr) {
        console.warn("[MIGRATION] Gagal membuat tabel Messages:", msgErr);
      }

      // 2a. meeting_details Table
      try {
        await checkConn.query(`
          CREATE TABLE IF NOT EXISTS meeting_details (
            id VARCHAR(36) PRIMARY KEY,
            meeting_id VARCHAR(36) NOT NULL,
            ringkasan_eksekutif TEXT,
            topik_utama VARCHAR(255),
            kronologi_dan_kesimpulan JSON,
            kesimpulan JSON,
            saran_dan_ide JSON,
            tindak_lanjut JSON,
            next_plan JSON,
            target_to_be_architecture JSON,
            metadata_rapat JSON,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `);
        console.log("[MIGRATION] Tabel meeting_details berhasil dipastikan ada.");
      } catch (mdErr) {
        console.warn("[MIGRATION] Gagal membuat tabel meeting_details:", mdErr);
      }

      // 2b. QATestCases Table
      try {
        await checkConn.query(`
          CREATE TABLE IF NOT EXISTS QATestCases (
            id VARCHAR(36) PRIMARY KEY,
            projectId VARCHAR(36) NOT NULL,
            judul VARCHAR(255) NOT NULL,
            deskripsi TEXT,
            tipeTesting VARCHAR(50) NOT NULL,
            prioritas VARCHAR(50) NOT NULL,
            caseId VARCHAR(36),
            expected TEXT,
            status VARCHAR(50) NOT NULL,
            steps JSON NOT NULL,
            history JSON NOT NULL,
            createdAt VARCHAR(50) NOT NULL,
            activeTesterId VARCHAR(36),
            activeTesterName VARCHAR(255),
            lockedAt VARCHAR(50)
          );
        `);
        console.log("[MIGRATION] Tabel QATestCases berhasil dipastikan ada.");
      } catch (qaErr) {
        console.warn("[MIGRATION] Gagal membuat tabel QATestCases:", qaErr);
      }

      // 2b-2. QATestCaseExecutionLogs Table (Non-Destructive History Tracking & Audit Trail)
      try {
        await checkConn.query(`
          CREATE TABLE IF NOT EXISTS QATestCaseExecutionLogs (
            id VARCHAR(36) PRIMARY KEY,
            testCaseId VARCHAR(36) NOT NULL,
            projectId VARCHAR(36) NOT NULL,
            runVersion INT NOT NULL DEFAULT 1,
            runLabel VARCHAR(50) NOT NULL,
            executionStatus VARCHAR(50) NOT NULL,
            linkedIssueKey VARCHAR(50),
            executedByUserId VARCHAR(36),
            executedByName VARCHAR(255),
            timestamp VARCHAR(50) NOT NULL,
            notes TEXT,
            evidences JSON
          );
        `);
        console.log("[MIGRATION] Tabel QATestCaseExecutionLogs berhasil dipastikan ada.");
      } catch (execErr) {
        console.warn("[MIGRATION] Gagal membuat tabel QATestCaseExecutionLogs:", execErr);
      }

      // 2c. ProjectModules Table (Master Data Modul / Aplikasi)
      try {
        await checkConn.query(`
          CREATE TABLE IF NOT EXISTS ProjectModules (
            id VARCHAR(36) PRIMARY KEY,
            projectId VARCHAR(36) NOT NULL,
            namaModul VARCHAR(255) NOT NULL,
            keterangan TEXT,
            createdAt VARCHAR(50) NOT NULL
          );
        `);
        console.log("[MIGRATION] Tabel ProjectModules berhasil dipastikan ada.");
      } catch (modErr) {
        console.warn("[MIGRATION] Gagal membuat tabel ProjectModules:", modErr);
      }

      // 2f. QATestSuites Table
      try {
        await checkConn.query(`
          CREATE TABLE IF NOT EXISTS QATestSuites (
            id VARCHAR(36) PRIMARY KEY,
            projectId VARCHAR(36) NOT NULL,
            name VARCHAR(255) NOT NULL,
            phase VARCHAR(50) NOT NULL,
            uploadedBy VARCHAR(255) NOT NULL,
            uploadedAt VARCHAR(50) NOT NULL,
            fileName VARCHAR(255)
          );
        `);
        console.log("[MIGRATION] Tabel QATestSuites berhasil dipastikan ada.");
      } catch (qasErr) {
        console.warn("[MIGRATION] Gagal membuat tabel QATestSuites:", qasErr);
      }

      // 2h. ai_learning_logs Table
      try {
        await checkConn.query(`
          CREATE TABLE IF NOT EXISTS ai_learning_logs (
            id VARCHAR(36) PRIMARY KEY,
            project_id VARCHAR(36) NOT NULL,
            evaluation_notes TEXT NOT NULL,
            timestamp VARCHAR(50) NOT NULL
          );
        `);
        console.log("[MIGRATION] Tabel ai_learning_logs berhasil dipastikan ada.");
      } catch (learningErr) {
        console.warn("[MIGRATION] Gagal membuat tabel ai_learning_logs:", learningErr);
      }

      // 2i. MasterData Table
      try {
        await checkConn.query(`
          CREATE TABLE IF NOT EXISTS MasterData (
            id VARCHAR(36) PRIMARY KEY,
            type VARCHAR(50) NOT NULL,
            label VARCHAR(255) NOT NULL,
            color VARCHAR(50),
            icon VARCHAR(50),
            \`order\` INT DEFAULT 0,
            description TEXT,
            fieldType VARCHAR(50),
            dropdownOptions JSON,
            role_type VARCHAR(20),
            createdAt VARCHAR(50)
          );
        `);
        // Ensure role_type column exists if table was already created
        try {
          await checkConn.query(`ALTER TABLE MasterData ADD COLUMN role_type VARCHAR(20);`);
        } catch (e) {
          // column might already exist
        }
        // Cleanup dummy/junk data such as items named 'dd'
        try {
          await checkConn.query("DELETE FROM MasterData WHERE LOWER(TRIM(label)) = 'dd' OR TRIM(label) = '' OR label IS NULL;");
          console.log("[CLEANUP] Berhasil membersihkan data master sampah ('dd').");
        } catch (cleanupErr) {
          console.warn("[CLEANUP] Gagal membersihkan data master sampah:", cleanupErr);
        }
        console.log("[MIGRATION] Tabel MasterData berhasil dipastikan ada.");
      } catch (masterErr) {
        console.warn("[MIGRATION] Gagal membuat tabel MasterData:", masterErr);
      }

      // 2g. Add detailed columns to QATestCases & DiscussionPoints
      const qaCols = [
        { name: "suiteId", type: "VARCHAR(50)" },
        { name: "rowNum", type: "INT" },
        { name: "comment", type: "TEXT" },
        { name: "evidenceUrl", type: "VARCHAR(512)" },
        { name: "evidenceType", type: "VARCHAR(50)" },
        { name: "evidenceName", type: "VARCHAR(255)" },
        { name: "linkedBugKey", type: "VARCHAR(50)" },
        { name: "commentsList", type: "JSON" },
        { name: "evidences", type: "JSON" }
      ];
      for (const col of qaCols) {
        await addCol("QATestCases", col.name, col.type);
      }

      await addCol("DiscussionPoints", "parentPointId", "VARCHAR(255)");
      await addCol("DiscussionPoints", "parent_point_id", "VARCHAR(255)");
      await addCol("DiscussionPoints", "parentpointid", "VARCHAR(255)");
      await addCol("DiscussionPoints", "targetDate", "VARCHAR(50)");
      await addCol("DiscussionPoints", "tanggalUpdateStatus", "VARCHAR(50)");
      await addCol("DiscussionPoints", "assignTo", "VARCHAR(50)");
      await addCol("DiscussionPoints", "concern", "TEXT");
      await addCol("DiscussionPoints", "status", "VARCHAR(50) DEFAULT 'pending'");

      try {
        await checkConn.query(`
          CREATE TABLE IF NOT EXISTS discussion_point_comments (
            id VARCHAR(36) PRIMARY KEY,
            pointId VARCHAR(36) NOT NULL,
            point_id VARCHAR(36),
            userId VARCHAR(50),
            user_id VARCHAR(50),
            userName VARCHAR(255),
            user_name VARCHAR(255),
            commentText TEXT NOT NULL,
            comment_text TEXT,
            createdAt VARCHAR(50) NOT NULL,
            created_at VARCHAR(50)
          );
        `);
      } catch (dpcErr) {
        console.warn("[MIGRATION] discussion_point_comments creation note:", dpcErr);
      }

      await addCol("QATestCases", "modulId", "VARCHAR(36)");
      await addCol("Meetings", "transcript", "LONGTEXT");
      await addCol("Meetings", "aiSummary", "JSON");
      await addCol("Meetings", "recording_url", "VARCHAR(512)");
      await addCol("Meetings", "file_size", "BIGINT");
      await addCol("Meetings", "upload_status", "VARCHAR(50)");
      await addCol("Meetings", "analysis_result", "LONGTEXT");
      await addCol("Meetings", "fileData", "LONGTEXT");
      await addCol("Meetings", "fileName", "VARCHAR(255)");
      await addCol("Meetings", "fileType", "VARCHAR(100)");

      // 3. Database Integrity Healing
      // 3. Database Integrity Healing: Resolve mismatch between Firebase UIDs and internal database IDs
      try {
        console.log("[MIGRATION] Menjalankan penyelarasan integritas ownerId & userId...");
        const [usersList]: any = await checkConn.query("SELECT id, uid FROM Users");
        if (usersList && usersList.length > 0) {
          for (const user of usersList) {
            const { id: internalId, uid: firebaseUid } = user;
            if (internalId && firebaseUid && internalId !== firebaseUid) {
              // Jika ownerId di Projects menggunakan firebaseUid, ganti ke internalId
              const [upRes1]: any = await checkConn.query(
                "UPDATE Projects SET ownerId = ? WHERE ownerId = ?",
                [internalId, firebaseUid]
              );
              if (upRes1.affectedRows > 0) {
                console.log(`[MIGRATION] Penyelarasan: Mengupdate ownerId ${firebaseUid} ke ${internalId} di Projects.`);
              }

              // Jika userId di ProjectMembers menggunakan firebaseUid, ganti ke internalId
              const [membersToFix]: any = await checkConn.query(
                "SELECT projectId, role FROM ProjectMembers WHERE userId = ?",
                [firebaseUid]
              );
              for (const member of membersToFix) {
                const { projectId, role } = member;
                const [dupMember]: any = await checkConn.query(
                  "SELECT * FROM ProjectMembers WHERE projectId = ? AND userId = ?",
                  [projectId, internalId]
                );
                if (dupMember.length === 0) {
                  await checkConn.query(
                    "UPDATE ProjectMembers SET userId = ? WHERE projectId = ? AND userId = ?",
                    [internalId, projectId, firebaseUid]
                  );
                } else {
                  await checkConn.query(
                    "DELETE FROM ProjectMembers WHERE projectId = ? AND userId = ?",
                    [projectId, firebaseUid]
                  );
                }
              }
            }
          }
        }
        console.log("[MIGRATION] Penyelarasan integritas selesai.");

        // --- SECURE ONE-TIME MIGRATION FOR ADMIN/PLACEHOLDER CREDENTIALS ---
        console.log("[MIGRATION] Memvalidasi keamanan password hash akun admin...");
        const [adminRows]: any = await checkConn.query("SELECT id, passwordHash FROM Users WHERE username = 'admin'");
        if (adminRows && adminRows.length > 0) {
          const adminUser = adminRows[0];
          if (!adminUser.passwordHash || adminUser.passwordHash === 'firebase-auth-placeholder' || !adminUser.passwordHash.startsWith('pbkdf2$')) {
            const secureHash = hashPassword('admin123');
            await checkConn.query("UPDATE Users SET passwordHash = ? WHERE username = 'admin'", [secureHash]);
            console.log("[MIGRATION] Berhasil mengupdate password hash admin ke PBKDF2 yang aman.");
          }
        } else {
          // If admin doesn't exist, seed it with pbkdf2 hash of admin123
          const secureHash = hashPassword('admin123');
          await checkConn.query(
            `INSERT INTO Users (id, uid, username, nama_lengkap, email, displayName, role, status, passwordHash) 
             VALUES ('admin-fixed-id', 'admin-fixed-id', 'admin', 'Admin Manager', 'admin@example.com', 'Admin Manager', 'admin', 'approved', ?)`,
            [secureHash]
          );
          console.log("[MIGRATION] Berhasil men-seed akun admin dengan PBKDF2 yang aman.");
        }

        // --- AUTOMATIC MIGRATION: REPAIR & ASSIGN MISSING REPORTER_ID IN TASKS ---
        try {
          console.log("[MIGRATION] Memeriksa & Memperbaiki data reporterId pada tabel Tasks...");
          await addCol("Tasks", "reporterId", "VARCHAR(36)");

          const [invalidReporterTasks]: any = await checkConn.query(
            "SELECT id, projectId, title FROM Tasks WHERE reporterId IS NULL OR reporterId = '' OR reporterId = 'Unknown' OR reporterId = 'guest'"
          );

          if (invalidReporterTasks && invalidReporterTasks.length > 0) {
            console.log(`[MIGRATION] Ditemukan ${invalidReporterTasks.length} task dengan reporterId bernilai NULL/Unknown/guest. Memulai perbaikan...`);
            
            const [firstUserRows]: any = await checkConn.query("SELECT id, uid FROM Users ORDER BY createdAt ASC LIMIT 1");
            const defaultFallbackUserId = (firstUserRows && firstUserRows.length > 0) ? (firstUserRows[0].id || firstUserRows[0].uid) : "admin-fixed-id";

            for (const taskItem of invalidReporterTasks) {
              let resolvedReporter: string | null = null;

              // 1. Fallback: Cari pembuat task di AuditLogs / ActivityLogs
              const [auditRows]: any = await checkConn.query(
                "SELECT userId FROM AuditLogs WHERE entityId = ? AND actionType = 'CREATE' LIMIT 1",
                [taskItem.id]
              );
              if (auditRows && auditRows.length > 0 && auditRows[0].userId) {
                resolvedReporter = auditRows[0].userId;
              }

              if (!resolvedReporter) {
                const [activityRows]: any = await checkConn.query(
                  "SELECT userId FROM ActivityLogs WHERE taskId = ? LIMIT 1",
                  [taskItem.id]
                );
                if (activityRows && activityRows.length > 0 && activityRows[0].userId) {
                  resolvedReporter = activityRows[0].userId;
                }
              }

              // 2. Fallback: Cari owner dari Project
              if (!resolvedReporter && taskItem.projectId) {
                const [projRows]: any = await checkConn.query(
                  "SELECT ownerId FROM Projects WHERE id = ?",
                  [taskItem.projectId]
                );
                if (projRows && projRows.length > 0 && projRows[0].ownerId) {
                  resolvedReporter = projRows[0].ownerId;
                }
              }

              // 3. Fallback: Gunakan default user utama
              if (!resolvedReporter) {
                resolvedReporter = defaultFallbackUserId;
              }

              await checkConn.query(
                "UPDATE Tasks SET reporterId = ? WHERE id = ?",
                [resolvedReporter, taskItem.id]
              );
            }
            console.log(`[MIGRATION] Berhasil memperbarui ${invalidReporterTasks.length} record task dengan reporterId yang valid.`);
          } else {
            console.log("[MIGRATION] Seluruh record Tasks telah memiliki reporterId yang valid.");
          }
        } catch (repMigErr) {
          console.warn("[MIGRATION] Warning saat perbaikan reporterId task:", repMigErr);
        }
      } catch (healingErr) {
        console.warn("[MIGRATION] Warning saat melakukan penyelarasan integritas database:", healingErr);
      }
    } finally {
      checkConn.release();
    }
  } catch (err) {
    console.warn("[MIGRATION] Gagal mendapatkan koneksi ke database saat auto-migration:", err);
  }
  }

}

// Run directly if called from CLI
if (require.main === module) {
  runMigrations().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
}
