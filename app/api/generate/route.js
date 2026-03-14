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
            model: model || "meta-llama/Meta-Llama-3-8B-Instruct",
            max_tokens: 4096,
            messages: [
                {
                    role: "system",
                    content: "You are an expert technical escrow manager. Your job is to analyze a client's project prompt and structure it into a milestone-based freelance contract. Extract the title, deadlines, and a breakdown of milestones with their exact costs. Return the output exactly matching the requested JSON schema. Do not include markdown formatting or explanations."
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
