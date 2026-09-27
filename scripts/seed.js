import { gh, sync } from "../lib.js";

const { viewer } = await gh("{ viewer { createdAt } }");
console.log("rows upserted:", await sync(viewer.createdAt));
