/**
 * Gemini Question Generation Service for Saanjh
 * Uses Google Gemini API with strict JSON mode, 8-second timeout,
 * and silent fallback to seeded questions.
 */

const { z } = require('zod');

const geminiQuestionSchema = z.object({
  questions: z
    .array(
      z.object({
        text: z.string().min(5).max(120),
        options: z.array(z.string().min(1).max(50)).min(3).max(5),
        skippable: z.boolean().default(false),
        isSensitive: z.boolean().default(false),
      })
    )
    .length(2),
});

/**
 * Generate 2 single-choice questions for a specific category using Gemini.
 * Returns { questions: [...] } on success or null on error / timeout / missing key.
 */
async function generateCategoryQuestions(categoryKey, categoryLabel, seededQuestions) {
  const apiKey = process.env.GEMINI_API_KEY;

  // If no API key configured, return null to silently use seeds
  if (!apiKey || apiKey.trim() === '' || apiKey === 'your_gemini_api_key_here') {
    return null;
  }

  const isSensitiveCategory = categoryKey === 'food_drink' || categoryKey === 'culture';

  const systemInstruction = `You are an expert matchmaking questionnaire designer for Saanjh, a calm, mindful relationship platform.
Your task is to generate exactly 2 short, thoughtful, single-choice questions to understand a member's relationship with their interest in "${categoryLabel}".

Rules:
1. Generate exactly 2 questions.
2. Each question must have 3 to 4 short, distinct, single-tap options.
3. Keep the tone warm, calm, reflective, and conversational.
4. No invasive, deeply personal, or sensitive probing without a "Prefer not to say" option.
${isSensitiveCategory ? '5. For sensitive cultural, dietary or spiritual topics, include "Prefer not to say" and mark skippable: true and isSensitive: true.' : ''}
5. Do NOT ask for age, gender, location, or name.
6. Output STRICT JSON only conforming to the schema.`;

  const promptText = `Generate 2 single-choice questions for the category: "${categoryLabel}".
For reference, here are the default benchmark questions for this category:
Question 1: ${seededQuestions?.[0]?.text || ''} (Options: ${seededQuestions?.[0]?.options?.join(', ') || ''})
Question 2: ${seededQuestions?.[1]?.text || ''} (Options: ${seededQuestions?.[1]?.options?.join(', ') || ''})

Return JSON format:
{
  "questions": [
    {
      "text": "short question?",
      "options": ["opt1", "opt2", "opt3", "opt4"],
      "skippable": ${isSensitiveCategory ? 'true' : 'false'},
      "isSensitive": ${isSensitiveCategory ? 'true' : 'false'}
    },
    {
      "text": "second short question?",
      "options": ["opt1", "opt2", "opt3"],
      "skippable": false,
      "isSensitive": false
    }
  ]
}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8-second strict timeout

    // Try gemini-2.5-flash first, which supports responseSchema & JSON
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: promptText }],
          },
        ],
        systemInstruction: {
          parts: [{ text: systemInstruction }],
        },
        generationConfig: {
          temperature: 0.7,
          responseMimeType: 'application/json',
        },
      }),
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      // Silently fall back to seeds
      return null;
    }

    const data = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      return null;
    }

    const parsedJson = JSON.parse(rawText);
    const validated = geminiQuestionSchema.safeParse(parsedJson);

    if (!validated.success) {
      console.warn(`[GeminiService] Response validation failed for category ${categoryKey}:`, validated.error.message);
      return null;
    }

    return validated.data.questions;
  } catch {
    // Timeout or network error: silently return null to trigger fallback
    return null;
  }
}

module.exports = {
  generateCategoryQuestions,
};
