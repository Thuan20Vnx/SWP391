require('dotenv').config();
const mongoose = require('mongoose');
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const db = mongoose.connection.db;
    
    const collections = await db.listCollections().toArray();
    console.log('Collections:', collections.map(c => c.name).join(', '));
    
    // Tìm user với email
    const targetEmail = 'Tuan07375@gmail.com';
    const users = db.collection('users');
    
    // Tìm case-insensitive
    const user = await users.findOne({ email: new RegExp(targetEmail, 'i') });
    
    if (user) {
      console.log('\n✅ Tìm thấy user:');
      console.log('   Email:', user.email);
      console.log('   Role:', user.role);
      console.log('   Name:', user.name || user.fullName || user.username || 'N/A');
      console.log('   Full data:', JSON.stringify(user, null, 2));
    } else {
      console.log('\n❌ Không tìm thấy user với email:', targetEmail);
      console.log('\n📋 Danh sách tất cả users (email + role):');
      const allUsers = await users.find({}, { projection: { email: 1, role: 1, name: 1 } }).toArray();
      allUsers.forEach(u => console.log(' -', u.email, '| role:', u.role));
    }
    
    await mongoose.disconnect();
  } catch (e) {
    console.error('Error:', e.message);
  }
})();
