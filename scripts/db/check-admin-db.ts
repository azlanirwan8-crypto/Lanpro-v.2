import mysqlPool from "../src/lib/db";

async function run() {
  try {
    const connection = await mysqlPool.getConnection();
    console.log("=== FIXING PROJECT MEMBERS ROLES FOR ADMIN ===");

    // Update ProjectMembers so admin-fixed-id is 'admin' for all projects
    await connection.query(
      "UPDATE ProjectMembers SET role = 'admin' WHERE userId = 'admin-fixed-id' OR userId = 'admin'"
    );

    // Also update Users table
    await connection.query(
      "UPDATE Users SET role = 'admin' WHERE id = 'admin-fixed-id' OR username = 'admin' OR displayName LIKE '%Azlan%'"
    );

    const [pmRows]: any = await connection.query("SELECT * FROM ProjectMembers WHERE userId = 'admin-fixed-id' OR userId = 'admin'");
    console.log("=== UPDATED PROJECT MEMBERS ===");
    console.log(pmRows);

    const [uRows]: any = await connection.query("SELECT id, username, displayName, role FROM Users WHERE username = 'admin'");
    console.log("=== UPDATED USER STATE ===");
    console.log(uRows);

    connection.release();
  } catch (e: any) {
    console.error("Error updating admin role:", e);
  }
}

run().then(() => process.exit(0));
