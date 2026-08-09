/**
 * scripts/performance-load-test.cjs
 * Professional HTTP Load Benchmarking Script
 * Simulates 300 concurrent users accessing the API endpoints.
 */

const http = require('http');

const CONCURRENT_USERS = 300;
const TARGET_URL = 'http://localhost:3000/api/auth/login';

console.log(`🚀 Starting Load Test: Simulating ${CONCURRENT_USERS} concurrent requests to ${TARGET_URL}...`);

function postRequest(index) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const payload = JSON.stringify({ username: 'admin', password: 'admin123' });

    const req = http.request(
      TARGET_URL,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload)
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
            success: res.statusCode === 200 || res.statusCode === 409 // 409 is also success (already logged in on other device)
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

    req.write(payload);
    req.end();
  });
}

async function run() {
  const globalStart = Date.now();
  
  // Launch all 300 concurrent requests in parallel
  const promises = [];
  for (let i = 0; i < CONCURRENT_USERS; i++) {
    promises.push(postRequest(i));
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
  console.log('                 LOAD TEST RESULTS                ');
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
    console.log('✅ PASS: Database and server successfully handled 300 concurrent operations!');
    process.exit(0);
  }
}

// Wait 2 seconds for server safety before running
setTimeout(run, 2000);
