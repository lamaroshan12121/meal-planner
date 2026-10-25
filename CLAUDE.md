# Meal Prep Cost and Macro Planner

Read PRD.md for the product spec and meal-planner-roadmap.md for the build stages. Work one stage at a time and stop at the end of each stage.

## Rules
- Code does the maths. The AI only picks meals as ingredient ids and grams. It never supplies calories, macros or prices.
- Only use ingredients from ingredients.js. Reject unknown ingredients.
- Weekly cost counts whole packs bought (pricing "pack") or grams used (pricing "weight").
- Stack: React + Vite in web/, Vercel serverless functions in api/, Gemini free tier via @google/genai, localStorage for saving. Node ES modules.
- Keep it simple and free. No new paid services and no heavy dependencies.
- Never commit .env. The API key is GEMINI_API_KEY.
- Write a small test script for any calculation and run it before saying a stage is done.
- At the end of each stage, explain in plain language what you built and how it works, so the user can explain it to someone else.