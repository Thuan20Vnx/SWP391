require('dotenv').config();
const connectDB = require('./src/config/db');
const app = require('./src/app');
const { PORT } = require('./src/config/env');

const startServer = async () => {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`Backend server running at http://localhost:${PORT}/`);
  });
};

startServer();
