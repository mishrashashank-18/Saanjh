const { z } = require('zod');
const Profile = require('../models/Profile');
const InterestCatalog = require('../models/InterestCatalog');
const UserInterests = require('../models/UserInterests');
const InterestQuestions = require('../models/InterestQuestions');
const InterestAnswers = require('../models/InterestAnswers');
const User = require('../models/User');
const { catalogData, defaultQuestionsData, generateSlug } = require('../data/seedData');
const { generateCategoryQuestions } = require('../services/geminiService');

// 1. Zod Validation Schemas
const profileSchema = z.object({
  genderPreference: z.array(z.string()).default(['everyone']),
  ageRange: z
    .object({
      min: z.number().min(18).default(18),
      max: z.number().min(18).default(40),
    })
    .default({ min: 18, max: 40 }),
  relationshipGoal: z
    .enum(['long-term', 'casual', 'friendship', 'unsure', ''])
    .default(''),
  city: z.string().trim().default(''),
  maxDistanceKm: z.number().default(25),
  languages: z.array(z.string()).default([]),
  partnerPriorities: z
    .object({
      attractiveness: z.number().min(1).max(10).default(5),
      sincerity: z.number().min(1).max(10).default(5),
      intelligence: z.number().min(1).max(10).default(5),
      humour: z.number().min(1).max(10).default(5),
      ambition: z.number().min(1).max(10).default(5),
      sharedInterests: z.number().min(1).max(10).default(5),
    })
    .default({
      attractiveness: 5,
      sincerity: 5,
      intelligence: 5,
      humour: 5,
      ambition: 5,
      sharedInterests: 5,
    }),
  goingOutFrequency: z
    .enum(['rarely', 'sometimes', 'often', 'very-often', ''])
    .default(''),
  culturalImportance: z
    .enum(['not-important', 'a-little', 'somewhat', 'very-important', 'prefer-not-to-say', ''])
    .default(''),
  dealBreakers: z.string().max(500).default(''),
  notes: z.string().max(500).default(''),
  isFinalSubmit: z.boolean().optional(),
});

const userInterestsSchema = z.object({
  categories: z.array(z.string()).default([]),
  interests: z.array(z.string()).default([]),
  top3: z.array(z.string()).default([]),
  skip: z.boolean().optional(),
});

const answerSchema = z.object({
  category: z.string({ required_error: 'Category is required' }),
  q1: z.string().default(''),
  q2: z.string().default(''),
  sharePreference: z
    .enum(['must-have', 'nice-to-have', 'doesnt-matter', ''])
    .default(''),
});

// Helper: Calculate Top Categories for User
async function computeTopCategories(userId) {
  const userInterests = await UserInterests.findOne({ userId });
  if (!userInterests || !userInterests.categories || userInterests.categories.length === 0) {
    // Default fallback to first 3 categories
    return ['music', 'movies_tv', 'books_learning'];
  }

  const chosenCategories = new Set();

  // 1. First prioritize categories from the ranked top-3 interests
  if (userInterests.top3 && userInterests.top3.length > 0) {
    for (const slug of userInterests.top3) {
      const cat = slug.split('.')[0];
      if (cat && catalogData[cat]) {
        chosenCategories.add(cat);
      }
    }
  }

  // 2. If fewer than 3, fill up with categories that have the most selected interests
  if (chosenCategories.size < 3) {
    const categoryCounts = {};
    for (const slug of userInterests.interests || []) {
      const cat = slug.split('.')[0];
      if (cat) {
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
      }
    }

    const sortedByCount = Object.keys(categoryCounts).sort(
      (a, b) => categoryCounts[b] - categoryCounts[a]
    );

    for (const cat of sortedByCount) {
      if (chosenCategories.size >= 3) break;
      chosenCategories.add(cat);
    }
  }

  // 3. If still fewer than 3, fill from user's chosen categories
  if (chosenCategories.size < 3) {
    for (const cat of userInterests.categories) {
      if (chosenCategories.size >= 3) break;
      chosenCategories.add(cat);
    }
  }

  return Array.from(chosenCategories).slice(0, 3);
}

// ----------------- CONTROLLER METHODS -----------------

/**
 * GET /api/onboarding/profile
 */
