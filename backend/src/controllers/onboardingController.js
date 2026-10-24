const { z } = require('zod');
const Profile = require('../models/Profile');
const InterestCatalog = require('../models/InterestCatalog');
const UserInterests = require('../models/UserInterests');
const InterestAnswers = require('../models/InterestAnswers');
const GeneratedQuestions = require('../models/GeneratedQuestions');
const QuestionBank = require('../models/QuestionBank');
const User = require('../models/User');
const { catalogData, generateSlug } = require('../data/seedData');
const {
  generateCategoryQuestions,
  getSeededCategoryQuestions,
} = require('../services/geminiService');
const { logResponseEvent } = require('../services/eventService');

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

// No limits: categories 1..13, interests any number, top3 optional 0..3
const userInterestsSchema = z.object({
  categories: z.array(z.string()).default([]),
  interests: z.array(z.string()).default([]),
  top3: z.array(z.string()).max(3).default([]),
  skip: z.boolean().optional(),
});

const answerItemSchema = z.object({
  questionIndex: z.number().min(0).max(4),
  questionId: z.string(),
  dimension: z.string(),
  selectedValue: z.string().default(''),
  skipped: z.boolean().optional().default(false),
});

const answerSchema = z.object({
  category: z.string({ required_error: 'Category is required' }),
  answers: z.array(answerItemSchema).optional(),
  // Legacy single fields support (can be string or option object { label, value })
  q1: z.any().optional().default(''),
  q2: z.any().optional().default(''),
  sharePreference: z
    .enum(['must-have', 'nice-to-have', 'doesnt-matter', ''])
    .optional()
    .default(''),
  skipped: z.boolean().optional().default(false),
});

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
        consent: req.user.consent,
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

    if (validatedData.isFinalSubmit) {
      updateFields.completedAt = new Date();
    }

    const previousProfile = await Profile.findOne({ userId: req.user._id });

    const profile = await Profile.findOneAndUpdate(
      { userId: req.user._id },
      { $set: updateFields },
      { new: true, upsert: true }
    );

    // Record response events
    await logResponseEvent({
      userId: req.user._id,
      stage: 'onboarding_profile',
      field: 'partnerPriorities',
      value: validatedData.partnerPriorities,
      previousValue: previousProfile?.partnerPriorities,
    });
    await logResponseEvent({
      userId: req.user._id,
      stage: 'onboarding_profile',
      field: 'relationshipGoal',
      value: validatedData.relationshipGoal,
      previousValue: previousProfile?.relationshipGoal,
    });

    // Advance onboardingStep to 'interests' if final submit
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
    const catalogDocs = await InterestCatalog.find().sort({ category: 1, label: 1 });

    if (catalogDocs && catalogDocs.length > 0) {
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

    // Fallback directly to catalogData
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
 * Supports 1 to 13 categories, unlimited interests, optional top 3
 */
async function saveUserInterests(req, res, next) {
  try {
    const { categories, interests, top3, skip } = userInterestsSchema.parse(req.body);

    // If skip was clicked, allow skip to questions
    if (skip) {
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

    // Validation: at least 1 category and 1 interest
    if (!categories || categories.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please pick at least 1 category that inspires you.',
      });
    }

    if (!interests || interests.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please pick at least 1 interest in your chosen categories.',
      });
    }

    // Detect removed categories if user is editing later in Settings
    const previous = await UserInterests.findOne({ userId: req.user._id });
    if (previous && previous.categories && previous.categories.length > 0) {
      const removedCategories = previous.categories.filter((c) => !categories.includes(c));
      if (removedCategories.length > 0) {
        // Archive answers for removed categories (never delete)
        await InterestAnswers.updateMany(
          { userId: req.user._id, category: { $in: removedCategories } },
          { $set: { isArchived: true } }
        );
      }
    }

    const saved = await UserInterests.findOneAndUpdate(
      { userId: req.user._id },
      {
        $set: {
          categories,
          interests,
          top3: top3 || [],
          completedAt: new Date(),
        },
      },
      { new: true, upsert: true }
    );

    // Record response events
    await logResponseEvent({
      userId: req.user._id,
      stage: 'onboarding_interests',
      field: 'categories',
      value: categories,
      previousValue: previous?.categories || [],
    });
    await logResponseEvent({
      userId: req.user._id,
      stage: 'onboarding_interests',
      field: 'interests',
      value: interests,
      previousValue: previous?.interests || [],
    });
    if (top3 && top3.length > 0) {
      await logResponseEvent({
        userId: req.user._id,
        stage: 'onboarding_interests',
        field: 'top3',
        value: top3,
        previousValue: previous?.top3 || [],
      });
    }

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
 * Fetches 5 questions for EVERY category the user selected (1 to 13),
 * generated by Gemini with seeded fallback.
 */
