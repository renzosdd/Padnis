const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');

mongoose.connect(process.env.MONGO_URI);

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Método no permitido' });
  const { username, password } = req.body;
  try {
    if (!username || !password) return res.status(400).json({ message: 'Usuario y contraseña son obligatorios' });
    const user = await User.findOne({ username });
    if (!user) return res.status(401).json({ message: 'Credenciales inválidas' });
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Credenciales inválidas' });
    const token = jwt.sign({ _id: user._id, username, role: user.role }, process.env.JWT_SECRET || 'secret_key', { expiresIn: '1h' });
    res.status(200).json({ token, username, role: user.role });
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};