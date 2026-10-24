/**
 * Gemini Question Generation Service for Saanjh
 * Generates 4 tailored questions per category + Question 5 fixed, tagged for ML comparison.
 * Features 8-second timeout, 1 retry, caching in GeneratedQuestions,
 * and silent fallback to seeded benchmark questions.
 */

const crypto = require('crypto');
const { z } = require('zod');
const GeneratedQuestions = require('../models/GeneratedQuestions');
const { fixedQuestion5, defaultBankQuestions } = require('../data/seedQuestionBank');

const VALID_DIMENSIONS = [
  'frequency',
  'intensity',
  'social_preference',
  'style_preference',
  'depth',
  'openness_to_new',
  'shared_activity',
];

const optionSchema = z.object({
  label: z.string().min(1).max(80),
  value: z.string().min(1).max(40),
});

const geminiQuestionItemSchema = z.object({
  text: z.string().min(5).max(180),
  dimension: z.enum(VALID_DIMENSIONS),
  options: z.array(optionSchema).min(3).max(4),
  isSensitive: z.boolean().default(false),
  skippable: z.boolean().default(false),
});

const geminiQuestionsArraySchema = z.array(geminiQuestionItemSchema).length(4);

// Forbidden topic keywords that must be rejected (except culture category with prefer not to say)
const FORBIDDEN_KEYWORDS = [
  'caste',
  'salary',
  'income',
  'wealth',
  'sexuality',
  'sexual',
  'intercourse',
  'illness',
  'disease',
  'diagnosis',
  'disability',
  'mental illness',
  'political party',
  'bjp',
  'congress',
  'election vote',
];

function containsForbiddenContent(text, isCultureCategory = false) {
  const lower = (text || '').toLowerCase();
  for (const kw of FORBIDDEN_KEYWORDS) {
    if (lower.includes(kw)) {
      return true;
    }
  }
  if (!isCultureCategory) {
    if (lower.includes('religion') || lower.includes('hindu') || lower.includes('muslim') || lower.includes('christian')) {
      return true;
    }
  }
  return false;
}

function computeCacheKey(userId, category, interests = []) {
  const sortedInterests = [...interests].sort().join('|');
  const raw = `${String(userId)}:${category}:${sortedInterests}`;
  return crypto.createHash('sha256').update(raw).digest('hex');
}

/**
 * Get seeded benchmark questions for a category (4 seeded + Q5 fixed)
 */
function getSeededCategoryQuestions(categoryKey) {
  const seeded = defaultBankQuestions[categoryKey] || defaultBankQuestions.music;
  const fourQuestions = seeded.map((q, idx) => ({
    questionId: `${categoryKey}_q${idx + 1}`,
    questionIndex: idx,
    dimension: q.dimension,
    text: q.text,
    options: q.options.map((opt) => ({ label: opt.label, value: String(opt.value) })),
    isSensitive: Boolean(q.isSensitive),
    skippable: Boolean(q.skippable),
  }));

  const q5 = {
    questionId: `${categoryKey}_q5`,
    questionIndex: 4,
    dimension: fixedQuestion5.dimension,
    text: fixedQuestion5.text,
    options: fixedQuestion5.options.map((opt) => ({ label: opt.label, value: opt.value })),
    isSensitive: false,
    skippable: false,
  };

  return [...fourQuestions, q5];
}

/**
 * Perform single Gemini API call with 8s timeout
 */
async function callGeminiApi(promptText, systemInstruction, modelName, apiKey) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
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
      return null;
    }

    const data = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) return null;

    return JSON.parse(rawText);
  } catch {
    clearTimeout(timeoutId);
    return null;
  }
}

/**
 * Validate Gemini raw output against ML criteria
 */
function validateGeminiQuestions(parsedData, categoryKey) {
  if (!parsedData || !Array.isArray(parsedData.questions)) {
    return null;
  }

  const parsed = geminiQuestionsArraySchema.safeParse(parsedData.questions);
  if (!parsed.success) {
    return null;
  }

  const questions = parsed.data;
  const isCulture = categoryKey === 'culture';

  // Check uniqueness of texts
  const seenTexts = new Set();
  for (const q of questions) {
    const lower = q.text.toLowerCase().trim();
    if (seenTexts.has(lower)) return null;
    seenTexts.add(lower);

    // Check forbidden content
    if (containsForbiddenContent(q.text, isCulture)) {
      return null;
    }

    // Check options
    for (const opt of q.options) {
      if (containsForbiddenContent(opt.label, isCulture)) {
        return null;
      }
    }

    // If culture category and sensitive, ensure "Prefer not to say" exists
    if (isCulture && q.isSensitive) {
      const hasPreferNotToSay = q.options.some((o) =>
        o.label.toLowerCase().includes('prefer not to say') || o.value === 'prefer_not_to_say'
      );
      if (!hasPreferNotToSay) {
        q.options.push({ label: 'Prefer not to say', value: 'prefer_not_to_say' });
      }
      q.skippable = true;
    }
  }

  return questions;
}

/**
 * Generate 5 questions for a specific category (4 Gemini + 1 fixed Q5),
 * or silently fallback to seeds.
 */
