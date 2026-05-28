/**
 * Integration test: change password -> persist -> login with new password
 * Usage: node scripts/test-change-password.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const API = process.env.API_URL || 'http://localhost:5000';
const TEST_EMAIL = 'khachngoai@gmail.com';
const OLD_PASSWORD = 'TestPass123!';
const NEW_PASSWORD = 'ChangedPass456!';

async function request(path, options = {}) {
  const { headers: extraHeaders, ...rest } = options;
  const res = await fetch(`${API}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(extraHeaders || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function login(email, password) {
  return request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

async function run() {
  const results = [];

  // 1. Login with original password
  const login1 = await login(TEST_EMAIL, OLD_PASSWORD);
  results.push(['Login (mật khẩu cũ ban đầu)', login1.status === 200, login1.data.message]);

  if (login1.status !== 200) {
    console.log(JSON.stringify({ ok: false, results, error: 'Không login được với mật khẩu gốc. Chạy seed hoặc kiểm tra DB.' }, null, 2));
    process.exit(1);
  }

  const token = login1.data.token;

  // 2. Verify current password API
  const verify = await request('/api/user/verify-password', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ password: OLD_PASSWORD }),
  });
  results.push(['Verify-password (đúng)', verify.status === 200 && verify.data.valid === true, verify.data]);

  // 3. Change password
  const change = await request('/api/user/change-password', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ currentPassword: OLD_PASSWORD, newPassword: NEW_PASSWORD }),
  });
  results.push(['Change-password', change.status === 200, change.data.message]);

  // 4. Old password should fail login
  const loginOld = await login(TEST_EMAIL, OLD_PASSWORD);
  results.push(['Login sau đổi (mật khẩu cũ phải fail)', loginOld.status === 401, loginOld.data.message]);

  // 5. New password should succeed
  const loginNew = await login(TEST_EMAIL, NEW_PASSWORD);
  results.push(['Login sau đổi (mật khẩu mới)', loginNew.status === 200, loginNew.data.message]);

  // 6. Restore original password for other tests
  const token2 = loginNew.data.token;
  const restore = await request('/api/user/change-password', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token2}` },
    body: JSON.stringify({ currentPassword: NEW_PASSWORD, newPassword: OLD_PASSWORD }),
  });
  results.push(['Khôi phục mật khẩu gốc', restore.status === 200, restore.data.message]);

  const loginRestore = await login(TEST_EMAIL, OLD_PASSWORD);
  results.push(['Login sau khôi phục', loginRestore.status === 200, loginRestore.data.message]);

  const allPass = results.every(([, pass]) => pass);
  console.log(JSON.stringify({ ok: allPass, results: results.map(([name, pass, detail]) => ({ name, pass, detail })) }, null, 2));
  process.exit(allPass ? 0 : 1);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
