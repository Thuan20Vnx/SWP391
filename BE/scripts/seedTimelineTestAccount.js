const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);

  const User = require('../src/models/User');
  const SchoolMember = require('../src/models/SchoolMember');
  const Club = require('../src/models/Club');

  const email = 'timeline.tester@example.com';

  await SchoolMember.findOneAndUpdate(
    { email },
    { email, role: 'club_manager', studentId: '' },
    { upsert: true }
  );

  const passwordHash = await bcrypt.hash('Test@2026', 10);
  let user = await User.findOne({ email });
  if (!user) {
    user = await User.create({
      fullname: 'Timeline Tester',
      email,
      role: 'club_manager',
      studentId: '',
      passwordHash,
      authProvider: 'local',
      campus: 'FPT University Da Nang',
    });
    console.log('Created new user:', email);
  } else {
    console.log('User already exists:', email);
  }

  let club = await Club.findOne({ name: 'Timeline Test Club' });
  if (!club) {
    club = await Club.create({
      slug: `timeline-test-club-${Date.now()}`,
      name: 'Timeline Test Club',
      category: 'Công nghệ',
      logoText: 'TTC',
      logoColor: '#7c3aed',
      description: 'Club tạo riêng để test luồng timeline.',
      organization: 'FPT University',
      status: 'active',
      joinMode: 'approval',
      president: 'Timeline Tester',
      email,
      managedBy: user._id,
    });
    console.log('Created new club:', club.name, club._id.toString());
  } else {
    console.log('Club already exists:', club._id.toString());
  }

  console.log('DONE. Login with:', email, '/ Test@2026');
  process.exit(0);
};

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
