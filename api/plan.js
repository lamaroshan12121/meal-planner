// POST /api/plan  body: { profile: { weightKg, heightCm, age, sex, activity, goal }, budget?: number }
// Thin handler: code works out the targets, generatePlan asks the AI and checks the result.
import { calculateTargets } from "../targets.js";
import { generatePlan } from "../generatePlan.js";
import { geminiAskAI } from "../gemini.js";

const DEFAULT_BUDGET = 65; // the middle of the $60 to $70 AUD range in the PRD

// askAI is injectable so the handler can be tested without Gemini.
export function createHandler(askAI) {
  return async function handler(req, res) {
    if (req.method !== "POST") return res.status(405).json({ error: "Please use POST" });

    const { profile, budget = DEFAULT_BUDGET } = req.body || {};
    if (!profile || typeof profile !== "object") return res.status(400).json({ error: "Missing profile object" });
    if (typeof budget !== "number" || !Number.isFinite(budget) || budget <= 0) {
      return res.status(400).json({ error: "Budget must be a positive number" });
    }

    const targets = calculateTargets(profile);
    if (!targets.ok) return res.status(400).json({ error: "Invalid profile", details: targets.errors });

    const result = await generatePlan({ targets: targets.lunchDinner, budget, askAI });
    if (!result.ok) {
      console.error(result.error);
      return res.status(502).json({ error: "Could not generate a plan. Try again in a minute.", details: result.error, attempts: result.attempts });
    }

    return res.status(200).json({
      targets,
      plan: result.plan,
      check: result.check,
      attempts: result.attempts,
      passes: result.passes,
      ...(result.retryError && { retryError: result.retryError }),
    });
  };
}

export default createHandler(geminiAskAI);
