import { readFileSync, writeFileSync } from "node:fs";
import { SLOTS } from "../svg.js";

const url = (process.env.PUBLIC_URL || "http://localhost:3000").replace(
  /\/$/,
  "",
);
const total = SLOTS.reduce((a, s) => a + s.w, 0);
let md = readFileSync(
  new URL("../PROFILE.template.md", import.meta.url),
  "utf8",
).replaceAll("{{URL}}", url);
for (const s of SLOTS)
  md = md.replaceAll(`{{w:${s.p}}}`, `${((s.w / total) * 100).toFixed(3)}%`);
writeFileSync(new URL("../PROFILE.md", import.meta.url), md);
console.log(`PROFILE.md written for ${url}`);