async function generateCategoryQuestions({
  userId,
  categoryKey,
  categoryLabel,
  specificInterests = [],
}) {
  const cacheKey = computeCacheKey(userId, categoryKey, specificInterests);

  // 1. Check database cache
  try {
    const existing = await GeneratedQuestions.findOne({ cacheKey });
    if (existing && existing.questions && existing.questions.length === 5) {
      return {
        questions: existing.questions,
        source: existing.source,
        model: existing.model,
        promptVersion: existing.promptVersion,
      };
    }
  } catch (err) {
    console.warn('[GeminiService] Cache lookup error:', err.message);
  }

  const apiKey = process.env.GEMINI_API_KEY;
  const modelName = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
  const promptVersion = 'v1.0';

  let fourQuestions = null;
  let source = 'seed';

  if (apiKey && apiKey.trim() && apiKey !== 'your_gemini_api_key_here') {
    const isCulture = categoryKey === 'culture';
    const interestsString = specificInterests.length > 0
      ? specificInterests.join(', ')
      : 'General interests in this category';

    const systemInstruction = `You are an expert dating compatibility questionnaire designer for Saanjh, a calm, mindful matchmaking platform.
Your task is to generate exactly 4 short, engaging, single-choice questions for the category "${categoryLabel}", reflecting the member's specific passions: ${interestsString}.

STRICT RULES:
1. Generate exactly 4 questions.
2. Each question must have 3 to 4 single-tap options.
3. Every question must carry a "dimension" tag from this exact list:
   ['frequency', 'intensity', 'social_preference', 'style_preference', 'depth', 'openness_to_new', 'shared_activity'].
4. Option "value" codes must be:
   - For 'frequency', 'intensity', 'depth': ordinal numeric strings "1", "2", "3", "4" representing increasing order.
   - For 'social_preference', 'style_preference', 'openness_to_new': concise snake_case code strings (e.g., 'solo', 'partner', 'group', 'home_cozy', 'curated').
5. Tone: Warm, thoughtful, conversational, natural. Never ask for age, gender, salary, caste, health, or personal identity details.
${isCulture ? '6. For culture and traditions, include a "Prefer not to say" option and set isSensitive: true, skippable: true.' : '6. Do not include sensitive religious, medical, or political inquiries.'}
7. Output strict JSON matching:
{
  "questions": [
    {
      "text": "Short question text?",
      "dimension": "frequency",
      "options": [
        { "label": "Option label text", "value": "1" },
        { "label": "Option label text", "value": "2" },
        { "label": "Option label text", "value": "3" }
      ],
      "isSensitive": false,
      "skippable": false
    }
  ]
}`;

    const promptText = `Category: "${categoryLabel}"
User passions in this category: ${interestsString}

Generate 4 single-choice questions with ML-comparable dimensions and value codes as JSON.`;

    // Try call with 1 retry
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const rawOutput = await callGeminiApi(promptText, systemInstruction, modelName, apiKey);
        if (rawOutput) {
          const validated = validateGeminiQuestions(rawOutput, categoryKey);
          if (validated) {
            fourQuestions = validated;
            source = 'gemini';
            break;
          }
        }
      } catch {
        // Attempt failed, continue to retry or fallback
      }
    }
  }

  // Fallback to seeded questions if Gemini fails
  if (!fourQuestions) {
    const seededAll = getSeededCategoryQuestions(categoryKey);
    // Take first 4
    fourQuestions = seededAll.slice(0, 4);
    source = 'seed';
  }

  // Format 4 questions with stable IDs
  const formatted4 = fourQuestions.map((q, idx) => ({
    questionId: `${categoryKey}_q${idx + 1}`,
    questionIndex: idx,
    dimension: q.dimension,
    text: q.text,
    options: q.options.map((opt) => ({
      label: opt.label,
      value: String(opt.value),
    })),
    isSensitive: Boolean(q.isSensitive),
    skippable: Boolean(q.skippable),
  }));

  // Append fixed Question 5
  const q5 = {
    questionId: `${categoryKey}_q5`,
    questionIndex: 4,
    dimension: fixedQuestion5.dimension,
    text: fixedQuestion5.text,
    options: fixedQuestion5.options.map((opt) => ({
      label: opt.label,
      value: opt.value,
    })),
    isSensitive: false,
    skippable: false,
  };

  const completeQuestions = [...formatted4, q5];

  // Save to GeneratedQuestions cache
  try {
    await GeneratedQuestions.findOneAndUpdate(
      { cacheKey },
      {
        $set: {
          cacheKey,
          userId,
          category: categoryKey,
          interests: specificInterests,
          questions: completeQuestions,
          source,
          model: source === 'gemini' ? modelName : 'seed',
          promptVersion,
        },
      },
      { upsert: true, new: true }
    );
  } catch (err) {
    console.warn('[GeminiService] Failed to cache generated questions:', err.message);
  }

  return {
    questions: completeQuestions,
    source,
    model: source === 'gemini' ? modelName : 'seed',
    promptVersion,
  };
}

/**
 * Generate questions for all selected categories in parallel
 */
async function generateAllCategoriesQuestions(userId, selectedCategories, userInterestsMap = {}) {
  const results = await Promise.all(
    selectedCategories.map((catKey) => {
      const specificInterests = userInterestsMap[catKey] || [];
      const catInfoLabel = catKey.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      return generateCategoryQuestions({
        userId,
        categoryKey: catKey,
        categoryLabel: catInfoLabel,
        specificInterests,
      }).then((res) => ({
        category: catKey,
        ...res,
      })).catch(() => ({
        category: catKey,
        questions: getSeededCategoryQuestions(catKey),
        source: 'seed',
        model: 'seed',
        promptVersion: 'v1.0',
      }));
    })
  );

  return results;
}

module.exports = {
  VALID_DIMENSIONS,
  generateCategoryQuestions,
  generateAllCategoriesQuestions,
  getSeededCategoryQuestions,
  computeCacheKey,
};
