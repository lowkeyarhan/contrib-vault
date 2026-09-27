import { day, fresh } from "../lib.js";
import { hero, svgResponse, totals } from "../svg.js";

export const GET = async () =>
  svgResponse(hero(totals(await fresh(day(Date.now() - 372 * 86400000)))));
