sed -i -e 's/const uploadsDir = process.env.VERCEL ? path.join("\/tmp", "uploads") : path.join(process.cwd(), "uploads");/const uploadsDir = GLOBAL_UPLOADS_DIR;/g' server.ts
sed -i -e 's/const chunksDir = process.env.VERCEL ? path.join("\/tmp", "uploads", "chunks", targetMeetingId) : path.join(process.cwd(), "uploads", "chunks", targetMeetingId);/const chunksDir = path.join(GLOBAL_UPLOADS_DIR, "chunks", targetMeetingId);/g' server.ts
sed -i -e 's/const uploadsDirPermanent = process.env.VERCEL ? path.join("\/tmp", "uploads") : path.join(process.cwd(), "uploads");//g' server.ts
sed -i -e 's/const permanentPath = path.join(uploadsDirPermanent, safeFileName);/const permanentPath = path.join(GLOBAL_UPLOADS_DIR, safeFileName);/g' server.ts
sed -i -e 's/const uploadsDirTarget = process.env.VERCEL ? path.join("\/tmp", "uploads") : path.join(process.cwd(), "uploads");//g' server.ts
sed -i -e 's/const filePath = path.join(uploadsDirTarget, safeFileName);/const filePath = path.join(GLOBAL_UPLOADS_DIR, safeFileName);/g' server.ts
sed -i -e 's/const uploadsDirExt = process.env.VERCEL ? path.join("\/tmp", "uploads") : path.join(process.cwd(), "uploads");//g' server.ts
sed -i -e 's/const extractedPath = path.join(uploadsDirExt, `extracted_${meetingId}_${Date.now()}.mp3`);/const extractedPath = path.join(GLOBAL_UPLOADS_DIR, `extracted_${meetingId}_${Date.now()}.mp3`);/g' server.ts
