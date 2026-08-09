import pool from '../src/lib/db';

async function runExperiment() {
  const connection = await pool.getConnection();
  try {
    console.log("Starting advanced experiment with meetings and discussion points...");
    await connection.beginTransaction();

    const projectId = "test-adv-project-id";
    await connection.query(
      "INSERT INTO Projects (id, name, projectKey, ownerId) VALUES (?, ?, ?, ?)",
      [projectId, "Advanced Test Project", "ATP", "admin-fixed-id"]
    );
    console.log("Created ATP project");

    // Create Meeting
    const meetingId = "test-adv-meeting-id";
    await connection.query(
      "INSERT INTO Meetings (id, projectId, title, authorId) VALUES (?, ?, ?, ?)",
      [meetingId, projectId, "Initial Meeting", "admin-fixed-id"]
    );
    console.log("Created Meeting");

    // Create Parent Discussion Point
    const parentDpId = "test-adv-dp-parent";
    await connection.query(
      "INSERT INTO DiscussionPoints (id, meetingId, authorId, concern) VALUES (?, ?, ?, ?)",
      [parentDpId, meetingId, "admin-fixed-id", "Parent Concern"]
    );
    console.log("Created Parent Discussion Point");

    // Create Child Discussion Point referencing parentPointId
    const childDpId = "test-adv-dp-child";
    await connection.query(
      "INSERT INTO DiscussionPoints (id, meetingId, parentPointId, authorId, concern) VALUES (?, ?, ?, ?, ?)",
      [childDpId, meetingId, parentDpId, "admin-fixed-id", "Child Concern"]
    );
    console.log("Created Child Discussion Point referencing parent");

    // Also create some tasks and link them
    const taskId1 = "test-adv-task-1";
    await connection.query(
      "INSERT INTO Tasks (id, projectId, taskKey, title, status, type) VALUES (?, ?, ?, ?, ?, ?)",
      [taskId1, projectId, "ATP-1", "Task 1", "To Do", "task"]
    );
    const taskId2 = "test-adv-task-2";
    await connection.query(
      "INSERT INTO Tasks (id, projectId, taskKey, title, status, type) VALUES (?, ?, ?, ?, ?, ?)",
      [taskId2, projectId, "ATP-2", "Task 2", "To Do", "task"]
    );
    console.log("Created two ATP tasks");

    // Create Task Link
    const linkId = "test-adv-link-1";
    await connection.query(
      "INSERT INTO LinkedTasks (id, sourceTaskId, targetTaskId, relationType) VALUES (?, ?, ?, ?)",
      [linkId, taskId1, taskId2, "blocks"]
    );
    console.log("Created LinkedTask connecting both tasks");

    // Now try deleting the project and see what happens!
    console.log("Attempting to delete Project...");
    await connection.query(
      "DELETE FROM Projects WHERE id = ?",
      [projectId]
    );
    console.log("✅ ADVANCED DELETION SUCCESSFUL! MySQL cascade succeeded without any constraint violations!");

    await connection.rollback();
  } catch (error: any) {
    console.error("❌ ADVANCED DELETION FAILED! Error:", error);
    try {
      await connection.rollback();
    } catch (_) {}
  } finally {
    connection.release();
    process.exit();
  }
}

runExperiment();
