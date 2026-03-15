import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
    baseURL: 'https://api.featherless.ai/v1',
    apiKey: process.env.FEATHERLESS_API_KEY || 'MISSING_API_KEY',
});

// ─── URL TYPE DETECTION ──────────────────────────────────────────────────────

function detectUrlType(url) {
    try {
        const u = new URL(url);
        const host = u.hostname.toLowerCase();
        if (host.includes('github.com')) return 'github';
        if (host.includes('figma.com')) return 'figma';
        if (host.includes('loom.com')) return 'loom';
        if (host.includes('drive.google.com')) return 'gdrive';
        if (host.includes('docs.google.com')) return 'gdocs';
        if (host.includes('notion.so') || host.includes('notion.site')) return 'notion';
        if (host.includes('vercel.app') || host.includes('netlify.app')) return 'deployment';
        return 'generic';
    } catch {
        return 'invalid';
    }
}

// ─── GITHUB METADATA FETCHER ────────────────────────────────────────────────

async function fetchGitHubMetadata(url) {
    try {
        const u = new URL(url);
        const parts = u.pathname.split('/').filter(Boolean);
        if (parts.length < 2) return null;

        const owner = parts[0];
        const repo = parts[1];

        // Fetch repo info
        const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
            headers: { 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'EscroX-Verifier' },
        });
        if (!repoRes.ok) return { error: 'Repository not found or private', owner, repo };

        const repoData = await repoRes.json();

        // Fetch recent commits (last 5)
        const commitsRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=5`, {
            headers: { 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'EscroX-Verifier' },
        });
        let commits = [];
        let totalCommits = 0;
        if (commitsRes.ok) {
            commits = await commitsRes.json();
            // Get total commit count from the Link header or contributors endpoint
            const linkHeader = commitsRes.headers.get('Link');
            if (linkHeader && linkHeader.includes('last')) {
                const match = linkHeader.match(/page=(\d+)>; rel="last"/);
                totalCommits = match ? parseInt(match[1]) * 5 : commits.length;
            } else {
                totalCommits = commits.length;
            }
        }

        return {
            name: repoData.full_name,
            description: repoData.description || 'No description',
            language: repoData.language || 'Unknown',
            stars: repoData.stargazers_count,
            forks: repoData.forks_count,
            openIssues: repoData.open_issues_count,
            defaultBranch: repoData.default_branch,
            createdAt: repoData.created_at,
            updatedAt: repoData.updated_at,
            pushedAt: repoData.pushed_at,
            totalCommits,
            recentCommits: commits.slice(0, 3).map(c => ({
                message: c.commit?.message?.split('\n')[0] || 'No message',
                date: c.commit?.author?.date || '',
                author: c.commit?.author?.name || 'Unknown',
            })),
        };
    } catch (err) {
        console.error('GitHub fetch error:', err);
        return null;
    }
}

// ─── GENERIC URL ANALYSIS ───────────────────────────────────────────────────

function analyzeGenericUrl(url, type) {
    try {
        const u = new URL(url);
        const info = {
            domain: u.hostname,
            path: u.pathname,
            type,
        };

        switch (type) {
            case 'figma':
                info.hint = 'Figma design file — likely contains UI/UX mockups or prototypes';
                break;
            case 'loom':
                info.hint = 'Loom video recording — likely a demo or walkthrough';
                break;
            case 'gdrive':
                info.hint = 'Google Drive link — could contain documents, images, or project files';
                break;
            case 'gdocs':
                info.hint = 'Google Docs link — likely a document or specification';
                break;
            case 'notion':
                info.hint = 'Notion page — likely documentation or project notes';
                break;
            case 'deployment':
                info.hint = 'Live deployment link — a hosted web application';
                break;
            default:
                info.hint = `Link to ${u.hostname}`;
        }

        return info;
    } catch {
        return { domain: 'unknown', path: '', type: 'invalid', hint: 'Could not parse URL' };
    }
}

// ─── MAIN HANDLER ───────────────────────────────────────────────────────────

export async function POST(req) {
    try {
        const { evidenceUrl, evidenceImageUrl, milestoneTitle, contractTitle } = await req.json();

        if (!evidenceUrl) {
            return NextResponse.json({ error: 'Evidence URL is required' }, { status: 400 });
        }

        if (!process.env.FEATHERLESS_API_KEY) {
            return NextResponse.json({ error: 'AI API key is not configured.' }, { status: 500 });
        }

        // Step 1: Detect URL type and fetch metadata
        const urlType = detectUrlType(evidenceUrl);
        let metadata = null;
        let metadataContext = '';

        if (urlType === 'invalid') {
            return NextResponse.json({
                summary: 'The submitted URL appears to be invalid or malformed.',
                isRelevant: false,
                confidence: 'low',
                flags: ['Invalid URL format'],
                urlType: 'invalid',
            });
        }

        if (urlType === 'github') {
            metadata = await fetchGitHubMetadata(evidenceUrl);
            if (metadata && !metadata.error) {
                metadataContext = `
