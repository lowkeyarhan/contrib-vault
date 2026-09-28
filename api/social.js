import { social } from "../svg.js";

export const GET = async (req) => {
  const svg = social(new URL(req.url).searchParams.get("p"));
  if (!svg) return new Response("Not found", { status: 404 });
  return new Response(svg, {
    headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=86400" },
  });
};
