// @ts-ignore
import { app, initializationPromise } from "../dist/server.cjs";

export default async function handler(req: any, res: any) {
  console.log(`[VERCEL] Incoming request: ${req.method} ${req.url}`);
  try {
    await initializationPromise;
    console.log("[VERCEL] Initialization complete");
  } catch (err) {
    console.error("[VERCEL] Initialization failed:", err);
  }
  return app(req, res);
}
