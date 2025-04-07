const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const User = require('../models/User');

mongoose.connect(process.env.MONGO_URI);

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Método no permitido' });
  const { username, password } = req.body;
  try {
    if (!username || !password) return res.status(400).json({ message: 'Usuario y contraseña son obligatorios' });
    const existingUser = await User.findOne({ username });
    if (existingUser) return res.status(400).json({ message: 'El usuario ya existe' });
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const user = new User({ username, password: hashedPassword, role: 'player' });
    await user.save();
    res.status(201).json({ message: 'Usuario registrado', username, role: user.role });
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};