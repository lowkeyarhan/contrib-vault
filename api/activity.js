import { day, fresh } from "../lib.js";
import { activity, svgResponse, totals } from "../svg.js";

export const GET = async () =>
  svgResponse(activity(totals(await fresh(day(Date.now() - 32 * 86400000)))));
