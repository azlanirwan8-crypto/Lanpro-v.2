const fs = require('fs');
setInterval(() => {
  console.log("Memory:", process.memoryUsage());
}, 5000);
