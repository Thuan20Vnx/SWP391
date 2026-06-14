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

const startServer = async () => {
  await connectDB();

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
