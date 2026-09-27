import { sync } from "../lib.js";

export async function GET(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`)
    return new Response("Unauthorized", { status: 401 });
  return Response.json({ rows: await sync(Date.now() - 7 * 86400000) });
}
