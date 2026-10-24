process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'test_access_secret_12345678901234567890';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_12345678901234567890';
process.env.OTP_PEPPER = 'test_otp_pepper_12345678901234567890';

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { MongoMemoryServer } = require('mongodb-memory-server');

const app = require('../src/app');
const User = require('../src/models/User');
const Profile = require('../src/models/Profile');
const UserInterests = require('../src/models/UserInterests');
const InterestAnswers = require('../src/models/InterestAnswers');
const GeneratedQuestions = require('../src/models/GeneratedQuestions');
const ResponseEvents = require('../src/models/ResponseEvents');

let mongoServer;
let authCookie;
let testUser;
let authToken;

before(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  // Create a verified test user
  testUser = await User.create({
    fullName: 'Aditi Verma',
    email: 'aditi.verma@example.com',
    emailVerified: true,
    dateOfBirth: new Date('1998-05-15'),
    genderIdentity: 'woman',
    onboardingStep: 'interests',
  });

  authToken = jwt.sign(
    { userId: testUser._id.toString() },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: '15m' }
  );
  authCookie = `accessToken=${authToken}`;
});

after(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Gemini Questions, No Interest Limits, and ML Response Storage', () => {
  test('1. Allows 1 single category and 1 single interest (no 3 category or 5 interest minimum)', async () => {
    const res = await request(app)
      .post('/api/onboarding/interests')
      .set('Cookie', authCookie)
      .send({
        categories: ['music'],
        interests: ['music.indie_rock'],
        top3: [],
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.userInterests.categories.length, 1);
    assert.equal(res.body.userInterests.interests.length, 1);
  });

  test('2. Allows all 13 categories and >15 interests (no maximum limits)', async () => {
    const all13Cats = [
      'music', 'movies_tv', 'books_learning', 'sports_fitness',
      'outdoor_adventure', 'food_drink', 'creative', 'social_leisure',
      'travel', 'lifestyle_wellness', 'intellectual', 'culture', 'digital'
    ];
    const manyInterests = all13Cats.map((c) => `${c}.item1`).concat([
      'music.item2', 'music.item3', 'travel.item2', 'creative.item2', 'digital.item2'
    ]);

    const res = await request(app)
      .post('/api/onboarding/interests')
      .set('Cookie', authCookie)
      .send({
        categories: all13Cats,
        interests: manyInterests,
        top3: ['music.item1', 'travel.item1', 'creative.item1'],
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.userInterests.categories.length, 13);
    assert.equal(res.body.userInterests.interests.length, 18);
  });

  test('3. GET /api/onboarding/questions returns 5 questions for every selected category', async () => {
    await request(app)
      .post('/api/onboarding/interests')
      .set('Cookie', authCookie)
      .send({
        categories: ['music', 'travel'],
        interests: ['music.indie_rock', 'travel.road_trips'],
        top3: [],
      });

    const res = await request(app)
      .get('/api/onboarding/questions')
      .set('Cookie', authCookie);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.totalCategories, 2);
    assert.equal(res.body.categoriesQuestions.length, 2);

    for (const catData of res.body.categoriesQuestions) {
      assert.equal(catData.questions.length, 5, 'Every category must have exactly 5 questions');
      const q5 = catData.questions[4];
      assert.equal(q5.dimension, 'shared_activity');
      assert.match(q5.text, /share this interest/i);
      assert.equal(q5.options.length, 3);
    }
  });

  test('4. POST /api/onboarding/answers saves answers with ML dimensions, snapshots, and event log', async () => {
    const qRes = await request(app)
      .get('/api/onboarding/questions')
      .set('Cookie', authCookie);

    const musicCat = qRes.body.categoriesQuestions.find((c) => c.category === 'music');
    const answersPayload = musicCat.questions.map((q, idx) => ({
      questionIndex: idx,
      questionId: q.questionId || `music_q${idx + 1}`,
      dimension: q.dimension || 'intensity',
      selectedValue: typeof q.options[0] === 'object' ? q.options[0].value : q.options[0],
      skipped: false,
    }));

    const saveRes = await request(app)
      .post('/api/onboarding/answers')
      .set('Cookie', authCookie)
      .send({
        category: 'music',
        answers: answersPayload,
        sharePreference: 'nice-to-have',
      });

    assert.equal(saveRes.status, 200);
    assert.equal(saveRes.body.success, true);

    // Verify stored documents in MongoDB
    const docs = await InterestAnswers.find({ userId: testUser._id, category: 'music' });
    assert.equal(docs.length, 5, '5 question answer documents should be stored');
    assert.ok(docs[0].dimension, 'Should have ML dimension');
    assert.ok(docs[0].questionText, 'Should have question snapshot');
    assert.ok(docs[0].options.length > 0, 'Should have options snapshot');

    // Verify responseEvents logged
    const events = await ResponseEvents.find({ userId: testUser._id, stage: 'onboarding_questions' });
    assert.ok(events.length >= 5, 'Should record response events for questions');
  });

  test('5. GET /api/users/me/data (and /me/data) downloads complete user data JSON', async () => {
    const res = await request(app)
      .get('/api/users/me/data')
      .set('Cookie', authCookie);

    assert.equal(res.status, 200);
    assert.ok(res.body.user);
    assert.ok(res.body.interests);
    assert.ok(Array.isArray(res.body.questionAnswers));
    assert.ok(Array.isArray(res.body.responseEvents));

    // Test alias route /me/data
    const aliasRes = await request(app)
      .get('/me/data')
      .set('Cookie', authCookie);
    assert.equal(aliasRes.status, 200);
  });

  test('6. DELETE /api/users/me deletes the account and all associated documents', async () => {
    const delRes = await request(app)
      .delete('/api/users/me')
      .set('Cookie', authCookie);

    assert.equal(delRes.status, 200);
    assert.equal(delRes.body.success, true);

    // Confirm all collections cleared for this user
    const userFound = await User.findById(testUser._id);
    assert.equal(userFound, null);
    const answersFound = await InterestAnswers.find({ userId: testUser._id });
    assert.equal(answersFound.length, 0);
    const interestsFound = await UserInterests.find({ userId: testUser._id });
    assert.equal(interestsFound.length, 0);
    const eventsFound = await ResponseEvents.find({ userId: testUser._id });
    assert.equal(eventsFound.length, 0);
  });
});
