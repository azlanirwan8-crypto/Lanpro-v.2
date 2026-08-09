import mysqlPool from "../../src/lib/db";

async function run() {
  try {
     const connection = await mysqlPool.getConnection();
     await connection.query(`
      CREATE TABLE IF NOT EXISTS Documents (
        id VARCHAR(36) PRIMARY KEY,
        projectId VARCHAR(36) NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        type VARCHAR(100),
        link VARCHAR(1024),
        fileData LONGTEXT,
        fileName VARCHAR(255),
        fileType VARCHAR(100),
        createdBy VARCHAR(36) NOT NULL,
        downloadCount INT DEFAULT 0,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (projectId) REFERENCES Projects(id) ON DELETE CASCADE,
        FOREIGN KEY (createdBy) REFERENCES Users(id) ON DELETE CASCADE
      );
     `);
     console.log("Success CREATE Documents");
     connection.release();
  } catch(e: any) {
     console.error(e);
  }
}
run().then(() => process.exit(0));
