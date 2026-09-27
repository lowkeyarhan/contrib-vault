import { story, svgResponse } from "../svg.js";

export const GET = async () => svgResponse(story());
