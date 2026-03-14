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
                    content: "You are an expert technical escrow manager. Analyze the client prompt and structure it into a milestone-based project contract. Output MUST exactly match the predefined JSON schema.\n\nRULES:\n1. MUST create short, meaningful titles for each milestone.\n2. Do NOT split the budget equally. Distribute it based on the realistic difficulty of each phase.\n3. The 'amount' property MUST be a valid number (e.g., 25.50 or 50).\n4. The sum of all milestone 'amount' values MUST exactly equal the total budget requested in the prompt. Do not exceed or undercut the budget.\n\nExample for a 100 USD 4-milestone project:\n\"milestones\": [\n { \"title\": \"Planning\", \"amount\": 15 },\n { \"title\": \"Design\", \"amount\": 25 },\n { \"title\": \"Development\", \"amount\": 40 },\n { \"title\": \"Testing\", \"amount\": 20 }\n]"
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
