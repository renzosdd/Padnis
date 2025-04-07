const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

// Importar modelos
const User = require('./models/User');
const Player = require('./models/Player');
const Tournament = require('./models/Tournament');

const app = express();

// Configurar strictQuery para evitar la advertencia de Mongoose
mongoose.set('strictQuery', false);

// Middleware
app.use(cors({
  origin: 'https://padnis-frontend.onrender.com', // Reemplaza con tu URL de frontend real
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Conexión a MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Middleware de autenticación
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Acceso denegado' });
  jwt.verify(token, process.env.JWT_SECRET || 'secret_key', (err, user) => {
    if (err) return res.status(403).json({ message: 'Token inválido' });
    req.user = user;
    next();
  });
};

const isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Requiere rol de admin' });
  next();
};

// Rutas de autenticación
app.post('/api/login', async (req, res) => {
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
    const token = jwt.sign({ _id: user._id, username, role: user.role }, process.env.JWT_SECRET || 'secret_key', { expiresIn: '1h' });
    console.log('Login successful:', { _id: user._id, username, role: user.role });
    res.json({ token, username, role: user.role });
  } catch (error) {
    console.error('Error in login:', error);
    res.status(500).json({ message: 'Error en el servidor al iniciar sesión', error: error.message });
  }
});

app.post('/api/register', async (req, res) => {
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
      role: 'player',
    });
    await user.save();
    console.log('User registered successfully:', { username, role: user.role });
    res.status(201).json({ message: 'Usuario registrado', username, role: user.role });
  } catch (error) {
    console.error('Error in register:', error);
    res.status(500).json({ message: 'Error en el servidor al registrar usuario', error: error.message });
  }
});

// Rutas de usuarios
app.get('/api/users', authenticateToken, async (req, res) => {
  try {
    const users = await User.find({}, 'username role');
    res.status(200).json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Error fetching users', error: error.message });
  }
});

app.put('/api/users/:username/role', authenticateToken, isAdmin, async (req, res) => {
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

// Rutas de jugadores
app.get('/api/players', async (req, res) => {
  try {
    const { showInactive } = req.query;
    let query = { active: 'Yes' };
    const token = req.headers['authorization']?.split(' ')[1];
    if (token) {
      const user = jwt.verify(token, process.env.JWT_SECRET || 'secret_key');
      if (user.role === 'admin' && showInactive === 'true') query = {};
    }
    const players = await Player.find(query).populate('user', 'username');
    res.status(200).json(players.map(player => ({
      playerId: player.playerId,
      firstName: player.firstName,
      lastName: player.lastName,
      email: player.email,
      phone: player.phone,
      photo: player.photo,
      dominantHand: player.dominantHand,
      racketBrand: player.racketBrand,
      user: player.user ? player.user.username : null,
      active: player.active,
      matches: player.matches,
    })));
  } catch (error) {
    res.status(error.message === 'Acceso denegado' ? 401 : 500).json({ message: error.message });
  }
});

app.post('/api/players', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'coach') {
      return res.status(403).json({ message: 'Requiere rol de admin o coach' });
    }
    const { firstName, lastName, email, phone, photo, dominantHand, racketBrand } = req.body;
    const lastPlayer = await Player.findOne({}, 'playerId', { sort: { playerId: -1 } });
    const playerId = lastPlayer && lastPlayer.playerId >= 0 ? lastPlayer.playerId + 1 : 1;
    const player = new Player({
      playerId,
      firstName,
      lastName,
      email: email || undefined,
      phone: phone || undefined,
      photo: photo || undefined,
      dominantHand: dominantHand || 'right',
      racketBrand: racketBrand || '',
      matches: [],
    });
    await player.save();
    res.status(201).json(player);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.put('/api/players/:playerId', authenticateToken, async (req, res) => {
  try {
    const { playerId } = req.params;
    const updates = req.body;
    const player = await Player.findOne({ playerId });
    if (!player) return res.status(404).json({ message: 'Jugador no encontrado' });
    Object.assign(player, updates);
    await player.save();
    res.json(player);
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar jugador', error: error.message });
  }
});

// Rutas de torneos
app.post('/api/tournaments', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'coach') {
      return res.status(403).json({ message: 'Requiere rol de admin o coach' });
    }
    const { type, sport, format, participants, groups, rounds, schedule, creator, draft } = req.body;
    const tournament = new Tournament({
      type,
      sport,
      format,
      participants,
      groups: type === 'RoundRobin' ? groups : [],
      rounds: type === 'Eliminatorio' ? rounds : [],
      schedule,
      creator,
      draft: draft || false,
    });
    await tournament.save();
    res.status(201).json(tournament);
  } catch (error) {
    console.error('Error creating tournament:', error);
    res.status(500).json({ message: 'Error al crear torneo', error: error.message });
  }
});

