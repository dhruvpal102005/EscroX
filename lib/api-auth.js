import { NextResponse } from 'next/server';

const VALID_API_KEY = process.env.ESCROX_API_KEY || 'ESCROX_HACK_2026';

export function validateApiKey(req) {
    const apiKey = req.headers.get('x-api-key');
    if (!apiKey || apiKey !== VALID_API_KEY) {
        return false;
    }
    return true;
}

export function apiError(message, status = 400) {
    return NextResponse.json({ error: message, success: false }, { status });
}
