import { fresh } from "../lib.js";
import { streak, svgResponse, totals } from "../svg.js";

export const GET = async () =>
  svgResponse(streak(totals(await fresh("2000-01-01"))));
