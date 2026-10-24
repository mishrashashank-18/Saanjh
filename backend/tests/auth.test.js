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

test.beforeEach(async () => {
  await User.deleteMany({});
});

test('1. GET /api/health should return 200 OK and database status', async () => {
  const res = await request(app).get('/api/health');
  assert.equal(res.status, 200);
  assert.equal(res.body.status, 'ok');
  assert.equal(res.body.service, 'saanjh-backend');
  assert.equal(res.body.database.connected, true);
});

test('2. POST /api/auth/signup - Success with valid data', async () => {
  const payload = {
    fullName: 'Aarohi Sharma',
    email: 'aarohi@example.com',
    password: 'Password123!',
    confirmPassword: 'Password123!',
    dateOfBirth: '2000-01-15',
    genderIdentity: 'woman',
    mobileNumber: '+919876543210',
    termsAccepted: true,
  };

  const res = await request(app).post('/api/auth/signup').send(payload);

  assert.equal(res.status, 201);
  assert.equal(res.body.success, true);
  assert.equal(res.body.email, 'aarohi@example.com');
  assert.equal(res.body.onboardingStep, 'verify');

  // Verify in MongoDB that password was hashed
  const userInDb = await User.findOne({ email: 'aarohi@example.com' }).select('+passwordHash');
  assert.ok(userInDb);
  assert.notEqual(userInDb.passwordHash, 'Password123!');
  assert.ok(userInDb.passwordHash.startsWith('$2')); // bcrypt hash
  assert.equal(userInDb.emailVerified, false);
});

test('3. POST /api/auth/signup - Validation rejects underage user (under 18)', async () => {
  const today = new Date();
  const underageDob = new Date(today.getFullYear() - 15, today.getMonth(), today.getDate())
    .toISOString()
    .split('T')[0];

  const payload = {
    fullName: 'Underage User',
    email: 'underage@example.com',
    password: 'Password123!',
    confirmPassword: 'Password123!',
    dateOfBirth: underageDob,
    genderIdentity: 'woman',
    termsAccepted: true,
  };

  const res = await request(app).post('/api/auth/signup').send(payload);
  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
  assert.match(res.body.message, /18 years old/i);
});

test('4. POST /api/auth/signup - Validation rejects mismatched passwords', async () => {
  const payload = {
    fullName: 'Test User',
    email: 'test@example.com',
    password: 'Password123!',
    confirmPassword: 'DifferentPassword123!',
    dateOfBirth: '1998-05-10',
    genderIdentity: 'man',
    termsAccepted: true,
  };

  const res = await request(app).post('/api/auth/signup').send(payload);
  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
  assert.match(res.body.message, /do not match/i);
});

test('5. POST /api/auth/signup - Duplicate verified email returns 409 Conflict', async () => {
  // Verified user in DB
  await User.create({
    fullName: 'First Account',
    email: 'duplicate@example.com',
    passwordHash: await User.hashPassword('Password123!'),
    dateOfBirth: new Date('1995-01-01'),
    genderIdentity: 'woman',
    emailVerified: true,
  });

  // Attempt to sign up again with identical email
  const duplicateRes = await request(app).post('/api/auth/signup').send({
    fullName: 'Second Account',
    email: 'DUPLICATE@example.com', // Test lowercase normalization
    password: 'AnotherPassword456!',
    confirmPassword: 'AnotherPassword456!',
    dateOfBirth: '1995-01-01',
    genderIdentity: 'woman',
    termsAccepted: true,
  });

  assert.equal(duplicateRes.status, 409);
  assert.equal(duplicateRes.body.success, false);
  assert.match(duplicateRes.body.message, /already exists/i);
});

