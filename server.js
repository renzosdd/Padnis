const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const User = require('./models/User');
const Player = require('./models/Player');
const Tournament = require('./models/Tournament');

const app = express();

mongoose.set('strictQuery', false);

app.use(cors({
  origin: 'https://padnis-frontend.onrender.com',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }
};

app.get('/api/health', (req, res) => res.json({ status: 'Backend is running' }));
app.get('/api/db-check', async (req, res) => {
  try {
    await mongoose.connection.db.admin().ping();
    res.json({ status: 'MongoDB connected' });
  } catch (error) {
    console.error('MongoDB check failed:', error);
    res.status(500).json({ message: 'MongoDB connection failed', error: error.message });
  }
});

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Acceso denegado' });
  try {
    const user = jwt.verify(token, process.env.JWT_SECRET);
    req.user = user;
    next();
  } catch (err) {
    return res.status(403).json({ message: 'Token inválido' });
  }
};

const isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Requiere rol de admin' });
  next();
};

const isAdminOrCreator = (req, res, next) => {
  if (req.user.role !== 'admin' && req.tournament.creator.toString() !== req.user._id) {
    return res.status(403).json({ message: 'No autorizado' });
  }
  next();
};

// Rutas de autenticación (sin cambios)
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  console.log('Login attempt:', { username });
  try {
    if (!username || !password) return res.status(400).json({ message: 'Usuario y contraseña son obligatorios' });
    const user = await User.findOne({ username });
    if (!user) return res.status(401).json({ message: 'Credenciales inválidas' });
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Credenciales inválidas' });
    const token = jwt.sign({ _id: user._id, username, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token, username, role: user.role });
  } catch (error) {
    console.error('Error in login:', error.stack);
    res.status(500).json({ message: 'Error en el servidor al iniciar sesión', error: error.message });
  }
});

app.post('/api/register', async (req, res) => {
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
    console.error('Error in register:', error.stack);
    res.status(500).json({ message: 'Error en el servidor al registrar usuario', error: error.message });
  }
});

// Rutas de usuarios (sin cambios)
app.get('/api/users', authenticateToken, async (req, res) => {
  try {
    const users = await User.find({}, 'username role');
    res.status(200).json(users);
  } catch (error) {
    console.error('Error fetching users:', error.stack);
    res.status(500).json({ message: 'Error fetching users', error: error.message });
  }
});

app.put('/api/users/:username/role', authenticateToken, isAdmin, async (req, res) => {
  const { username } = req.params;
  const { role } = req.body;
  try {
    if (!['admin', 'coach', 'player'].includes(role)) return res.status(400).json({ message: 'Rol inválido' });
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });
    user.role = role;
    await user.save();
    res.json({ message: `Rol de ${username} actualizado a ${role}` });
  } catch (error) {
    console.error('Error updating user role:', error.stack);
    res.status(500).json({ message: 'Error al actualizar rol', error: error.message });
  }
});

// Rutas de jugadores (sin cambios)
app.get('/api/players', async (req, res) => {
  try {
    const { showInactive } = req.query;
    let query = { active: 'Yes' };
    const token = req.headers['authorization']?.split(' ')[1];
    if (token) {
      const user = jwt.verify(token, process.env.JWT_SECRET);
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
    console.error('Error fetching players:', error.stack);
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/players', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'coach') return res.status(403).json({ message: 'Requiere rol de admin o coach' });
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
    console.error('Error creating player:', error.stack);
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
    console.error('Error updating player:', error.stack);
    res.status(500).json({ message: 'Error al actualizar jugador', error: error.message });
  }
});

// Rutas de torneos (actualizadas)
app.post('/api/tournaments', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'coach') {
      return res.status(403).json({ message: 'Requiere rol de admin o coach' });
    }
    const { type, sport, format, participants, groups, rounds, schedule, draft } = req.body;

    // Validaciones
    if (!type || !['RoundRobin', 'Eliminatorio'].includes(type)) {
      return res.status(400).json({ message: 'Tipo de torneo inválido' });
    }
    if (!sport || !['Tenis', 'Pádel'].includes(sport)) {
      return res.status(400).json({ message: 'Deporte inválido' });
    }
    if (!format || !['Singles', 'Dobles'].includes(format.mode)) {
      return res.status(400).json({ message: 'Formato inválido' });
    }
    if (!participants || participants.length < (format.mode === 'Singles' ? 2 : 1)) {
      return res.status(400).json({ message: `Mínimo ${format.mode === 'Singles' ? 2 : 1} participantes requeridos` });
    }

    // Verificar participantes
    const playerIds = participants.flatMap(p => [p.player1, p.player2].filter(Boolean));
    const playersExist = await Player.find({ _id: { $in: playerIds } });
    if (playersExist.length !== playerIds.length) {
      return res.status(400).json({ message: 'Algunos jugadores no existen' });
    }

    const tournament = new Tournament({
      type,
      sport,
      format,
      participants,
      groups: type === 'RoundRobin' && groups ? groups : [],
      rounds: type === 'Eliminatorio' && rounds ? rounds : [],
      schedule: schedule || { group: null, matches: [] },
      creator: req.user._id,
      draft: draft !== undefined ? draft : true, // Por defecto borrador
      status: draft ? 'Pendiente' : 'En curso',
    });

    await tournament.save();
    console.log('Tournament created:', { type, sport, draft });
    res.status(201).json(tournament);
  } catch (error) {
    console.error('Error creating tournament:', error.stack);
    res.status(500).json({ message: 'Error al crear torneo', error: error.message });
  }
});

