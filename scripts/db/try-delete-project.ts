import pool from '../src/lib/db';

async function runExperiment() {
  const connection = await pool.getConnection();
  try {
    console.log("Starting experiment...");
    await connection.beginTransaction();

    // 1. Create a temporary project
    const projectId = "test-temp-project-id";
    await connection.query(
      "INSERT INTO Projects (id, name, projectKey, ownerId) VALUES (?, ?, ?, ?)",
      [projectId, "Temp Test Project", "TTP", "admin-fixed-id"]
    );
    console.log("Created temp project");

    // 2. Assign a user (member)
    await connection.query(
      "INSERT INTO ProjectMembers (projectId, userId, role) VALUES (?, ?, ?)",
      [projectId, "admin-fixed-id", "Admin"]
    );
    console.log("Assigned member to temp project");

    // 3. Create a Sprint
    const sprintId = "test-temp-sprint-id";
    await connection.query(
      "INSERT INTO Sprints (id, projectId, name) VALUES (?, ?, ?)",
      [sprintId, projectId, "Sprint 1"]
    );
    console.log("Created temp sprint");

    // 4. Create a Task
    const taskId = "test-temp-task-id";
    await connection.query(
      "INSERT INTO Tasks (id, projectId, sprintId, taskKey, title, status, type) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [taskId, projectId, sprintId, "TTP-1", "Test Task 1", "To Do", "task"]
    );
    console.log("Created temp task");

    // 5. Try deleting the project!
    console.log("Trying to delete project...");
    await connection.query(
      "DELETE FROM Projects WHERE id = ?",
      [projectId]
    );
    console.log("✅ DELETION SUCCESSFUL! Database did not complain!");

    await connection.rollback();
  } catch (error: any) {
    console.error("❌ DELETION FAILED! Error:", error);
    try {
      await connection.rollback();
    } catch (_) {}
  } finally {
    connection.release();
    process.exit();
  }
}

runExperiment();
