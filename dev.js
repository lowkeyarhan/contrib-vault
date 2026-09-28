import http from "node:http";
import { GET as activity } from "./api/activity.js";
import { GET as graph } from "./api/graph.js";
import { GET as hero } from "./api/hero.js";
import { GET as skills } from "./api/skills.js";
import { GET as social } from "./api/social.js";
import { GET as story } from "./api/story.js";
import { GET as streak } from "./api/streak.js";
import { GET as sync } from "./api/sync.js";

const routes = {
  "/api/hero": hero,
  "/api/story": story,
  "/api/skills": skills,
  "/api/social": social,
  "/api/graph": graph,
  "/api/streak": streak,
  "/api/activity": activity,
  "/api/sync": sync,
};

http
  .createServer(async (req, res) => {
    const url = new URL(req.url, "http://localhost:3000");
    const handler = routes[url.pathname];
    if (!handler) return res.writeHead(404).end("Not found");
    try {
      const r = await handler(new Request(url, { headers: req.headers }));
      res
        .writeHead(r.status, Object.fromEntries(r.headers))
        .end(await r.text());
    } catch (e) {
      console.error(e);
      res.writeHead(500).end(e.message);
    }
  })
  .listen(3000, () => console.log("http://localhost:3000/api/graph"));
