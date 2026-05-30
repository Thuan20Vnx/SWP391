require('dotenv').config();
const mongoose = require('mongoose');
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const User = require('./src/models/User');
const SchoolMember = require('./src/models/SchoolMember');
const connectDB = require('./src/config/db');

(async () => {
    try {
        await connectDB();

        const email = 'kxnhan1507@gmail.com';
        const newRole = 'club_manager';

        // Cập nhật trong bảng users
        const userResult = await User.findOneAndUpdate(
            { email },
            { role: newRole },
            { new: true }
        );

        if (userResult) {
            console.log('✅ Đã cập nhật User:');
            console.log('   Email  :', userResult.email);
            console.log('   Role   :', userResult.role);
            console.log('   Name   :', userResult.fullname);
        } else {
            console.log('❌ Không tìm thấy user:', email);
        }

        // Upsert trong SchoolMember whitelist
        const memberResult = await SchoolMember.findOneAndUpdate(
            { email },
            { role: newRole },
            { new: true, upsert: true }
        );
        console.log('✅ Đã cập nhật SchoolMember whitelist:', memberResult.email, '->', memberResult.role);

        console.log('\n====================================');
        console.log('✅ Khưu Xuân Nhân giờ là club_manager!');
        console.log('====================================');

        process.exit(0);
    } catch (e) {
        console.error('❌ Error:', e.message);
        process.exit(1);
    }
})();
