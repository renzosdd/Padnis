const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcrypt');
const playerRoutes = require('./routes/players');
const tournamentRoutes = require('./routes/tournaments');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const User = require('./models/User');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Conexión a MongoDB
mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 30000 })
  .then(async () => {
    console.log('Connected to MongoDB successfully');
    const db = mongoose.connection.db;
    console.log('Database name:', db.databaseName);
    await initializeCollections(db);
    await initializeDefaultAdmin();
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

const initializeCollections = async (db) => {
  try {
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(col => col.name);
    const requiredCollections = ['users', 'players', 'tournaments'];

    for (const collection of requiredCollections) {
      if (!collectionNames.includes(collection)) {
        await db.createCollection(collection);
        console.log(`Created collection: ${collection}`);
      } else {
        console.log(`Collection ${collection} already exists`);
      }
    }
  } catch (error) {
    console.error('Error initializing collections:', error);
  }
};

const initializeDefaultAdmin = async () => {
  try {
    const adminExists = await User.findOne({ username: 'admin' });
    if (!adminExists) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('Padnis*1234#', salt);
      const adminUser = new User({
        username: 'admin',
        password: hashedPassword,
        role: 'admin',
      });
      await adminUser.save();
      console.log('Default admin user created: username=admin, password=Padnis*1234#');
    } else {
      console.log('Admin user already exists');
    }
  } catch (error) {
    console.error('Error creating default admin:', error);
  }
};

// Rutas
app.use('/api/players', playerRoutes);
app.use('/api/tournaments', tournamentRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));