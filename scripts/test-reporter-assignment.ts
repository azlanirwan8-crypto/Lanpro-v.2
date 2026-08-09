import http from 'http';
import jwt from 'jsonwebtoken';

// Integration test for Automatic Reporter Assignment and Context Preservation
async function runReporterTest() {
  console.log("=================================================");
  console.log("🧪 STARTING INTEGRATION TEST: Task Reporter Assignment");
  console.log("=================================================");

  const baseUrl = "http://localhost:3000";
  const jwtSecret = process.env.JWT_SECRET || 'fallback-secret';
  const testToken = jwt.sign(
    { id: 'admin-fixed-id', uid: 'admin-fixed-id', role: 'admin' },
    jwtSecret,
    { expiresIn: '1h' }
  );

  // Helper for HTTP requests
  function makeRequest(path: string, method: string = "GET", body?: any, headers: Record<string, string> = {}): Promise<any> {
    return new Promise((resolve, reject) => {
      const url = new URL(path, baseUrl);
      const postData = body ? JSON.stringify(body) : null;

      const reqHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${testToken}`,
        'x-user-id': 'admin-fixed-id', // Simulate authenticated active user context
        ...headers
      };

      if (postData) {
        reqHeaders['Content-Length'] = Buffer.byteLength(postData).toString();
      }

      const req = http.request(url, {
        method,
        headers: reqHeaders
      }, (res) => {
        let responseData = '';
        res.on('data', chunk => responseData += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(responseData));
          } catch (e) {
            resolve({ raw: responseData, statusCode: res.statusCode });
          }
        });
      });

      req.on('error', reject);
      if (postData) req.write(postData);
      req.end();
    });
  }

  try {
    // 0. Fetch active users
    console.log("0. Fetching active system users...");
    const usersRes = await makeRequest("/api/users");
    let activeUserId = "admin-fixed-id";
    if (usersRes && usersRes.status === "success" && Array.isArray(usersRes.data) && usersRes.data.length > 0) {
      const activeUser = usersRes.data[0];
      activeUserId = activeUser.uid || activeUser.id || "admin-fixed-id";
      console.log(`✅ Active Authenticated User: ${activeUser.displayName || activeUser.username} (${activeUserId})`);
    }

    const authenticatedToken = jwt.sign(
      { id: activeUserId, uid: activeUserId, role: 'admin' },
      jwtSecret,
      { expiresIn: '1h' }
    );

    const authHeaders = {
      'Authorization': `Bearer ${authenticatedToken}`,
      'x-user-id': activeUserId
    };

    // 1. Get default project
    console.log("\n1. Fetching active projects...");
    let projectsRes = await makeRequest("/api/projects", "GET", null, authHeaders);
    let projectId = "";

    if (projectsRes && projectsRes.status === "success" && Array.isArray(projectsRes.data) && projectsRes.data.length > 0) {
      const testProject = projectsRes.data[0];
      projectId = testProject.id;
      console.log(`✅ Selected Existing Project: ${testProject.title || testProject.name} (ID: ${projectId})`);
    } else {
      console.log("Creating temporary test project...");
      const createProjRes = await makeRequest("/api/projects", "POST", {
        name: "Test Reporter Project",
        title: "Test Reporter Project",
        projectKey: "TRP",
        description: "Project for automated reporter assignment test"
      }, authHeaders);
      if (createProjRes && createProjRes.status === "success" && createProjRes.data) {
        projectId = createProjRes.data.id;
        console.log(`✅ Created Test Project (ID: ${projectId})`);
      } else {
        console.error("❌ Failed to create or fetch project:", createProjRes);
        process.exit(1);
      }
    }

    // 2. Create Task WITHOUT passing reporterId (Testing Backend Automatic Reporter Assignment)
    console.log("\n2. Testing POST /api/projects/:projectId/tasks WITHOUT reporterId parameter...");
    const newTaskPayload = {
      title: "Automated Integration Test Task - " + Date.now(),
      description: "Testing backend automatic reporterId extraction and assignment",
      status: "To Do",
      priority: "High",
      type: "task"
    };

    const createRes = await makeRequest(`/api/projects/${projectId}/tasks`, "POST", newTaskPayload, authHeaders);
    console.log("Create Task Response:", JSON.stringify(createRes, null, 2));

    if (!createRes || createRes.status !== "success" || !createRes.data) {
      console.error("❌ Failed: Task creation API returned error", createRes);
      process.exit(1);
    }

    const createdTask = createRes.data;
    if (!createdTask.reporterId || createdTask.reporterId === "Unknown" || createdTask.reporterId === "guest") {
      console.error("❌ Test Failed: reporterId was NOT populated automatically!", createdTask);
      process.exit(1);
    }

    console.log(`✅ TEST PASSED: reporterId was automatically set to '${createdTask.reporterId}'`);
    if (createdTask.reporter) {
      console.log(`✅ TEST PASSED: reporter object populated with name: '${createdTask.reporter.name || createdTask.reporter.displayName}'`);
    } else {
      console.warn("⚠️ Warning: reporter object was empty, but reporterId was set.");
    }

    // 3. Verify GET /api/projects/:projectId/tasks returns reporter object for UI mapping
    console.log("\n3. Testing GET /api/projects/:projectId/tasks response structure...");
    const getTasksRes = await makeRequest(`/api/projects/${projectId}/tasks`, "GET", null, authHeaders);
    if (!getTasksRes || getTasksRes.status !== "success" || !Array.isArray(getTasksRes.data)) {
      console.error("❌ Failed: GET tasks returned invalid response");
      process.exit(1);
    }

    const foundTask = getTasksRes.data.find((t: any) => t.id === createdTask.id);
    if (!foundTask) {
      console.error(`❌ Failed: Created task ${createdTask.id} was not found in GET tasks response`);
      process.exit(1);
    }

    console.log("Fetched Task from API:", {
      id: foundTask.id,
      taskKey: foundTask.taskKey,
      title: foundTask.title,
      reporterId: foundTask.reporterId,
      reporter: foundTask.reporter
    });

    if (!foundTask.reporterId) {
      console.error("❌ Test Failed: GET tasks returned null reporterId");
      process.exit(1);
    }

    if (!foundTask.reporter || !foundTask.reporter.displayName) {
      console.error("❌ Test Failed: GET tasks reporter object missing or invalid");
      process.exit(1);
    }

    console.log(`✅ TEST PASSED: GET /tasks correctly includes reporter object: ${foundTask.reporter.displayName} (${foundTask.reporter.email})`);

    // 4. Test Bulk Delete API
    console.log("\n4. Testing POST /api/projects/:projectId/tasks/bulk-delete...");
    const bulkDeleteRes = await makeRequest(`/api/projects/${projectId}/tasks/bulk-delete`, "POST", {
      taskIds: [createdTask.id]
    }, authHeaders);

    if (!bulkDeleteRes || bulkDeleteRes.status !== "success" || !Array.isArray(bulkDeleteRes.deletedIds)) {
      console.error("❌ Test Failed: Bulk delete endpoint failed", bulkDeleteRes);
      process.exit(1);
    }

    console.log(`✅ TEST PASSED: Bulk delete successfully deleted task ${createdTask.id}`);

    console.log("\n=================================================");
    console.log("🎉 ALL INTEGRATION TESTS PASSED SUCCESSFULLY!");
    console.log("=================================================");
    process.exit(0);

  } catch (err) {
    console.error("❌ Test Error:", err);
    process.exit(1);
  }
}

runReporterTest();
