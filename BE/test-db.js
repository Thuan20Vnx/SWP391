// Script test kết nối MongoDB - chạy: node test-db.js
require('dotenv').config();
const mongoose = require('mongoose');
const dns = require('dns');

// Use Google DNS to resolve MongoDB Atlas SRV records
dns.setServers(['8.8.8.8', '8.8.4.4']);

const uri = process.env.MONGO_URI;

console.log('=== MongoDB Connection Test ===');
console.log('MONGO_URI loaded:', uri ? 'YES' : 'NO');
console.log('URI preview:', uri ? uri.substring(0, 30) + '...' : 'N/A');
console.log('');

(async () => {
    try {
        console.log('Connecting to MongoDB...');
        const conn = await mongoose.connect(uri);
        
        console.log('✅ Connected successfully!');
        console.log('   Host:', conn.connection.host);
        console.log('   Database:', conn.connection.name);
        console.log('   State:', conn.connection.readyState === 1 ? 'Connected' : 'Not connected');
        
        // List collections to verify DB access
        const collections = await conn.connection.db.listCollections().toArray();
        console.log('   Collections:', collections.length > 0 
            ? collections.map(c => c.name).join(', ') 
            : '(empty database - no collections yet)');
        
        await mongoose.disconnect();
        console.log('\n✅ Test completed - Connection works!');
    } catch (error) {
        console.error('\n❌ Connection FAILED!');
        console.error('   Error:', error.message);
        
        if (error.message.includes('bad auth')) {
            console.error('\n💡 Fix: Username hoặc password sai.');
            console.error('   → Vào MongoDB Atlas > Database Access > kiểm tra user & password');
        }
        if (error.message.includes('ENOTFOUND') || error.message.includes('getaddrinfo')) {
            console.error('\n💡 Fix: Không tìm thấy server.');
            console.error('   → Kiểm tra lại cluster name trong connection string');
        }
        if (error.message.includes('IP') || error.message.includes('whitelist')) {
            console.error('\n💡 Fix: IP chưa được whitelist.');
            console.error('   → Vào MongoDB Atlas > Network Access > Add IP: 0.0.0.0/0');
        }
        process.exit(1);
    }
})();
