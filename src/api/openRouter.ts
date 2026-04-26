import type { MenuData } from '../types';

const API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY as string;
const MODEL_ID = (import.meta.env.VITE_OPENROUTER_MODEL_ID as string) || 'anthropic/claude-haiku-4-5';

const SYSTEM_PROMPT = `You are a precise menu data extraction assistant. 
Extract all menu items from the provided image and return ONLY a valid JSON array.
The JSON must follow this exact structure:
[
  {
    "title": "Category Name",
    "entries": [
      { "title": "Item Name", "price": "$12.99", "description": "Item description or null" }
    ]
  }
]

Rules:
- Return ONLY the JSON array, no markdown, no explanation
- Use null for missing price or description fields
- Group items by their menu category/section
- Preserve original pricing format (e.g. "$12.99", "12", "£8.50")
- If no categories are visible, use a single category like "Menu Items"`;

export class OpenRouterError extends Error {
  constructor(
    message: string,
    public readonly status?: number
  ) {
    super(message);
    this.name = 'OpenRouterError';
  }
}

export async function extractMenuFromImage(base64Image: string, mimeType: string): Promise<MenuData> {
  if (!API_KEY) {
    throw new OpenRouterError('Missing VITE_OPENROUTER_API_KEY environment variable. Please add it to your .env file.');
  }

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': window.location.origin,
      'X-Title': 'AI Menu Extractor',
    },
    body: JSON.stringify({
      model: MODEL_ID,
      messages: [
        {
          role: 'system',
          content: SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`,
              },
            },
            {
              type: 'text',
              text: 'Extract all menu items from this image and return the structured JSON.',
            },
          ],
        },
      ],
      temperature: 0.1,
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => 'Unknown error');
    throw new OpenRouterError(
      `OpenRouter API error (${response.status}): ${errorBody}`,
      response.status
    );
  }

  const data = await response.json() as {
    choices: Array<{ message: { content: string } }>;
    error?: { message: string };
  };

  if (data.error) {
    throw new OpenRouterError(data.error.message);
  }

  const rawContent = data.choices?.[0]?.message?.content;
  if (!rawContent) {
    throw new OpenRouterError('Empty response from AI model.');
  }

  // Strip markdown fences if present
  const cleaned = rawContent
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();

  try {
    const parsed = JSON.parse(cleaned) as MenuData;
    if (!Array.isArray(parsed)) {
      throw new Error('Response is not an array');
    }
    return parsed;
  } catch {
    throw new OpenRouterError(`Failed to parse AI response as JSON. Raw response: ${rawContent.slice(0, 200)}`);
  }
}
