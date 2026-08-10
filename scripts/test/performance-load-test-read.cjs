/**
 * scripts/performance-load-test-read.cjs
 * Professional HTTP Load Benchmarking Script for GET operations
 * Simulates 300 concurrent users accessing authenticated API endpoints.
 */

const http = require('http');

const CONCURRENT_USERS = 300;
const LOGIN_URL = 'http://localhost:3000/api/auth/login';
const PROJECTS_URL = 'http://localhost:3000/api/projects';

// Helper to get login token
function getAuthToken() {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({ username: 'admin', password: 'admin123' });
    const req = http.request(
      LOGIN_URL,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload)
        }
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => {
          try {
            const data = JSON.parse(body);
            // If already logged in, it returns 409 but has the activeSession token in body
            if (res.statusCode === 200 && data.token) {
              resolve(data.token);
            } else if (res.statusCode === 409 && data.activeSession && data.activeSession.token) {
              resolve(data.activeSession.token);
            } else {
              reject(new Error(`Login failed with status: ${res.statusCode}, msg: ${data.message}`));
            }
          } catch (e) {
            reject(new Error(`Failed to parse login response: ${e.message}`));
          }
        });
      }
    );
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function getRequest(index, token) {
  return new Promise((resolve) => {
    const startTime = Date.now();

    const req = http.request(
      PROJECTS_URL,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        timeout: 15000 // 15s timeout
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => {
          const latency = Date.now() - startTime;
          resolve({
            index,
            status: res.statusCode,
            latency,
            success: res.statusCode === 200
          });
        });
      }
    );

    req.on('error', (err) => {
      resolve({
        index,
        status: 500,
        latency: Date.now() - startTime,
        success: false,
        error: err.message
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        index,
        status: 408,
        latency: Date.now() - startTime,
        success: false,
        error: 'Timeout'
      });
    });

    req.end();
  });
}

async function run() {
  console.log('🔑 Authenticating to get active token...');
  let token;
  try {
    token = await getAuthToken();
    console.log('✅ Authentication successful! Token acquired.');
  } catch (err) {
    console.error('❌ Failed to authenticate:', err.message);
    process.exit(1);
  }

  console.log(`\n🚀 Starting Read Load Test: Simulating ${CONCURRENT_USERS} concurrent requests to ${PROJECTS_URL}...`);
  const globalStart = Date.now();
  
  // Launch all 300 concurrent requests in parallel
  const promises = [];
  for (let i = 0; i < CONCURRENT_USERS; i++) {
    promises.push(getRequest(i, token));
  }

  const results = await Promise.all(promises);
  const totalDuration = Date.now() - globalStart;

  // Analysis
  let successCount = 0;
  let failureCount = 0;
  let totalLatency = 0;
  let minLatency = Infinity;
  let maxLatency = -Infinity;
  const statusCodes = {};

  results.forEach((r) => {
    totalLatency += r.latency;
    if (r.latency < minLatency) minLatency = r.latency;
    if (r.latency > maxLatency) maxLatency = r.latency;

    statusCodes[r.status] = (statusCodes[r.status] || 0) + 1;
    if (r.success) {
      successCount++;
    } else {
      failureCount++;
    }
  });

  const avgLatency = (totalLatency / CONCURRENT_USERS).toFixed(2);
  const reqPerSec = ((CONCURRENT_USERS / totalDuration) * 1000).toFixed(2);

  console.log('\n==================================================');
  console.log('              READ LOAD TEST RESULTS              ');
  console.log('==================================================');
  console.log(`Concurrent Users Simulated : ${CONCURRENT_USERS}`);
  console.log(`Total Requests Sent        : ${CONCURRENT_USERS}`);
  console.log(`Successful Requests        : ${successCount}`);
  console.log(`Failed Requests            : ${failureCount}`);
  console.log(`Min Latency                : ${minLatency} ms`);
  console.log(`Max Latency                : ${maxLatency} ms`);
  console.log(`Average Latency            : ${avgLatency} ms`);
  console.log(`Total Time Taken           : ${totalDuration} ms`);
  console.log(`Throughput                 : ${reqPerSec} req/sec`);
  console.log('HTTP Status Codes Summary  :');
  console.log(JSON.stringify(statusCodes, null, 2));
  console.log('==================================================\n');

  if (failureCount > 0) {
    console.warn('⚠️ Warning: Some requests failed during concurrent stress test.');
    process.exit(1);
  } else {
    console.log('✅ PASS: Database and server successfully handled 300 concurrent project fetch queries!');
    process.exit(0);
  }
}

// Wait 2 seconds for server safety before running
setTimeout(run, 2000);
