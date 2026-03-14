import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// Featherless AI provides an OpenAI-compatible endpoint
const openai = new OpenAI({
    baseURL: 'https://api.featherless.ai/v1',
    apiKey: process.env.FEATHERLESS_API_KEY || 'MISSING_API_KEY',
});

// Define the exact JSON structure we need the AI to return
const schema = {
    type: "object",
    properties: {
        title: {
            type: "string",
            description: "A short, professional title for the freelance contract."
        },
        deadline: {
            type: "string",
            description: "The estimated completion date in YYYY-MM-DD format based on the prompt's timeline."
        },
        currency: {
            type: "string",
            description: "The currency code mentioned (e.g. USD, USDC, EUR, GBP, INR). Default to USD if none specified.",
            enum: ["USD", "USDC", "EUR", "GBP", "INR"]
        },
        milestones: {
            type: "array",
            description: "A chronological list of project milestones to be funded and delivered.",
            items: {
                type: "object",
                properties: {
                    title: { type: "string", description: "Short title of the deliverable (e.g. Wireframes)" },
                    amount: { type: "number", description: "The monetary value assigned to this specific milestone." }
                },
                required: ["title", "amount"]
            }
        }
    },
    required: ["title", "deadline", "currency", "milestones"]
};

export async function POST(req) {
    try {
        const { prompt, model } = await req.json();

        if (!prompt) {
            return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
        }

        if (!process.env.FEATHERLESS_API_KEY) {
            return NextResponse.json({ error: "FEATHERLESS_API_KEY is not configured on the server." }, { status: 500 });
        }

        const completion = await openai.chat.completions.create({
            model: model || "NousResearch/Hermes-2-Pro-Llama-3-8B",
            max_tokens: 4096,
            messages: [
                {
                    role: "system",
                    content: `You are an expert technical escrow manager. Analyze the client prompt and structure it into a milestone-based project contract. You MUST return valid JSON matching this exact structure:

{
  "title": "Short Professional Project Title",
  "deadline": "YYYY-MM-DD",
  "currency": "USD",
  "milestones": [
    { "title": "Phase Name", "amount": 15 },
    { "title": "Phase Name", "amount": 25 },
    { "title": "Phase Name", "amount": 40 },
    { "title": "Phase Name", "amount": 20 }
  ]
}

RULES:
1. "title" MUST be a short, professional project title (e.g. "Mobile App Development", "E-commerce Website Redesign"). NEVER leave it empty.
2. "deadline" MUST be a date in YYYY-MM-DD format calculated from today (${new Date().toISOString().split('T')[0]}).
3. "currency" MUST be one of: USD, EUR, GBP, INR, USDC. Default to USD.
4. Each milestone MUST have a descriptive "title" and a numeric "amount".
5. Do NOT split the budget equally. Distribute based on realistic difficulty of each phase.
6. The sum of all milestone amounts MUST exactly equal the total budget.
7. Do NOT include any text outside the JSON object.`
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            // Enforce structured JSON response
            response_format: { type: "json_object" },
            temperature: 0.1,
        });

        // The AI should return a JSON string that matches our schema
        const content = completion.choices[0].message.content;
        const parsed = JSON.parse(content);

        return NextResponse.json(parsed);

    } catch (error) {
        console.error("AI Generation Error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to generate contract." },
            { status: 500 }
        );
    }
}
