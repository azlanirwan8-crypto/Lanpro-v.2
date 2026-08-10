import cron from 'node-cron';
import dbPool from '../../src/lib/db'; 

// Konfigurasi WhatsApp (Gunakan environment variable untuk token)
const WA_API_URL = 'https://api.fonnte.com/send';
const WA_API_TOKEN = process.env.WHATSAPP_API_TOKEN || 'TOKEN_ANDA_DISINI';

export const initWhatsAppScheduler = () => {
  cron.schedule('0 7 * * *', async () => {
    // Daily task digest scheduler triggered
    await sendDailyTaskDigest();
  });
};

export async function sendDailyTaskDigest(targetUserId?: number) {
  const connection = await dbPool.getConnection();
  try {
    let query = 'SELECT id, displayName, phone FROM Users WHERE phone IS NOT NULL';
    const params: any[] = [];
    if (targetUserId) {
        query += ' AND id = ?';
        params.push(targetUserId);
    }
    const [users]: any = await connection.query(query, params);

    for (const user of users) {
      const [tasks]: any = await connection.query(`
        SELECT t.title, t.dueDate, t.status
        FROM Tasks t
        WHERE t.assigneeId = ? 
        AND t.status IN ('To Do', 'In Progress', 'Testing')
      `, [user.id]);

      if (tasks.length > 0) {
        const message = formatMessage(user.displayName, tasks);
        await sendToWhatsApp(user.phone, message);
      }
    }
  } catch (error) {
    console.error('[DEBUG] Error in daily task digest:', error);
    throw error;
  } finally {
    connection.release();
  }
}

function formatMessage(name: string, tasks: any[]) {
  let msg = `*Selamat Pagi, ${name}!* ☕\n\nBerikut ringkasan tugas Anda hari ini:\n\n`;
  tasks.forEach(t => {
    msg += `• *${t.title}*\n  Status: ${t.status} | Due: ${t.dueDate}\n\n`;
  });
  return msg;
}

async function sendToWhatsApp(phone: string, message: string) {
  // Sending WhatsApp notification
  try {
    // Fonnte API expects application/x-www-form-urlencoded
    const formData = new URLSearchParams();
    formData.append('target', phone);
    formData.append('message', message);

    const response = await fetch(WA_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': WA_API_TOKEN,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData.toString()
    });

    const responseData = await response.json();
    // WhatsApp API response received

    if (!responseData.status) {
        throw new Error(responseData.reason || 'Failed to send WhatsApp message');
    }
  } catch (err) {
    console.error(`[DEBUG] Failed to send WA to ${phone}:`, err);
    throw err;
  }
}
