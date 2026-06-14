require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const connectDB = require('../src/config/db');
const authService = require('../src/services/auth.service');
const LoginLockout = require('../src/models/LoginLockout');

const TEST_EMAIL = `lockout-test-${Date.now()}@example.com`;

const run = async () => {
  await connectDB();
  await LoginLockout.deleteOne({ email: TEST_EMAIL });

  const attempt = async (label) => {
    try {
      await authService.login({ email: TEST_EMAIL, password: 'WrongPass123!' });
      console.log(label, 'UNEXPECTED SUCCESS');
    } catch (err) {
      console.log(label, err.statusCode, err.message, err.extra || '');
    }
  };

  for (let i = 1; i <= 4; i += 1) await attempt(`fail-${i}`);
  await attempt('fail-5-should-lock-30s');

  const record = await LoginLockout.findOne({ email: TEST_EMAIL });
  console.log('After tier1:', {
    penaltyStage: record?.penaltyStage,
    lockedUntil: record?.lockedUntil,
    emailLocked: record?.emailLocked,
  });

  await LoginLockout.deleteOne({ email: TEST_EMAIL });
  process.exit(0);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
