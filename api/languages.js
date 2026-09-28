import { languages } from "../lib.js";
import { languageCard, svgResponse } from "../svg.js";

export const GET = async () => svgResponse(languageCard(await languages()));
