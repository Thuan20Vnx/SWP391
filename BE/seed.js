require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('./src/models/User');
const SchoolMember = require('./src/models/SchoolMember');
const connectDB = require('./src/config/db');

const seedData = async () => {
    try {
        await connectDB();

        // 1. CLEAR OLD DATA
        console.log('Clearing old test accounts and whitelists...');
        await User.deleteMany({ email: { $in: [
            'sinhvienDE180299@fpt.edu.vn', 
            'giangvien@fe.edu.vn', 
            'khachngoai@gmail.com',
            'sinhvienfpt@gmail.com',
            'giangvienfpt@gmail.com'
        ]}});
        await SchoolMember.deleteMany({}); // Clear all whitelists for clean test

        // 2. SEED WHITELIST (SchoolMember Directory)
        const whitelistedMembers = [
            {
                email: 'sinhvienfpt@gmail.com',
                role: 'student',
                studentId: 'DE180111'
            },
            {
                email: 'giangvienfpt@gmail.com',
                role: 'staff',
                studentId: ''
            }
        ];

        console.log('Inserting SchoolMember whitelist...');
        for (const m of whitelistedMembers) {
            await SchoolMember.create(m);
            console.log(`Whitelisted: ${m.email} -> Role: ${m.role}`);
        }

        // 3. CREATE USERS
        const defaultPassword = await bcrypt.hash('TestPass123!', 10);
        const usersToCreate = [
            {
                fullname: 'Nguyễn Văn Sinh Viên (Gmail)',
                email: 'sinhvienfpt@gmail.com',
                phone: '0901111111',
                passwordHash: defaultPassword,
                authProvider: 'local',
                campus: 'FPT University Da Nang',
            },
            {
                fullname: 'Trần Thị Giảng Viên (Gmail)',
                email: 'giangvienfpt@gmail.com',
                phone: '0902222222',
                passwordHash: defaultPassword,
                authProvider: 'local',
            },
            {
                fullname: 'Lê Văn Khách (Gmail)',
                email: 'khachngoai@gmail.com',
                phone: '0903333333',
                passwordHash: defaultPassword,
                authProvider: 'local',
            }
        ];

        console.log('Inserting test user accounts...');
        for (const u of usersToCreate) {
            const { role, studentId, course } = await User.detectRole(u.email);
            u.role = role;
            u.studentId = studentId;
            if (course) u.course = course;
            await User.create(u);
            console.log(`Created User: ${u.email} -> Detected Role: ${role}`);
        }

        console.log('====================================');
        console.log('✅ Đã tạo Danh bạ (Whitelist) & Tài khoản mẫu thành công!');
        console.log('Mật khẩu chung cho tất cả tài khoản là: TestPass123!');
        console.log('====================================');

        process.exit(0);
    } catch (error) {
        console.error('Seed error:', error);
        process.exit(1);
    }
};

seedData();
