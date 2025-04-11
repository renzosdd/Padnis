const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');

mongoose.connect(process.env.MONGO_URI);

const authenticateToken = (req) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) throw new Error('Acceso denegado');
  return jwt.verify(token, process.env.JWT_SECRET);
};

module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ message: 'Método no permitido' });
  try {
    const user = authenticateToken(req);
    const users = await User.find({}, 'username role');
    res.status(200).json(users);
  } catch (error) {
    res.status(error.message === 'Acceso denegado' ? 401 : 403).json({ message: error.message });
  }
};