require('dotenv').config();
const mongoose = require('mongoose');
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const connectDB = require('./src/config/db');

(async () => {
    try {
        await connectDB();
        const db = mongoose.connection.db;
        const users = db.collection('users');
        const schoolmembers = db.collection('schoolmembers');

        console.log('=== TÌM KIẾM THEO EMAIL tuan07375 ===');
        const byEmail = await users.find({ email: /tuan07375/i }).toArray();
        console.log('Users khớp email:', byEmail.length);
        byEmail.forEach(u => console.log(' -', u.email, '| role:', u.role, '| name:', u.fullname, '| googleId:', u.googleId));

        console.log('\n=== TÌM KIẾM THEO TÊN Nhân/Nhan ===');
        const byName = await users.find({ fullname: /nhan|nhân/i }).toArray();
        console.log('Users khớp tên:', byName.length);
        byName.forEach(u => console.log(' -', u.email, '| role:', u.role, '| name:', u.fullname, '| googleId:', u.googleId));

        console.log('\n=== TẤT CẢ USERS TRONG DB ===');
        const allUsers = await users.find({}, { projection: { email: 1, role: 1, fullname: 1, googleId: 1 } }).toArray();
        allUsers.forEach(u => console.log(' -', u.email, '| role:', u.role, '| name:', u.fullname));

        console.log('\n=== SCHOOLMEMBERS WHITELIST ===');
        const allMembers = await schoolmembers.find({}).toArray();
        allMembers.forEach(m => console.log(' -', m.email, '| role:', m.role));

        process.exit(0);
    } catch(e) {
        console.error('Error:', e.message);
        process.exit(1);
    }
})();
