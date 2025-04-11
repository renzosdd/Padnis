const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Tournament = require('../models/Tournament');

mongoose.connect(process.env.MONGO_URI);

const authenticateToken = (req) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return null; // Permitir acceso sin token para espectadores
  return jwt.verify(token, process.env.JWT_SECRET);
};

module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ message: 'Método no permitido' });
  try {
    const user = authenticateToken(req);
    const { status } = req.query;
    const query = { draft: false };
    if (status) query.status = status;
    if (user && user.role !== 'admin') query.$or = [{ creator: user._id }, { status: { $ne: 'Pendiente' } }];
    const tournaments = await Tournament.find(query).populate('creator', 'username');
    res.status(200).json(tournaments);
  } catch (error) {
    console.error('Error fetching tournaments:', error);
    res.status(500).json({ message: 'Error al obtener torneos', error: error.message });
  }
};