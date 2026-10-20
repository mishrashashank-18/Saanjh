const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'test_access_secret_12345678901234567890';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_12345678901234567890';

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
  assert.equal(res.body.user.fullName, 'Aarohi Sharma');
  assert.equal(res.body.user.email, 'aarohi@example.com');
  assert.equal(res.body.user.passwordHash, undefined); // Ensure passwordHash is NEVER leaked
  assert.ok(res.body.accessToken);

  // Check HTTP-only cookies
  const cookies = res.headers['set-cookie'];
  assert.ok(cookies);
  assert.ok(cookies.some((c) => c.includes('accessToken=')));
  assert.ok(cookies.some((c) => c.includes('refreshToken=')));

  // Verify in MongoDB that password was hashed
  const userInDb = await User.findOne({ email: 'aarohi@example.com' }).select('+passwordHash');
  assert.ok(userInDb);
  assert.notEqual(userInDb.passwordHash, 'Password123!');
  assert.ok(userInDb.passwordHash.startsWith('$2')); // bcrypt hash
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
    termsAccepted: true,
  };

  const res = await request(app).post('/api/auth/signup').send(payload);
  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
  assert.match(res.body.message, /do not match/i);
});

test('5. POST /api/auth/signup - Duplicate email returns 409 Conflict', async () => {
  const payload = {
    fullName: 'First Account',
    email: 'duplicate@example.com',
    password: 'Password123!',
    confirmPassword: 'Password123!',
    termsAccepted: true,
  };

  const firstRes = await request(app).post('/api/auth/signup').send(payload);
  assert.equal(firstRes.status, 201);

  // Attempt to sign up again with identical email
  const duplicateRes = await request(app).post('/api/auth/signup').send({
    fullName: 'Second Account',
    email: 'DUPLICATE@example.com', // Test lowercase normalization
    password: 'AnotherPassword456!',
    confirmPassword: 'AnotherPassword456!',
    termsAccepted: true,
  });

  assert.equal(duplicateRes.status, 409);
  assert.equal(duplicateRes.body.success, false);
  assert.match(duplicateRes.body.message, /already exists/i);
});

test('6. POST /api/auth/login - Success with correct credentials', async () => {
  // Create user
  await request(app).post('/api/auth/signup').send({
    fullName: 'Rohan Mehra',
    email: 'rohan@example.com',
    password: 'Password123!',
    confirmPassword: 'Password123!',
    termsAccepted: true,
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
  await request(app).post('/api/auth/signup').send({
    fullName: 'Rohan Mehra',
    email: 'rohan@example.com',
    password: 'Password123!',
    confirmPassword: 'Password123!',
    termsAccepted: true,
  });

  const res = await request(app).post('/api/auth/login').send({
    email: 'rohan@example.com',
    password: 'WrongPassword999!',
  });

  assert.equal(res.status, 401);
  assert.equal(res.body.success, false);
  assert.match(res.body.message, /Invalid email address or password/i);
});

test('8. GET /api/auth/me - Authenticated request succeeds with Bearer token', async () => {
  const signupRes = await request(app).post('/api/auth/signup').send({
    fullName: 'Meera Patel',
    email: 'meera@example.com',
    password: 'Password123!',
    confirmPassword: 'Password123!',
    termsAccepted: true,
  });

  const token = signupRes.body.accessToken;

  const res = await request(app)
    .get('/api/auth/me')
    .set('Authorization', `Bearer ${token}`);

  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.user.email, 'meera@example.com');
});

test('9. GET /api/auth/me - Unauthenticated request fails with 401', async () => {
  const res = await request(app).get('/api/auth/me');
  assert.equal(res.status, 401);
  assert.equal(res.body.success, false);
});

test('10. PATCH /api/users/me - Update profile fields', async () => {
  const signupRes = await request(app).post('/api/auth/signup').send({
    fullName: 'Aditya Sharma',
    email: 'aditya@example.com',
    password: 'Password123!',
    confirmPassword: 'Password123!',
    termsAccepted: true,
  });

  const token = signupRes.body.accessToken;

  const updateRes = await request(app)
    .patch('/api/users/me')
    .set('Authorization', `Bearer ${token}`)
    .send({
      city: 'Delhi, India',
      bio: 'Enjoys morning coffee and meaningful conversation.',
      occupation: 'Software Engineer',
      interests: ['Tech', 'Books', 'Travel'],
      role: 'admin', // Attempt unauthorized role escalation
    });

  assert.equal(updateRes.status, 200);
  assert.equal(updateRes.body.success, true);
  assert.equal(updateRes.body.user.city, 'Delhi, India');
  assert.equal(updateRes.body.user.bio, 'Enjoys morning coffee and meaningful conversation.');
  assert.equal(updateRes.body.user.role, 'user'); // Role escalation prevented!
});

test('11. POST /api/auth/logout - Clears cookies', async () => {
  const res = await request(app).post('/api/auth/logout');
  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);

  const cookies = res.headers['set-cookie'];
  assert.ok(cookies);
  assert.ok(cookies.some((c) => c.includes('accessToken=;')));
});

test('12. POST /api/auth/google - Rejects request with missing token', async () => {
  const res = await request(app).post('/api/auth/google').send({});
  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
  assert.match(res.body.message, /credential is required/i);
});

test('13. POST /api/auth/google - Gracefully handles unconfigured GOOGLE_CLIENT_ID', async () => {
  // Ensure GOOGLE_CLIENT_ID is unset in test env
  delete process.env.GOOGLE_CLIENT_ID;

  const res = await request(app).post('/api/auth/google').send({
    credential: 'fake_test_google_jwt_token',
  });

  assert.equal(res.status, 503);
  assert.equal(res.body.success, false);
  assert.match(res.body.message, /Google Login is not configured on the server yet/i);
});

