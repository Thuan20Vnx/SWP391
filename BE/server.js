require('dotenv').config();

const http = require('http');
const { connectDB, disconnectDB } = require('./src/config/db');
const app = require('./src/app');
const { PORT } = require('./src/config/env');

let server;

const shutdown = async (signal) => {
  console.log(`\n${signal} received — shutting down gracefully...`);

  if (server) {
    await new Promise((resolve) => {
      server.close(resolve);
    });
    console.log('HTTP server closed');
  }

  try {
    await disconnectDB();
  } catch (err) {
    console.error('Error closing MongoDB:', err.message);
  }

  process.exit(0);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
});

const seedTestAccounts = async () => {
  try {
    const bcrypt = require('bcrypt');
    const User = require('./src/models/User');
    const accounts = [
      { email: 'ctsv@gmail.com',    role: 'ctsv',         fullname: 'CTSV Test' },
      { email: 'partner@gmail.com', role: 'partner',      fullname: 'Partner Test' },
      { email: 'club@gmail.com',    role: 'club_manager', fullname: 'Club Manager Test' },
      { email: 'clb@gmail.com',     role: 'club_manager', fullname: 'Club Manager Test' },
      { email: 'icpdp@gmail.com',   role: 'icpdp',        fullname: 'ICPDP Test' },
      { email: 'admin@gmail.com',   role: 'admin',        fullname: 'Admin Test' },
      { email: 'guest@gmail.com',   role: 'guest',        fullname: 'Guest Test' },
      { email: 'student@gmail.com', role: 'student',      fullname: 'Student Test' },
    ];
    const passwordHash = await bcrypt.hash('Test@2026', 10);
    for (const acc of accounts) {
      const exists = await User.findOne({ email: acc.email });
      if (!exists) {
        await User.create({ ...acc, passwordHash, isVerified: true, loginMethod: 'local' });
        console.log(`[Seed] Created: ${acc.email} (${acc.role})`);
      }
    }
  } catch (err) {
    console.error('[Seed] Error:', err.message);
  }
};

const startServer = async () => {
  await connectDB();
  await seedTestAccounts();

  // Cron: hết hạn đơn pending mỗi 5 phút
  const { expireStalePayments } = require('./src/services/payment.service');
  setInterval(() => {
    expireStalePayments().catch((err) => console.error('[Cron] expireStalePayments:', err.message));
  }, 5 * 60 * 1000);

  server = http.createServer(app);
  server.listen(PORT, () => {
    console.log(`Backend server running at http://localhost:${PORT}/`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use. Stop the other process before restarting.`);
      process.exit(1);
    }
    console.error('HTTP server error:', err);
  });
};

startServer().catch((err) => {
  console.error('Failed to start server:', err.message);
  process.exit(1);
});
