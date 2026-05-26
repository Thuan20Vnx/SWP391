require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');

const app = express();
const PORT = process.env.PORT || 5000;

// Configuration options for CORS
const corsOptions = {
  origin: 'http://localhost:5173', // Allow react app port
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

// API Root check
app.get('/', (req, res) => {
  res.send('SWP391 API Server is running...');
});

// Register API Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);

// Start Server
app.listen(PORT, () => {
  console.log(`Backend server running at http://localhost:${PORT}/`);
});
