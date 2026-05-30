require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const dns = require('dns');

dns.setServers(['8.8.8.8', '8.8.4.4']);

const User = require('./src/models/User');
const SchoolMember = require('./src/models/SchoolMember');
const connectDB = require('./src/config/db');

const seedClubManager = async () => {
    try {
        await connectDB();
        console.log('✅ Connected to database\n');

        const email = 'tuan07375@gmail.com';
        const role = 'club_manager';

        // 1. Upsert vào SchoolMember (whitelist)
        const existingMember = await SchoolMember.findOne({ email });
        if (existingMember) {
            await SchoolMember.updateOne({ email }, { role });
            console.log(`🔄 Updated SchoolMember: ${email} -> role: ${role}`);
        } else {
            await SchoolMember.create({ email, role, studentId: '' });
            console.log(`✅ Added to SchoolMember whitelist: ${email} -> role: ${role}`);
        }

        // 2. Upsert User account
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            await User.updateOne({ email }, { role });
            console.log(`🔄 Updated User role: ${email} -> role: ${role}`);
        } else {
            const passwordHash = await bcrypt.hash('TestPass123!', 10);
            await User.create({
                fullname: 'Nguyễn Văn Tuân',
                email,
                role,
                studentId: '',
                passwordHash,
                authProvider: 'local',
                campus: 'FPT University Da Nang'
            });
            console.log(`✅ Created new User: ${email} -> role: ${role}`);
        }

        // 3. Xác nhận lại
        const verify = await User.findOne({ email });
        console.log('\n====================================');
        console.log('✅ Kết quả xác nhận:');
        console.log(`   Email : ${verify.email}`);
        console.log(`   Role  : ${verify.role}`);
        console.log(`   Name  : ${verify.fullname}`);
        console.log('====================================');
        console.log('Mật khẩu: TestPass123!');

        process.exit(0);
    } catch (error) {
        console.error('❌ Seed error:', error.message);
        process.exit(1);
    }
};

seedClubManager();
