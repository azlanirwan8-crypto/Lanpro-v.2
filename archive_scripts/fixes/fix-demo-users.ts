import mysqlPool from "../../src/lib/db";

async function run() {
  try {
     const connection = await mysqlPool.getConnection();
     const users = [
       { id: "1", username: "dini", name: "Dini Oktavia (SRE)", role: "user" },
       { id: "2", username: "hendra", name: "Hendra (QA)", role: "user" },
       { id: "3", username: "rian", name: "Rian (PM)", role: "admin" },
       { id: "4", username: "budi", name: "Budi (Backend)", role: "user" },
       { id: "5", username: "siti", name: "Siti (Frontend)", role: "user" }
     ];
     
     for (const u of users) {
       await connection.query(
         "INSERT IGNORE INTO Users (id, uid, username, displayName, role) VALUES (?, ?, ?, ?, ?)",
         [u.id, u.id, u.username, u.name, u.role]
       );
     }
     console.log("Dummy users inserted!");
     connection.release();
  } catch(e: any) {
     console.error(e);
  }
}
run().then(() => process.exit(0));