GITHUB REPOSITORY METADATA:
- Repository: ${metadata.name}
- Description: ${metadata.description}
- Primary Language: ${metadata.language}
- Stars: ${metadata.stars} | Forks: ${metadata.forks}
- Total Commits: ${metadata.totalCommits}
- Last Updated: ${metadata.pushedAt}
- Default Branch: ${metadata.defaultBranch}
- Recent Commits:
${metadata.recentCommits.map((c, i) => `  ${i + 1}. "${c.message}" by ${c.author} on ${c.date}`).join('\n')}`;
            } else if (metadata?.error) {
                metadataContext = `\nGITHUB: ${metadata.error}. Repository: ${metadata.owner}/${metadata.repo}`;
            }
        } else {
            const genericInfo = analyzeGenericUrl(evidenceUrl, urlType);
            metadataContext = `
URL ANALYSIS:
- Domain: ${genericInfo.domain}
- Type: ${genericInfo.type}
- Context: ${genericInfo.hint}
- Full Path: ${genericInfo.path}`;
        }

        // Step 2: Ask AI to generate summary + verification
        const completion = await openai.chat.completions.create({
            model: 'NousResearch/Hermes-2-Pro-Llama-3-8B',
            max_tokens: 512,
            temperature: 0.2,
            messages: [
                {
                    role: 'system',
                    content: `You are an AI submission verifier for an escrow platform called EscroX. A freelancer has submitted evidence of their work for a milestone. Your job is to analyze the submission and provide a concise verification.

You MUST return valid JSON with this exact structure:
{
  "summary": "A 3-4 line description of what was submitted. Be specific — mention repo name, tech stack, commit activity, or content type. Keep it informative but concise.",
  "isRelevant": true,
  "confidence": "high",
  "flags": []
}

RULES:
1. "summary" must be exactly 3-4 lines (sentences). Describe WHAT was submitted in concrete terms.
2. "isRelevant" — does the submission appear related to the milestone's scope? true/false.
3. "confidence" — your confidence in the verification: "high", "medium", or "low".
4. "flags" — array of warning strings. Empty array if no concerns. Examples: "Repository appears empty", "URL may be unrelated to milestone scope", "Link domain doesn't match expected deliverable type".
5. Be professional and objective. Do not hallucinate details not present in the metadata.
6. Return ONLY valid JSON, nothing else.`
                },
                {
                    role: 'user',
                    content: `MILESTONE: "${milestoneTitle}"
CONTRACT: "${contractTitle || 'Not specified'}"
EVIDENCE URL: ${evidenceUrl}
OPTIONAL SCREENSHOT URL: ${evidenceImageUrl || 'None provided'}
${metadataContext}

Analyze this submission and return your verification JSON.`
                }
            ],
            response_format: { type: 'json_object' },
        });

        const content = completion.choices[0].message.content;
        const aiResult = JSON.parse(content);

        // Ensure defaults
        const result = {
            summary: aiResult.summary || 'Submission received. Unable to generate detailed summary.',
            isRelevant: aiResult.isRelevant !== undefined ? aiResult.isRelevant : true,
            confidence: ['high', 'medium', 'low'].includes(aiResult.confidence) ? aiResult.confidence : 'medium',
            flags: Array.isArray(aiResult.flags) ? aiResult.flags : [],
            urlType,
            metadata: urlType === 'github' && metadata && !metadata.error ? {
                repoName: metadata.name,
                language: metadata.language,
                totalCommits: metadata.totalCommits,
                lastCommit: metadata.recentCommits?.[0] || null,
                stars: metadata.stars,
            } : null,
        };

        return NextResponse.json(result);

    } catch (error) {
        console.error('Verify Submission Error:', error);
        // Return a graceful fallback — don't block submission
        return NextResponse.json({
            summary: 'AI verification is temporarily unavailable. The submission can proceed without verification.',
            isRelevant: true,
            confidence: 'low',
            flags: ['AI verification failed — manual review recommended'],
            urlType: 'unknown',
            metadata: null,
            error: error.message,
        });
    }
}
