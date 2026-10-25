// The real askAI: sends a prompt to Gemini and returns the parsed plan JSON.
// Same pattern as the gym app (api/report.js). Needs GEMINI_API_KEY in .env (never commit .env).
import "dotenv/config";
import { GoogleGenAI } from "@google/genai";
import { planSchema } from "./generatePlan.js";

let client;

export async function geminiAskAI(prompt) {
  if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not set (locally: put it in .env; on Vercel: add it under Settings > Environment Variables).");
  client ??= new GoogleGenAI({});
  const model = process.env.GEMINI_MODEL || "gemini-3.8-flash";

  const interaction = await client.interactions.create({
    model,
    input: [{ type: "text", text: prompt }],
    response_format: { type: "text", mime_type: "application/json", schema: planSchema },
  });

  try {
    return JSON.parse(interaction.output_text);
  } catch {
    throw new Error("Gemini returned text that is not valid JSON.");
  }
}