async function getQuestions(req, res, next) {
  try {
    const userInterests = await UserInterests.findOne({ userId: req.user._id });
    const selectedCategories = (userInterests && userInterests.categories && userInterests.categories.length > 0)
      ? userInterests.categories
      : ['music']; // fallback default

    // Map user's picked interests by category
    const userInterestsMap = {};
    for (const slug of userInterests?.interests || []) {
      const [catKey, ...rest] = slug.split('.');
      if (catKey) {
        if (!userInterestsMap[catKey]) userInterestsMap[catKey] = [];
        const label = rest.join(' ').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
        userInterestsMap[catKey].push(label);
      }
    }

    // Fetch existing active answers
    const existingAnswers = await InterestAnswers.find({
      userId: req.user._id,
      category: { $in: selectedCategories },
      isArchived: false,
    });

    const answersByCategory = {};
    for (const ans of existingAnswers) {
      if (!answersByCategory[ans.category]) answersByCategory[ans.category] = [];
      answersByCategory[ans.category].push(ans.toJSON());
    }

    // Generate questions for all selected categories in parallel
    const categoriesQuestions = await Promise.all(
      selectedCategories.map(async (catKey) => {
        const catInfo = catalogData[catKey] || { label: catKey.replace(/_/g, ' ') };
        const specificInterests = userInterestsMap[catKey] || [];

        const generatedResult = await generateCategoryQuestions({
          userId: req.user._id,
          categoryKey: catKey,
          categoryLabel: catInfo.label,
          specificInterests,
        });

        const catAnswers = answersByCategory[catKey] || [];

        // Legacy answer summary for backward compatibility
        const q1Ans = catAnswers.find((a) => a.questionIndex === 0)?.selectedValue || '';
        const q2Ans = catAnswers.find((a) => a.questionIndex === 1)?.selectedValue || '';
        const q5Ans = catAnswers.find((a) => a.questionIndex === 4);
        const sharePref = q5Ans?.sharePreference || q5Ans?.selectedValue || '';

        return {
          category: catKey,
          categoryLabel: catInfo.label,
          questions: generatedResult.questions, // exactly 5 questions
          source: generatedResult.source,
          model: generatedResult.model,
          promptVersion: generatedResult.promptVersion,
          answers: catAnswers,
          // Legacy fields for backward compat
          answer: {
            q1: q1Ans,
            q2: q2Ans,
            sharePreference: sharePref,
          },
          sharedQuestion: generatedResult.questions[4] || {
            text: 'How much do you want a partner to share this interest?',
            options: [
              { label: 'Must have', value: 'must_have' },
              { label: 'Nice to have', value: 'nice_to_have' },
              { label: "Doesn't matter", value: 'doesnt_matter' },
            ],
          },
        };
      })
    );

    return res.status(200).json({
      success: true,
      selectedCategories,
      totalCategories: selectedCategories.length,
      categoriesQuestions,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/onboarding/answers
 * Saves 5 questions per category with ML snapshots and tags
 */
async function saveAnswer(req, res, next) {
  try {
    const parsed = answerSchema.parse(req.body);
    const { category, answers, q1, q2, sharePreference, skipped } = parsed;

    // Get user interests context for snapshot
    const userInterests = await UserInterests.findOne({ userId: req.user._id });
    const interestsContext = (userInterests?.interests || [])
      .filter((s) => s.startsWith(`${category}.`));

    // Get generated questions snapshot from cache or QuestionBank
    const cachedGen = await GeneratedQuestions.findOne({
      userId: req.user._id,
      category,
    });
    const questionsSnapshot = cachedGen?.questions || getSeededCategoryQuestions(category);

    const savedAnswers = [];

    if (answers && Array.isArray(answers) && answers.length > 0) {
      // Modern 5-question answer format
      for (const ans of answers) {
        const qSnap = questionsSnapshot[ans.questionIndex] || questionsSnapshot[0];
        const isQ5 = ans.questionIndex === 4;
        const normalizedSharePref = isQ5
          ? (ans.selectedValue === 'must_have' ? 'must-have' : ans.selectedValue === 'nice_to_have' ? 'nice-to-have' : ans.selectedValue === 'doesnt_matter' ? 'doesnt-matter' : ans.selectedValue)
          : '';

        const doc = await InterestAnswers.findOneAndUpdate(
          { userId: req.user._id, category, questionIndex: ans.questionIndex },
          {
            $set: {
              userId: req.user._id,
              category,
              questionIndex: ans.questionIndex,
              questionId: ans.questionId || qSnap.questionId || `${category}_q${ans.questionIndex + 1}`,
              dimension: ans.dimension || qSnap.dimension,
              questionText: qSnap.text,
              options: qSnap.options,
              selectedValue: ans.selectedValue || (ans.skipped ? 'skipped' : ''),
              interestsContext,
              generatedBy: cachedGen?.source || 'seed',
              model: cachedGen?.model || 'seed',
              promptVersion: cachedGen?.promptVersion || 'v1.0',
              sharePreference: normalizedSharePref,
              skipped: Boolean(ans.skipped || skipped),
              isArchived: false,
              answeredAt: new Date(),
            },
          },
          { new: true, upsert: true }
        );

        savedAnswers.push(doc);

        await logResponseEvent({
          userId: req.user._id,
          stage: 'onboarding_questions',
          field: `${category}:${ans.questionIndex}`,
          value: ans.selectedValue || 'skipped',
          source: ans.skipped ? 'skip' : 'user_input',
        });
      }
    } else {
      // Legacy format fallback: save q1, q2, sharePreference across question indexes 0, 1, 4
      const rawQ1 = typeof q1 === 'object' && q1 !== null ? (q1.value || q1.label || '') : String(q1 || '');
      const rawQ2 = typeof q2 === 'object' && q2 !== null ? (q2.value || q2.label || '') : String(q2 || '');
      const legacyItems = [
        { idx: 0, val: rawQ1 || (skipped ? 'skipped' : '') },
        { idx: 1, val: rawQ2 || (skipped ? 'skipped' : '') },
        { idx: 4, val: sharePreference || (skipped ? 'skipped' : '') },
      ];

      for (const item of legacyItems) {
        const qSnap = questionsSnapshot[item.idx] || questionsSnapshot[0];
        const isQ5 = item.idx === 4;
        const doc = await InterestAnswers.findOneAndUpdate(
          { userId: req.user._id, category, questionIndex: item.idx },
          {
            $set: {
              userId: req.user._id,
              category,
              questionIndex: item.idx,
              questionId: qSnap.questionId || `${category}_q${item.idx + 1}`,
              dimension: qSnap.dimension,
              questionText: qSnap.text,
              options: qSnap.options,
              selectedValue: item.val,
              interestsContext,
              generatedBy: cachedGen?.source || 'seed',
              model: cachedGen?.model || 'seed',
              promptVersion: cachedGen?.promptVersion || 'v1.0',
              sharePreference: isQ5 ? sharePreference : '',
              skipped: Boolean(skipped),
              isArchived: false,
              answeredAt: new Date(),
            },
          },
          { new: true, upsert: true }
        );
        savedAnswers.push(doc);
      }
    }

    // Check if user has answered or skipped all their selected categories
    const allSelectedCategories = userInterests?.categories || [category];
    const distinctCategoriesAnswered = await InterestAnswers.distinct('category', {
      userId: req.user._id,
      category: { $in: allSelectedCategories },
      isArchived: false,
    });

    let completedAll = false;
    if (distinctCategoriesAnswered.length >= allSelectedCategories.length) {
      completedAll = true;
      req.user.onboardingStep = 'done';
      req.user.profileCompleted = true;
      await req.user.save();
    }

    return res.status(200).json({
      success: true,
      message: 'Answer saved successfully.',
      answers: savedAnswers.map((a) => a.toJSON()),
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