async function getProfile(req, res, next) {
  try {
    let profile = await Profile.findOne({ userId: req.user._id });
    if (!profile) {
      profile = await Profile.create({ userId: req.user._id });
    }

    return res.status(200).json({
      success: true,
      profile: profile.toJSON(),
      user: {
        fullName: req.user.fullName,
        displayName: req.user.displayName,
        email: req.user.email,
        dateOfBirth: req.user.dateOfBirth,
        genderIdentity: req.user.genderIdentity,
        mobileNumber: req.user.mobileNumber,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/onboarding/profile
 * Auto-saves or submits profile
 */
async function saveProfile(req, res, next) {
  try {
    const validatedData = profileSchema.parse(req.body);

    const updateFields = {
      genderPreference: validatedData.genderPreference,
      ageRange: validatedData.ageRange,
      relationshipGoal: validatedData.relationshipGoal,
      city: validatedData.city,
      maxDistanceKm: validatedData.maxDistanceKm,
      languages: validatedData.languages,
      partnerPriorities: validatedData.partnerPriorities,
      goingOutFrequency: validatedData.goingOutFrequency,
      culturalImportance: validatedData.culturalImportance,
      dealBreakers: validatedData.dealBreakers,
      notes: validatedData.notes,
    };

    const profile = await Profile.findOneAndUpdate(
      { userId: req.user._id },
      { $set: updateFields },
      { new: true, upsert: true }
    );

    // If final submission of the 4 steps, advance onboardingStep to 'interests'
    if (validatedData.isFinalSubmit) {
      if (req.user.onboardingStep === 'profile' || req.user.onboardingStep === 'verify') {
        req.user.onboardingStep = 'interests';
        await req.user.save();
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Profile saved successfully.',
      profile: profile.toJSON(),
      onboardingStep: req.user.onboardingStep,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/onboarding/interests/catalog
 */
async function getCatalog(req, res, next) {
  try {
    // Attempt to read from MongoDB collection first
    const catalogDocs = await InterestCatalog.find().sort({ category: 1, label: 1 });

    if (catalogDocs && catalogDocs.length > 0) {
      // Group by category
      const formattedCatalog = {};
      for (const item of catalogDocs) {
        if (!formattedCatalog[item.category]) {
          formattedCatalog[item.category] = {
            key: item.category,
            label: item.categoryLabel,
            items: [],
          };
        }
        formattedCatalog[item.category].items.push({
          slug: item.slug,
          label: item.label,
        });
      }
      return res.status(200).json({
        success: true,
        catalog: formattedCatalog,
      });
    }

    // Fallback directly to catalogData with generated slugs
    const formattedFallback = {};
    for (const [catKey, catInfo] of Object.entries(catalogData)) {
      formattedFallback[catKey] = {
        key: catKey,
        label: catInfo.label,
        items: catInfo.items.map((name) => ({
          slug: generateSlug(catKey, name),
          label: name,
        })),
      };
    }

    return res.status(200).json({
      success: true,
      catalog: formattedFallback,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/onboarding/interests
 */
async function getUserInterests(req, res, next) {
  try {
    const userInterests = await UserInterests.findOne({ userId: req.user._id });
    return res.status(200).json({
      success: true,
      userInterests: userInterests
        ? userInterests.toJSON()
        : { categories: [], interests: [], top3: [] },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/onboarding/interests
 */
async function saveUserInterests(req, res, next) {
  try {
    const { categories, interests, top3, skip } = userInterestsSchema.parse(req.body);

    // If skip was clicked, allow skip but don't advance to done
    if (skip) {
      // User can skip for now, but stays on this step or moves forward
      if (req.user.onboardingStep === 'interests') {
        req.user.onboardingStep = 'interest_questions';
        await req.user.save();
      }
      return res.status(200).json({
        success: true,
        message: 'Interests skipped for now.',
        onboardingStep: req.user.onboardingStep,
      });
    }

    // Validation rules:
    // Categories: at least 3
    if (categories.length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Please choose at least 3 categories that interest you.',
      });
    }

    // Interests: at least 5 in total, max 15
    if (interests.length < 5) {
      return res.status(400).json({
        success: false,
        message: 'Please select at least 5 interests in total.',
      });
    }
    if (interests.length > 15) {
      return res.status(400).json({
        success: false,
        message: 'You can select up to 15 interests maximum.',
      });
    }

    // Top 3: exactly 3
    if (top3.length !== 3) {
      return res.status(400).json({
        success: false,
        message: 'Please select and order exactly 3 top interests.',
      });
    }

    const saved = await UserInterests.findOneAndUpdate(
      { userId: req.user._id },
      {
        $set: {
          categories,
          interests,
          top3,
        },
      },
      { new: true, upsert: true }
    );

    if (req.user.onboardingStep === 'interests') {
      req.user.onboardingStep = 'interest_questions';
      await req.user.save();
    }

    return res.status(200).json({
      success: true,
      message: 'Interests saved successfully.',
      userInterests: saved.toJSON(),
      onboardingStep: req.user.onboardingStep,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/onboarding/questions
 * Fetches questions for the user's top 3 categories (Gemini generated or seeded, cached in MongoDB)
 */
async function getQuestions(req, res, next) {
  try {
    const topCategories = await computeTopCategories(req.user._id);

    // Fetch existing answers for these categories
    const existingAnswers = await InterestAnswers.find({
      userId: req.user._id,
      category: { $in: topCategories },
    });
    const answersMap = {};
    for (const a of existingAnswers) {
      answersMap[a.category] = a.toJSON();
    }

    const categoriesQuestions = [];

    for (const catKey of topCategories) {
      const catInfo = catalogData[catKey] || { label: catKey };

      // 1. Check if questions are already cached in MongoDB
      let cached = await InterestQuestions.findOne({ category: catKey });

      if (!cached || !cached.questions || cached.questions.length !== 2) {
        // 2. Try Gemini generation with timeout & schema validation
        const seededQuestions = defaultQuestionsData[catKey] || [];
        const geminiQuestions = await generateCategoryQuestions(
          catKey,
          catInfo.label,
          seededQuestions
        );

        const questionsToSave = geminiQuestions || seededQuestions;
        const source = geminiQuestions ? 'gemini' : 'seed';

        // Cache in MongoDB
        cached = await InterestQuestions.findOneAndUpdate(
          { category: catKey },
          {
            $set: {
              category: catKey,
              source,
              questions: questionsToSave,
              updatedAt: new Date(),
            },
          },
          { upsert: true, new: true }
        );
      }

      categoriesQuestions.push({
        category: catKey,
        categoryLabel: catInfo.label,
        questions: cached.questions,
        answer: answersMap[catKey] || null,
        sharedQuestion: {
          text: 'How much do you want a partner to share this interest?',
          options: ['Must have', 'Nice to have', "Doesn't matter"],
        },
      });
    }

    return res.status(200).json({
      success: true,
      topCategories,
      categoriesQuestions,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/onboarding/answers
 * Saves answer for a category
 */
async function saveAnswer(req, res, next) {
  try {
    const { category, q1, q2, sharePreference } = answerSchema.parse(req.body);

    const saved = await InterestAnswers.findOneAndUpdate(
      { userId: req.user._id, category },
      {
        $set: {
          q1,
          q2,
          sharePreference,
          answeredAt: new Date(),
        },
      },
      { new: true, upsert: true }
    );

    // Check if user has answered all top 3 categories
    const topCategories = await computeTopCategories(req.user._id);
    const answeredCount = await InterestAnswers.countDocuments({
      userId: req.user._id,
      category: { $in: topCategories },
    });

    let completedAll = false;
    if (answeredCount >= topCategories.length) {
      completedAll = true;
      req.user.onboardingStep = 'done';
      req.user.profileCompleted = true;
      await req.user.save();
    }

    return res.status(200).json({
      success: true,
      message: 'Answer saved successfully.',
      answer: saved.toJSON(),
      completedAll,
      onboardingStep: req.user.onboardingStep,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/onboarding/settings
 * Read full profile & interests for settings page
 */
async function getSettings(req, res, next) {
  try {
    const [profile, userInterests] = await Promise.all([
      Profile.findOne({ userId: req.user._id }),
      UserInterests.findOne({ userId: req.user._id }),
    ]);

    return res.status(200).json({
      success: true,
      user: req.user.toJSON(),
      profile: profile ? profile.toJSON() : null,
      userInterests: userInterests ? userInterests.toJSON() : null,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getProfile,
  saveProfile,
  getCatalog,
  getUserInterests,
  saveUserInterests,
  getQuestions,
  saveAnswer,
  getSettings,
};
