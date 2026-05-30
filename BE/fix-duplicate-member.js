require('dotenv').config();
const mongoose = require('mongoose');
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
const connectDB = require('./src/config/db');

(async () => {
    try {
        await connectDB();
        const db = mongoose.connection.db;
        const schoolmembers = db.collection('schoolmembers');

        // Xóa bản ghi cũ bị duplicate (viết hoa Tuan07375)
        const deleted = await schoolmembers.deleteMany({
            email: { $regex: /^tuan07375@gmail\.com$/i },
        });
        console.log(`🗑️  Đã xóa ${deleted.deletedCount} bản ghi cũ của tuan07375`);

        // Tạo lại 1 bản ghi chuẩn (lowercase)
        await schoolmembers.insertOne({
            email: 'tuan07375@gmail.com',
            role: 'club_manager',
            studentId: '',
            createdAt: new Date(),
            updatedAt: new Date()
        });
        console.log('✅ Đã tạo lại SchoolMember chuẩn: tuan07375@gmail.com -> club_manager');

        // Xác nhận
        console.log('\n=== SCHOOLMEMBERS SAU KHI FIX ===');
        const all = await schoolmembers.find({}).toArray();
        all.forEach(m => console.log(' -', m.email, '| role:', m.role));

        process.exit(0);
    } catch(e) {
        console.error('Error:', e.message);
        process.exit(1);
    }
})();
