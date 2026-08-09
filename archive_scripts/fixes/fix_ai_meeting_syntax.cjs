const fs = require('fs');
let code = fs.readFileSync('src/features/meetingNotes/AiMeetingCompanion.tsx', 'utf8');

const bad = `        // No refresh callback needed if websocket is active
        // if (onRefreshTasks) {
          // onRefreshTasks();
        }
      } else {`;
const good = `        // No refresh callback needed if websocket is active
        // if (onRefreshTasks) {
        //   onRefreshTasks();
        // }
      } else {`;

code = code.replace(bad, good);
fs.writeFileSync('src/features/meetingNotes/AiMeetingCompanion.tsx', code);
console.log("Syntax fixed");