test('6. POST /api/auth/login - Success with verified credentials', async () => {
  await User.create({
    fullName: 'Rohan Mehra',
    displayName: 'Rohan Mehra',
    email: 'rohan@example.com',
    passwordHash: await User.hashPassword('Password123!'),
    dateOfBirth: new Date('1998-01-01'),
    genderIdentity: 'man',
    emailVerified: true,
    onboardingStep: 'done',
  });

  const res = await request(app).post('/api/auth/login').send({
    email: 'rohan@example.com',
    password: 'Password123!',
  });

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.user.fullName, 'Rohan Mehra');
  assert.equal(res.body.user.passwordHash, undefined);
  assert.ok(res.body.accessToken);
});

test('7. POST /api/auth/login - Rejects incorrect password with generic error', async () => {
  await User.create({
    fullName: 'Rohan Mehra',
    email: 'rohan@example.com',
    passwordHash: await User.hashPassword('Password123!'),
    dateOfBirth: new Date('1998-01-01'),
    genderIdentity: 'man',
    emailVerified: true,
  });

  const res = await request(app).post('/api/auth/login').send({
    email: 'rohan@example.com',
    password: 'WrongPassword999!',
  });

  assert.equal(res.status, 401);
  assert.equal(res.body.success, false);
  assert.match(res.body.message, /invalid email address or password/i);
});

test('8. GET /api/auth/me - Authenticated request succeeds with Bearer token', async () => {
  await User.create({
    fullName: 'Meera Patel',
    email: 'meera@example.com',
    passwordHash: await User.hashPassword('Password123!'),
    dateOfBirth: new Date('1997-02-02'),
    genderIdentity: 'woman',
    emailVerified: true,
    onboardingStep: 'done',
  });

  const loginRes = await request(app).post('/api/auth/login').send({
    email: 'meera@example.com',
    password: 'Password123!',
  });

  const token = loginRes.body.accessToken;

  const meRes = await request(app)
    .get('/api/auth/me')
    .set('Authorization', `Bearer ${token}`);

  assert.equal(meRes.status, 200);
  assert.equal(meRes.body.success, true);
  assert.equal(meRes.body.user.email, 'meera@example.com');
});

test('9. GET /api/auth/me - Unauthenticated request fails with 401', async () => {
  const res = await request(app).get('/api/auth/me');
  assert.equal(res.status, 401);
  assert.equal(res.body.success, false);
});

test('10. PATCH /api/users/me - Update profile fields', async () => {
  await User.create({
    fullName: 'Aditya Roy',
    email: 'aditya@example.com',
    passwordHash: await User.hashPassword('Password123!'),
    dateOfBirth: new Date('1996-03-03'),
    genderIdentity: 'man',
    emailVerified: true,
    onboardingStep: 'done',
  });

  const loginRes = await request(app).post('/api/auth/login').send({
    email: 'aditya@example.com',
    password: 'Password123!',
  });

  const token = loginRes.body.accessToken;

  const updateRes = await request(app)
    .patch('/api/users/me')
    .set('Authorization', `Bearer ${token}`)
    .send({
      displayName: 'Adi',
      city: 'Delhi',
      bio: 'Loves music and literature.',
    });

  assert.equal(updateRes.status, 200);
  assert.equal(updateRes.body.success, true);
  assert.equal(updateRes.body.user.displayName, 'Adi');
  assert.equal(updateRes.body.user.city, 'Delhi');
  assert.equal(updateRes.body.user.bio, 'Loves music and literature.');
});

test('11. POST /api/auth/logout - Clears cookies', async () => {
  const res = await request(app).post('/api/auth/logout');
  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);

  const cookies = res.headers['set-cookie'];
  assert.ok(cookies);
});

test('12. POST /api/auth/google - Rejects request with missing token', async () => {
  const res = await request(app).post('/api/auth/google').send({});
  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
});

test('13. POST /api/auth/google - Gracefully handles unconfigured GOOGLE_CLIENT_ID', async () => {
  const res = await request(app).post('/api/auth/google').send({
    credential: 'mock_google_credential_token',
  });

  assert.equal(res.status, 503);
  assert.match(res.body.message, /Google Login is not configured/i);
});