app.get('/api/tournaments', async (req, res) => {
  try {
    const token = req.headers['authorization']?.split(' ')[1];
    let user = null;
    if (token) {
      try {
        user = jwt.verify(token, process.env.JWT_SECRET);
      } catch (err) {
        console.log('Invalid token, proceeding as spectator');
      }
    }
    const { status } = req.query;
    const query = {};
    if (status) query.status = status;
    if (!user) query.draft = false; // Espectadores solo ven no borradores
    else if (user.role !== 'admin') {
      query.$or = [{ creator: user._id }, { draft: false }];
    }
    const tournaments = await Tournament.find(query).populate('creator', 'username').populate('participants.player1 participants.player2', 'firstName lastName');
    res.json(tournaments);
  } catch (error) {
    console.error('Error fetching tournaments:', error.stack);
    res.status(500).json({ message: 'Error al obtener torneos', error: error.message });
  }
});

app.get('/api/tournaments/:id', authenticateToken, async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id)
      .populate('creator', 'username')
      .populate('participants.player1 participants.player2', 'firstName lastName');
    if (!tournament) return res.status(404).json({ message: 'Torneo no encontrado' });
    if (tournament.draft && req.user.role !== 'admin' && tournament.creator.toString() !== req.user._id) {
      return res.status(403).json({ message: 'No autorizado' });
    }
    res.json(tournament);
  } catch (error) {
    console.error('Error fetching tournament:', error.stack);
    res.status(500).json({ message: 'Error al obtener torneo', error: error.message });
  }
});

app.put('/api/tournaments/:id/matches', authenticateToken, async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) return res.status(404).json({ message: 'Torneo no encontrado' });
    if (req.user.role !== 'admin' && tournament.creator.toString() !== req.user._id) {
      return res.status(403).json({ message: 'No autorizado' });
    }
    const { matchId, result } = req.body;
    if (!matchId || !result || !result.sets || typeof result.winner !== 'string') {
      return res.status(400).json({ message: 'Datos de partido inválidos' });
    }

    let updated = false;
    if (tournament.type === 'RoundRobin') {
      tournament.groups.forEach(group => {
        group.matches.forEach(match => {
          if (match._id.toString() === matchId) {
            match.result = result;
            updated = true;
          }
        });
      });
    } else {
      tournament.rounds.forEach(round => {
        round.matches.forEach(match => {
          if (match._id.toString() === matchId) {
            match.result = result;
            updated = true;
          }
        });
      });
    }

    if (!updated) return res.status(404).json({ message: 'Partido no encontrado' });
    if (tournament.status === 'Pendiente') tournament.status = 'En curso';
    await tournament.save();
    res.json(tournament);
  } catch (error) {
    console.error('Error updating tournament matches:', error.stack);
    res.status(500).json({ message: 'Error al actualizar partido', error: error.message });
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
    tournament.draft = false;
    await tournament.save();
    res.json(tournament);
  } catch (error) {
    console.error('Error finishing tournament:', error.stack);
    res.status(500).json({ message: 'Error al finalizar torneo', error: error.message });
  }
});

// Iniciar el servidor
connectDB().then(() => {
  const PORT = process.env.PORT || 5001;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});