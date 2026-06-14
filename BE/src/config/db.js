const mongoose = require('mongoose');
const dns = require('dns');

// Use Google DNS to resolve MongoDB Atlas SRV records
// (fixes ECONNREFUSED on some local networks)
dns.setServers(['8.8.8.8', '8.8.4.4']);

const MONGO_OPTIONS = {
  serverSelectionTimeoutMS: 10_000,
  socketTimeoutMS: 45_000,
  connectTimeoutMS: 10_000,
  maxPoolSize: 10,
  minPoolSize: 1,
  heartbeatFrequencyMS: 10_000,
  retryWrites: true,
};

let listenersAttached = false;

const attachConnectionListeners = () => {
  if (listenersAttached) return;
  listenersAttached = true;

  const { connection } = mongoose;

  connection.on('connected', () => {
    console.log('MongoDB connection ready');
  });

  connection.on('disconnected', () => {
    console.warn('MongoDB disconnected — driver will retry automatically');
  });

  connection.on('reconnected', () => {
    console.log('MongoDB reconnected');
  });

  connection.on('error', (err) => {
    console.error('MongoDB connection error:', err.message);
  });
};

const isDbReady = () => mongoose.connection.readyState === 1;

const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    throw new Error('MONGO_URI is missing in .env file');
  }

  attachConnectionListeners();

  if (isDbReady()) {
    return mongoose.connection;
  }

  try {
    const conn = await mongoose.connect(mongoUri, MONGO_OPTIONS);
    console.log(`MongoDB connected successfully: ${conn.connection.host}`);
    console.log(`Database name: ${conn.connection.name}`);
    return conn.connection;
  } catch (error) {
    console.error('MongoDB connection failed:');
    console.error(error.message);
    throw error;
  }
};

const disconnectDB = async () => {
  if (!isDbReady()) return;
  await mongoose.connection.close(false);
  console.log('MongoDB connection closed');
};

module.exports = connectDB;
module.exports.connectDB = connectDB;
module.exports.disconnectDB = disconnectDB;
module.exports.isDbReady = isDbReady;
