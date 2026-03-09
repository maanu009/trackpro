const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/trackpro')
    .then(async () => {
        let auth = await User.findOne({ username: 'admin' });
        if (!auth) {
            auth = new User({ username: 'admin', password: 'admin123', role: 'admin' });
            await auth.save();
            console.log('Admin user seeded.');
        } else {
            console.log('Admin user already exists.');
        }
        process.exit(0);
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
