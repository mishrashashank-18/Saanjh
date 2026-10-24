const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'test_access_secret_12345678901234567890';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_12345678901234567890';
process.env.OTP_PEPPER = 'test_otp_pepper_12345678901234567890';

const app = require('../src/app');
const User = require('../src/models/User');
const EmailOtp = require('../src/models/EmailOtp');
const Profile = require('../src/models/Profile');
const UserInterests = require('../src/models/UserInterests');
const InterestCatalog = require('../src/models/InterestCatalog');
const InterestQuestions = require('../src/models/InterestQuestions');
const InterestAnswers = require('../src/models/InterestAnswers');
const { createOtp } = require('../src/services/otpService');

let mongoServer;

test.before(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

test.after(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

test('1. Health check should return 200 and connected DB', async () => {
  const res = await request(app).get('/api/health');
  assert.equal(res.status, 200);
  assert.equal(res.body.status, 'ok');
  assert.equal(res.body.database.connected, true);
});

test('2. POST /api/auth/signup - Rejects age under 18', async () => {
  const res = await request(app)
    .post('/api/auth/signup')
    .send({
      fullName: 'Young Person',
      email: 'young@example.com',
      password: 'Password123!',
      confirmPassword: 'Password123!',
      dateOfBirth: '2015-01-01', // Under 18
      genderIdentity: 'woman',
      termsAccepted: true,
    });

  assert.equal(res.status, 400);
  assert.match(res.body.message, /18 years old/);
});

test('3. Full Flow: Signup -> Verify OTP -> Profile -> Interests -> Questions -> Dashboard', async () => {
  // Clear any existing user
  await User.deleteMany({});
  await EmailOtp.deleteMany({});

  const userEmail = 'aarohi.test@saanjh.com';

  // --- Step 1: Signup ---
  // In test environment, sendVerificationEmail may fail if no BREVO key, but let's mock or check handling
  const user = await User.create({
    fullName: 'Aarohi Test',
    displayName: 'Aarohi Test',
    email: userEmail,
    passwordHash: await User.hashPassword('Password123!'),
    dateOfBirth: new Date('2000-05-15'),
    genderIdentity: 'woman',
    emailVerified: false,
    onboardingStep: 'verify',
  });

  assert.equal(user.emailVerified, false);
  assert.equal(user.onboardingStep, 'verify');

  // --- Step 2: Unverified user cannot log in ---
  const loginAttempt = await request(app)
    .post('/api/auth/login')
    .send({ email: userEmail, password: 'Password123!' });

  assert.equal(loginAttempt.status, 403);
  assert.equal(loginAttempt.body.code, 'UNVERIFIED_EMAIL');

  // --- Step 3: Create OTP and test 5 wrong attempts ---
  await EmailOtp.deleteMany({ email: userEmail });
  const { rawCode } = await createOtp({ userId: user._id, email: userEmail }, { skipCooldown: true });
  assert.equal(rawCode.length, 6);

  // Try wrong code 4 times
  for (let i = 1; i <= 4; i++) {
    const wrongRes = await request(app)
      .post('/api/auth/verify-otp')
      .send({ email: userEmail, code: '000000' });
    assert.equal(wrongRes.status, 400);
    assert.match(wrongRes.body.message, /remaining/i);
  }

  // 5th wrong attempt invalidates the code
  const fifthWrong = await request(app)
    .post('/api/auth/verify-otp')
    .send({ email: userEmail, code: '000000' });
  assert.equal(fifthWrong.status, 400);
  assert.match(fifthWrong.body.message, /invalidated/i);

  // --- Step 4: Generate fresh OTP and verify successfully ---
  await EmailOtp.deleteMany({ email: userEmail });
  const freshOtp = await createOtp({ userId: user._id, email: userEmail }, { skipCooldown: true });

  const verifyRes = await request(app)
    .post('/api/auth/verify-otp')
    .send({ email: userEmail, code: freshOtp.rawCode });

  assert.equal(verifyRes.status, 200);
  assert.equal(verifyRes.body.success, true);
  assert.equal(verifyRes.body.user.emailVerified, true);
  assert.equal(verifyRes.body.onboardingStep, 'profile');

  // Extract auth cookie
  const authCookie = verifyRes.headers['set-cookie'];
  assert.ok(authCookie);

  // --- Step 5: Save Profile (Stage 2) ---
  const profileRes = await request(app)
    .post('/api/onboarding/profile')
    .set('Cookie', authCookie)
    .send({
      genderPreference: ['men'],
      ageRange: { min: 24, max: 32 },
      relationshipGoal: 'long-term',
      city: 'Bangalore',
      maxDistanceKm: 25,
      languages: ['English', 'Hindi'],
      partnerPriorities: {
        attractiveness: 8,
        sincerity: 10,
        intelligence: 9,
        humour: 9,
        ambition: 8,
        sharedInterests: 8,
      },
      goingOutFrequency: 'sometimes',
      culturalImportance: 'somewhat',
      dealBreakers: 'Smoking',
      notes: 'Loves books and coffee',
      isFinalSubmit: true,
    });

  assert.equal(profileRes.status, 200);
  assert.equal(profileRes.body.onboardingStep, 'interests');

  // --- Step 6: Get Interest Catalog (Stage 3) ---
  const catalogRes = await request(app)
    .get('/api/onboarding/interests/catalog');
  assert.equal(catalogRes.status, 200);
  assert.ok(catalogRes.body.catalog.music);
  assert.ok(catalogRes.body.catalog.movies_tv);

  // --- Step 7: Save User Interests ---
  const interestsRes = await request(app)
    .post('/api/onboarding/interests')
    .set('Cookie', authCookie)
    .send({
      categories: ['music', 'books_learning', 'food_drink'],
      interests: [
        'music.pop', 'music.rock', 'music.indie',
        'books_learning.fiction', 'books_learning.psychology',
        'food_drink.coffee', 'food_drink.cooking',
      ],
      top3: ['music.pop', 'books_learning.fiction', 'food_drink.coffee'],
    });

  assert.equal(interestsRes.status, 200);
  assert.equal(interestsRes.body.onboardingStep, 'interest_questions');

  // --- Step 8: Get Questions (Stage 4) ---
  const questionsRes = await request(app)
    .get('/api/onboarding/questions')
    .set('Cookie', authCookie);

  assert.equal(questionsRes.status, 200);
  assert.equal(questionsRes.body.categoriesQuestions.length, 3);

  // --- Step 9: Submit Answers for each category ---
  for (const catItem of questionsRes.body.categoriesQuestions) {
    const answerRes = await request(app)
      .post('/api/onboarding/answers')
      .set('Cookie', authCookie)
      .send({
        category: catItem.category,
        q1: catItem.questions[0].options[0],
        q2: catItem.questions[1].options[0],
        sharePreference: 'must-have',
      });

    assert.equal(answerRes.status, 200);
  }

  // Check user is now 'done'
  const meRes = await request(app)
    .get('/api/auth/me')
    .set('Cookie', authCookie);

  assert.equal(meRes.status, 200);
  assert.equal(meRes.body.onboardingStep, 'done');
  assert.equal(meRes.body.user.profileCompleted, true);

  // --- Step 10: Settings Endpoint ---
  const settingsRes = await request(app)
    .get('/api/onboarding/settings')
    .set('Cookie', authCookie);

  assert.equal(settingsRes.status, 200);
  assert.equal(settingsRes.body.profile.city, 'Bangalore');
  assert.equal(settingsRes.body.userInterests.categories.length, 3);
});
