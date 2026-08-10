const fs = require('fs');

let content = fs.readFileSync('server.ts', 'utf8');

const startMarker = "  const createAutomatedNotification = async (recipientId: string";
const endMarker = "  // Schedule background check for task due dates every 5 minutes";

const startIndex = content.indexOf(startMarker);
if (startIndex !== -1) {
  const endIndex = content.indexOf(endMarker, startIndex);
  if (endIndex !== -1) {
    const newCode = `  const createAutomatedNotification = async (recipientId: string, senderId: string | null, title: string, message: string, type: string, relatedId: string | null) => {
    const { createAutomatedNotification: _createAutomatedNotification } = await import('./server/services/notification.service.js');
    return _createAutomatedNotification(io, recipientId, senderId, title, message, type, relatedId);
  };

  const broadcastProjectNotification = async (projectId: string, senderId: string | null, title: string, message: string, type: string, relatedId: string | null) => {
    const { broadcastProjectNotification: _broadcastProjectNotification } = await import('./server/services/notification.service.js');
    return _broadcastProjectNotification(io, projectId, senderId, title, message, type, relatedId);
  };

  const sendProjectActivityNotification = async (projectId: string, triggerUserId: string, actionType: 'create_task' | 'update_task' | 'comment_task', payload: any) => {
    const { sendProjectActivityNotification: _sendProjectActivityNotification } = await import('./server/services/notification.service.js');
    return _sendProjectActivityNotification(io, projectId, triggerUserId, actionType, payload);
  };

  const checkUpcomingDueDates = async () => {
    const { checkUpcomingDueDates: _checkUpcomingDueDates } = await import('./server/services/notification.service.js');
    return _checkUpcomingDueDates(io);
  };

`;

    content = content.substring(0, startIndex) + newCode + content.substring(endIndex);
    fs.writeFileSync('server.ts', content);
    console.log("Replaced successfully!");
  } else {
    console.log("Could not find end marker");
  }
} else {
  console.log("Could not find start marker");
}
