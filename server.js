require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const athleteRoutes = require('./routes/athletes');
const eventRoutes = require('./routes/events');
const resultRoutes = require('./routes/results');
const settingsRoutes = require('./routes/settings');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname))); // Serve index.html

// Connect to MongoDB
mongoose.set('strictQuery', false);
mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/trackpro')
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.error('MongoDB Connection Error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/athletes', athleteRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/results', resultRoutes);
app.use('/api/settings', settingsRoutes);

// Fallback to index.html
app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
