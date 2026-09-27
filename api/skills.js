import { skills, svgResponse } from "../svg.js";

export const GET = async () => svgResponse(skills());
