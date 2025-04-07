const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');
mongoose.connect(process.env.MONGO_URI);

const authenticateToken = (req) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) throw new Error('Acceso denegado');
  return jwt.verify(token, process.env.JWT_SECRET || 'secret_key');
};

const isAdmin = (user) => {
  if (user.role !== 'admin') throw new Error('Requiere rol de admin');
};

module.exports = async (req, res) => {
  if (req.method !== 'PUT') return res.status(405).json({ message: 'Método no permitido' });
  const { username } = req.query; // Vercel usa query para parámetros dinámicos
  const { role } = req.body;
  try {
    const user = authenticateToken(req);
    isAdmin(user);
    if (!role || !['admin', 'coach', 'player'].includes(role)) {
      return res.status(400).json({ message: 'Rol inválido' });
    }
    const targetUser = await User.findOne({ username });
    if (!targetUser) return res.status(404).json({ message: 'Usuario no encontrado' });
    targetUser.role = role;
    await targetUser.save();
    res.status(200).json({ message: `Rol de ${username} actualizado a ${role}` });
  } catch (error) {
    res.status(error.message === 'Acceso denegado' ? 401 : error.message === 'Requiere rol de admin' ? 403 : 500).json({ message: error.message });
  }
};