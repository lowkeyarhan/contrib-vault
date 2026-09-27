import { day, fresh } from "../lib.js";
import { graph, svgResponse } from "../svg.js";

export const GET = async () =>
  svgResponse(graph(await fresh(day(Date.now() - 372 * 86400000))));
