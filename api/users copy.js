const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Acceso denegado' });
  jwt.verify(token, 'secret_key', (err, user) => {
    if (err) return res.status(403).json({ message: 'Token inválido' });
    req.user = user;
    next();
  });
};

const isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Requiere rol de admin' });
  next();
};

router.get('/', authenticateToken, async (req, res) => {
  try {
    const users = await User.find({}, 'username role');
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Error fetching users', error: error.message });
  }
});

router.put('/:username/role', authenticateToken, isAdmin, async (req, res) => {
  const { username } = req.params;
  const { role } = req.body;
  console.log('Attempting to update role for user:', { username, newRole: role });
  try {
    if (!role || !['admin', 'coach', 'player'].includes(role)) {
      return res.status(400).json({ message: 'Rol inválido' });
    }
    const user = await User.findOne({ username });
    if (!user) {
      console.log('User not found:', username);
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    user.role = role;
    await user.save();
    console.log('Role updated successfully:', { username, role });
    res.json({ message: `Rol de ${username} actualizado a ${role}` });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ message: 'Error al actualizar rol', error: error.message });
  }
});

module.exports = router;