// Script migrate dữ liệu từ users.json sang MongoDB
// Chạy: node migrate-to-mongo.js

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');
const dns = require('dns');

// Use Google DNS to resolve MongoDB Atlas SRV records
dns.setServers(['8.8.8.8', '8.8.4.4']);

const User = require('./src/models/User');

const usersFilePath = path.join(__dirname, 'data/users.json');

(async () => {
  try {
    console.log('=== Migration: users.json → MongoDB ===\n');
    console.log('Connecting to MongoDB...');
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`✅ Connected to: ${conn.connection.host} / ${conn.connection.name}\n`);

    // Read users.json
    let rawData = fs.readFileSync(usersFilePath, 'utf8');
    if (rawData.charCodeAt(0) === 0xFEFF) {
      rawData = rawData.slice(1);
    }
    const usersJson = JSON.parse(rawData);
    console.log(`📄 Found ${usersJson.length} users in users.json\n`);

    if (usersJson.length === 0) {
      console.log('⚠️  No users to migrate. Exiting.');
      await mongoose.disconnect();
      return;
    }

    // Optional: drop old users collection to start fresh with passwordHash field
    const existingCount = await User.countDocuments();
    if (existingCount > 0) {
      console.log(`⚠️  MongoDB already has ${existingCount} users. Dropping collection to re-migrate with passwordHash...`);
      await User.collection.drop().catch(() => {});
      console.log('   Collection dropped.\n');
    }

    // Migrate each user
    let migrated = 0;

    for (const u of usersJson) {
      // Hash the plaintext password with bcrypt
      const hashedPassword = await bcrypt.hash(u.password, 10);

      await User.create({
        fullname: u.fullname || '',
        email: (u.email || '').trim().toLowerCase(),
        phone: u.phone || '',
        passwordHash: hashedPassword,  // ← bcrypt hash, NOT plain text
        authProvider: 'local',
        course: u.course || 'K18',
        campus: u.campus || 'FPT University Da Nang',
        orientation: u.orientation || '',
        interests: u.interests || [],
        avatar: '',
        picture: u.picture || '',
        courseChanged: u.courseChanged || false
      });

      console.log(`   ✅ Migrated: ${u.email} (passwordHash: ${hashedPassword.substring(0, 20)}...)`);
      migrated++;
    }

    console.log(`\n=== Migration Complete ===`);
    console.log(`   ✅ Migrated: ${migrated} users`);
    console.log(`   📊 Total in DB: ${await User.countDocuments()} users`);

    // Show sample to verify passwordHash is bcrypt
    const sample = await User.findOne({ email: 'admin@fpt.edu.vn' });
    if (sample) {
      console.log(`\n🔒 Sample verification (admin@fpt.edu.vn):`);
      console.log(`   passwordHash: ${sample.passwordHash}`);
      console.log(`   Starts with $2b$: ${sample.passwordHash.startsWith('$2b$')}`);
      console.log(`   Has "password" field: ${sample.password !== undefined}`);
    }

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB. Done!');
  } catch (error) {
    console.error('\n❌ Migration FAILED!');
    console.error('   Error:', error.message);
    process.exit(1);
  }
})();
