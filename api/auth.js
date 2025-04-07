const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  console.log('Login attempt:', { username, password });
  try {
    if (!username || !password) {
      console.log('Missing credentials');
      return res.status(400).json({ message: 'Usuario y contraseña son obligatorios' });
    }
    const user = await User.findOne({ username });
    if (!user) {
      console.log('User not found:', username);
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }
    console.log('User found:', { username: user.username, passwordHash: user.password });
    const isMatch = await bcrypt.compare(password, user.password);
    console.log('Password match:', isMatch);
    if (!isMatch) {
      console.log('Password mismatch for user:', username);
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }
    const token = jwt.sign({ _id: user._id, username, role: user.role }, 'secret_key', { expiresIn: '1h' });
    console.log('Login successful:', { _id: user._id, username, role: user.role });
    res.json({ token, username, role: user.role });
  } catch (error) {
    console.error('Error in login:', error);
    res.status(500).json({ message: 'Error en el servidor al iniciar sesión', error: error.message });
  }
});

router.post('/register', async (req, res) => {
  const { username, password } = req.body;
  console.log('Register attempt:', { username, password });
  try {
    if (!username || !password) {
      console.log('Missing credentials');
      return res.status(400).json({ message: 'Usuario y contraseña son obligatorios' });
    }
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      console.log('User already exists:', username);
      return res.status(400).json({ message: 'El usuario ya existe' });
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const user = new User({
      username,
      password: hashedPassword,
      role: 'player', // Rol por defecto
    });
    await user.save();
    console.log('User registered successfully:', { username, role: user.role });
    res.status(201).json({ message: 'Usuario registrado', username, role: user.role });
  } catch (error) {
    console.error('Error in register:', error);
    res.status(500).json({ message: 'Error en el servidor al registrar usuario', error: error.message });
  }
});

module.exports = router;