app.get('/api/tournaments', async (req, res) => {
  try {
    const token = req.headers['authorization']?.split(' ')[1];
    const user = token ? jwt.verify(token, process.env.JWT_SECRET || 'secret_key') : null;
    const { status } = req.query;
    const query = { draft: false };
    if (status) query.status = status;
    if (user && user.role !== 'admin') query.$or = [{ creator: user._id }, { status: { $ne: 'Pendiente' } }];
    const tournaments = await Tournament.find(query).populate('creator', 'username');
    res.json(tournaments);
  } catch (error) {
    console.error('Error fetching tournaments:', error);
    res.status(500).json({ message: 'Error al obtener torneos', error: error.message });
  }
});

app.get('/api/tournaments/:id', authenticateToken, async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id).populate('creator', 'username');
    if (!tournament) return res.status(404).json({ message: 'Torneo no encontrado' });
    if (req.user.role !== 'admin' && tournament.creator.toString() !== req.user._id && tournament.draft) {
      return res.status(403).json({ message: 'No autorizado' });
    }
    res.json(tournament);
  } catch (error) {
    console.error('Error fetching tournament:', error);
    res.status(500).json({ message: 'Error al obtener torneo', error: error.message });
  }
});

app.put('/api/tournaments/:id', authenticateToken, async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) return res.status(404).json({ message: 'Torneo no encontrado' });
    if (req.user.role !== 'admin' && tournament.creator.toString() !== req.user._id) {
      return res.status(403).json({ message: 'No autorizado' });
    }
    const { groups, rounds, schedule, result } = req.body;
    const updateData = {};
    if (groups) updateData.groups = groups;
    if (rounds) updateData.rounds = rounds;
    if (schedule) updateData.schedule = schedule;
    if (result) {
      if (tournament.status === 'Pendiente') updateData.status = 'En curso';
      if (tournament.type === 'RoundRobin') {
        tournament.groups.forEach(group => {
          group.matches.forEach(match => {
            if (match._id.toString() === result.matchId) match.result = result.result;
          });
        });
        updateData.groups = tournament.groups;
      } else {
        tournament.rounds.forEach(round => {
          round.matches.forEach(match => {
            if (match._id.toString() === result.matchId) match.result = result.result;
          });
        });
        updateData.rounds = tournament.rounds;
      }
    }
    const updatedTournament = await Tournament.findByIdAndUpdate(req.params.id, updateData, { new: true });
    res.json(updatedTournament);
  } catch (error) {
    console.error('Error updating tournament:', error);
    res.status(500).json({ message: 'Error al actualizar torneo', error: error.message });
  }
});

app.post('/api/tournaments/:id/finish', authenticateToken, async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) return res.status(404).json({ message: 'Torneo no encontrado' });
    if (req.user.role !== 'admin' && tournament.creator.toString() !== req.user._id) {
      return res.status(403).json({ message: 'No autorizado' });
    }
    const allMatchesCompleted = tournament.type === 'RoundRobin' 
      ? tournament.groups.every(group => group.matches.every(match => match.result.winner))
      : tournament.rounds.every(round => round.matches.every(match => match.result.winner));
    if (!allMatchesCompleted) return res.status(400).json({ message: 'Faltan resultados de partidos' });
    tournament.status = 'Finalizado';
    await tournament.save();
    res.json(tournament);
  } catch (error) {
    console.error('Error finishing tournament:', error);
    res.status(500).json({ message: 'Error al finalizar torneo', error: error.message });
  }
});

app.post('/api/tournaments/:id/resolve-tie', authenticateToken, async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) return res.status(404).json({ message: 'Torneo no encontrado' });
    if (req.user.role !== 'admin' && tournament.creator.toString() !== req.user._id) {
      return res.status(403).json({ message: 'No autorizado' });
    }
    const { groupId } = req.body;
    if (tournament.type !== 'RoundRobin') return res.status(400).json({ message: 'Solo para Round Robin' });
    const group = tournament.groups.find(g => g._id.toString() === groupId);
    if (!group) return res.status(404).json({ message: 'Grupo no encontrado' });
    const tiedPlayers = group.standings.filter(s => s.wins === group.standings[0].wins);
    const winner = tiedPlayers[Math.floor(Math.random() * tiedPlayers.length)];
    group.standings = [winner, ...group.standings.filter(s => s.playerId !== winner.playerId)];
    await tournament.save();
    res.json(tournament);
  } catch (error) {
    console.error('Error resolving tie:', error);
    res.status(500).json({ message: 'Error al resolver empate', error: error.message });
  }
});

// Iniciar el servidor
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});