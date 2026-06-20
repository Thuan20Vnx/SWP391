const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const MONGO_URI = 'mongodb+srv://tranxuanthuan20_db_user:mwg01676446616@fevent.j6ind07.mongodb.net/FEventsDB?retryWrites=true&w=majority&appName=Fevent';

const accounts = [
  { email: 'ctsv@gmail.com',    role: 'ctsv',         fullname: 'CTSV Test' },
  { email: 'partner@gmail.com', role: 'partner',      fullname: 'Partner Test' },
  { email: 'club@gmail.com',    role: 'club_manager', fullname: 'Club Manager Test' },
  { email: 'icpdp@gmail.com',   role: 'icpdp',        fullname: 'ICPDP Test' },
  { email: 'admin@gmail.com',   role: 'admin',        fullname: 'Admin Test' },
  { email: 'guest@gmail.com',   role: 'guest',        fullname: 'Guest Test' },
  { email: 'student@gmail.com', role: 'student',      fullname: 'Student Test' },
];

const PASSWORD = 'Test@2026';

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  const User = require('../src/models/User');
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  for (const acc of accounts) {
    const exists = await User.findOne({ email: acc.email });
    if (exists) {
      console.log(`⚠️  Skip (already exists): ${acc.email}`);
      continue;
    }
    await User.create({
      email: acc.email,
      fullname: acc.fullname,
      role: acc.role,
      passwordHash,
      isVerified: true,
      loginMethod: 'local',
    });
    console.log(`✅ Created: ${acc.email} (${acc.role})`);
  }

  await mongoose.disconnect();
  console.log('Done.');
}

run().catch((err) => { console.error(err); process.exit(1); });
