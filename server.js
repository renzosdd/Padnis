const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const { body, param, validationResult } = require('express-validator');
const winston = require('winston');

const User = require('./models/User');
const Player = require('./models/Player');
const Tournament = require('./models/Tournament');
const Club = require('./models/Club');

const app = express();

mongoose.set('strictQuery', false);

// Configure Winston logger
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

// Validate environment variables
const requiredEnvVars = ['MONGO_URI', 'JWT_SECRET', 'JWT_EXPIRES_IN'];
const missingEnvVars = requiredEnvVars.filter((envVar) => !process.env[envVar]);
if (missingEnvVars.length > 0) {
  logger.error('Missing required environment variables:', missingEnvVars);
  process.exit(1);
}

// Middleware
app.use(helmet());
app.use(cors({
  origin: 'https://padnis-frontend.onrender.com',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

// Rate limiting for login endpoint
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per window
  message: 'Demasiados intentos de inicio de sesión. Intenta de nuevo en 15 minutos.',
});
app.use('/api/login', loginLimiter);

// Connection to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    logger.info('Connected to MongoDB:', { dbName: mongoose.connection.db.databaseName });
  } catch (err) {
    logger.error('MongoDB connection error:', { message: err.message, stack: err.stack });
    process.exit(1);
  }
};

// Utility Functions
const validateObjectId = (id) => mongoose.isValidObjectId(id);

const checkPlayersExist = async (playerIds) => {
  if (!playerIds.length) return [];
  const players = await Player.find({ _id: { $in: playerIds } }).lean();
  const existingIds = new Set(players.map((p) => p._id.toString()));
  return playerIds.filter((id) => !existingIds.has(id));
};

// Authentication Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Acceso denegado' });
  try {
    const user = jwt.verify(token, process.env.JWT_SECRET);
    req.user = user;
    next();
  } catch (err) {
    logger.error('Token verification failed:', { message: err.message, stack: err.stack });
    return res.status(403).json({ message: 'Token inválido' });
  }
};

const isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Requiere rol de admin' });
  next();
};

const isAdminOrCoach = (req, res, next) => {
  if (req.user.role !== 'admin' && req.user.role !== 'coach') {
    return res.status(403).json({ message: 'Requiere rol de admin o coach' });
  }
  next();
};

// Validation Middleware
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: 'Errores de validación', errors: errors.array() });
  }
  next();
};

// Diagnostic Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'Backend is running', timestamp: new Date() });
});

app.get('/api/db-check', async (req, res) => {
  try {
    await mongoose.connection.db.admin().ping();
    res.json({ status: 'MongoDB connected', dbName: mongoose.connection.db.databaseName });
  } catch (error) {
    logger.error('MongoDB check failed:', { message: error.message, stack: error.stack });
    res.status(500).json({ message: 'MongoDB connection failed', error: error.message });
  }
});

// Authentication Routes
app.post('/api/login', [
  body('username').notEmpty().withMessage('Usuario es obligatorio'),
  body('password').notEmpty().withMessage('Contraseña es obligatoria'),
  validateRequest,
], async (req, res) => {
  const { username, password } = req.body;
  logger.debug('Login attempt:', { username });
  try {
    const user = await User.findOne({ username }).lean();
    if (!user) {
      logger.info('User not found:', { username });
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      logger.info('Password mismatch for user:', { username });
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }
    const token = jwt.sign({ _id: user._id, username, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '1h',
    });
    logger.info('Login successful:', { username, role: user.role });
    res.json({ token, username, role: user.role });
  } catch (error) {
    logger.error('Error in login:', { message: error.message, stack: error.stack });
    res.status(500).json({ message: 'Error en el servidor al iniciar sesión', error: error.message });
  }
});

app.post('/api/register', [
  body('username').notEmpty().withMessage('Usuario es obligatorio'),
  body('password').notEmpty().withMessage('Contraseña es obligatoria'),
  validateRequest,
], async (req, res) => {
  const { username, password } = req.body;
  try {
    const existingUser = await User.findOne({ username }).lean();
    if (existingUser) return res.status(400).json({ message: 'El usuario ya existe' });
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const user = new User({ username, password: hashedPassword, role: 'player' });
    await user.save();
    res.status(201).json({ message: 'Usuario registrado', username, role: user.role });
  } catch (error) {
    logger.error('Error in register:', { message: error.message, stack: error.stack });
    res.status(500).json({ message: 'Error en el servidor al registrar usuario', error: error.message });
  }
});

// User Routes
app.get('/api/users', authenticateToken, async (req, res) => {
  try {
    const users = await User.find({}, 'username role').lean();
    res.status(200).json(users);
  } catch (error) {
    logger.error('Error fetching users:', { message: error.message, stack: error.stack });
    res.status(500).json({ message: 'Error al obtener usuarios', error: error.message });
  }
});

app.put('/api/users/:username/role', authenticateToken, isAdmin, [
  body('role').isIn(['admin', 'coach', 'player']).withMessage('Rol inválido'),
  validateRequest,
], async (req, res) => {
  const { username } = req.params;
  const { role } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });
    user.role = role;
    await user.save();
    res.json({ message: `Rol de ${username} actualizado a ${role}` });
  } catch (error) {
    logger.error('Error updating user role:', { message: error.message, stack: error.stack });
    res.status(500).json({ message: 'Error al actualizar rol', error: error.message });
  }
});

// Club Routes
app.post('/api/clubs', authenticateToken, isAdmin, [
  body('name').notEmpty().withMessage('El nombre del club es obligatorio'),
  validateRequest,
], async (req, res) => {
  try {
    const { name, address, phone } = req.body;
    const club = new Club({
      name,
      address: address || '',
      phone: phone || '',
    });
    await club.save();
    res.status(201).json(club);
  } catch (error) {
    logger.error('Error creating club:', { message: error.message, stack: error.stack });
    res.status(500).json({ message: 'Error al crear club', error: error.message });
  }
});

app.get('/api/clubs', async (req, res) => {
  try {
    const clubs = await Club.find().lean();
    res.status(200).json(clubs);
  } catch (error) {
    logger.error('Error fetching clubs:', { message: error.message, stack: error.stack });
    res.status(500).json({ message: 'Error al obtener clubes', error: error.message });
  }
});

app.put('/api/clubs/:id', authenticateToken, isAdmin, [
  param('id').custom(validateObjectId).withMessage('ID de club inválido'),
  body('name').notEmpty().withMessage('El nombre del club es obligatorio'),
  validateRequest,
], async (req, res) => {
  try {
    const { id } = req.params;
    const { name, address, phone } = req.body;
    const club = await Club.findById(id);
    if (!club) return res.status(404).json({ message: 'Club no encontrado' });
    club.name = name;
    club.address = address || '';
    club.phone = phone || '';
    await club.save();
    res.json(club);
  } catch (error) {
    logger.error('Error updating club:', { message: error.message, stack: error.stack });
    res.status(500).json({ message: 'Error al actualizar club', error: error.message });
  }
});

app.delete('/api/clubs/:id', authenticateToken, isAdmin, [
  param('id').custom(validateObjectId).withMessage('ID de club inválido'),
  validateRequest,
], async (req, res) => {
  try {
    const { id } = req.params;
    const club = await Club.findById(id);
    if (!club) return res.status(404).json({ message: 'Club no encontrado' });
    const tournaments = await Tournament.find({ club: id }).lean();
    if (tournaments.length > 0) {
      return res.status(400).json({ message: 'No se puede eliminar el club porque está asociado a torneos' });
    }
    await club.deleteOne();
    res.json({ message: 'Club eliminado correctamente' });
  } catch (error) {
    logger.error('Error deleting club:', { message: error.message, stack: error.stack });
    res.status(500).json({ message: 'Error al eliminar club', error: error.message });
  }
});

// Player Routes
app.get('/api/players', async (req, res) => {
  try {
    const { showInactive } = req.query;
    let query = { active: 'Yes' };
    const token = req.headers['authorization']?.split(' ')[1];
    if (token) {
      const user = jwt.verify(token, process.env.JWT_SECRET);
      if (user.role === 'admin' && showInactive === 'true') query = {};
    }
    const players = await Player.find(query).populate('user', 'username').lean();
    res.status(200).json(players.map((player) => ({
      _id: String(player._id),
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
      achievements: player.achievements,
    })));
  } catch (error) {
    logger.error('Error fetching players:', { message: error.message, stack: error.stack });
    res.status(500).json({ message: 'Error al obtener jugadores', error: error.message });
  }
});

app.post('/api/players', authenticateToken, isAdminOrCoach, [
  body('firstName').notEmpty().withMessage('El nombre es obligatorio'),
  body('lastName').notEmpty().withMessage('El apellido es obligatorio'),
  validateRequest,
], async (req, res) => {
  try {
    const { firstName, lastName, email, phone, photo, dominantHand, racketBrand } = req.body;
    const player = new Player({
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
    res.status(201).json({ ...player.toObject(), _id: String(player._id) });
  } catch (error) {
    logger.error('Error creating player:', { message: error.message, stack: error.stack });
    res.status(500).json({ message: 'Error al crear jugador', error: error.message });
  }
});

app.put('/api/players/:playerId', authenticateToken, isAdminOrCoach, [
  param('playerId').isInt().withMessage('ID de jugador inválido'),
  validateRequest,
], async (req, res) => {
  try {
    const { playerId } = req.params;
    const updates = req.body;
    const player = await Player.findOne({ playerId });
    if (!player) return res.status(404).json({ message: 'Jugador no encontrado' });
    Object.assign(player, updates);
    await player.save();
    res.json({ ...player.toObject(), _id: String(player._id) });
  } catch (error) {
    logger.error('Error updating player:', { message: error.message, stack: error.stack });
    res.status(500).json({ message: 'Error al actualizar jugador', error: error.message });
  }
});

// Tournament Routes
app.post('/api/tournaments', authenticateToken, isAdminOrCoach, [
  body('name').notEmpty().withMessage('El nombre del torneo es obligatorio'),
  body('type').isIn(['RoundRobin', 'Eliminatorio']).withMessage('Tipo de torneo inválido'),
  body('sport').isIn(['Tenis', 'Pádel']).withMessage('Deporte inválido'),
  body('category').notEmpty().withMessage('La categoría es obligatoria'),
  body('format.mode').isIn(['Singles', 'Dobles']).withMessage('Formato inválido'),
  body('participants').isArray({ min: 1 }).withMessage('Debe haber al menos un participante'),
  validateRequest,
], async (req, res) => {
  try {
    const { name, clubId, type, sport, category, format, participants, groups, rounds, schedule, draft, playersPerGroupToAdvance } = req.body;
    logger.debug('Creating tournament:', { name, type, sport, category });

    if (sport === 'Tenis' && !['A', 'B', 'C', 'D', 'E'].includes(category)) {
      return res.status(400).json({ message: 'Categoría inválida para Tenis' });
    }
    if (sport === 'Pádel' && !['Séptima', 'Sexta', 'Quinta', 'Cuarta', 'Tercera', 'Segunda', 'Primera'].includes(category)) {
      return res.status(400).json({ message: 'Categoría inválida para Pádel' });
    }
    if (participants.length < (format.mode === 'Singles' ? 2 : 1)) {
      return res.status(400).json({ message: `Mínimo ${format.mode === 'Singles' ? 2 : 1} participantes requeridos` });
    }

    if (clubId && !validateObjectId(clubId)) {
      return res.status(400).json({ message: 'ID de club inválido' });
    }
    if (clubId) {
      const club = await Club.findById(clubId).lean();
      if (!club) return res.status(400).json({ message: 'Club no encontrado' });
    }

    const playerIds = participants.flatMap((p) => {
      const ids = [];
      if (p.player1) {
        const id = typeof p.player1 === 'object' ? p.player1._id?.toString() || p.player1.$oid : p.player1.toString();
        if (validateObjectId(id)) ids.push(id);
      }
      if (p.player2 && format.mode === 'Dobles') {
        const id = typeof p.player2 === 'object' ? p.player2._id?.toString() || p.player2.$oid : p.player2.toString();
        if (validateObjectId(id)) ids.push(id);
      }
      return ids;
    });

    const invalidIds = await checkPlayersExist(playerIds);
    if (invalidIds.length > 0) {
      return res.status(400).json({ message: `Algunos jugadores no existen: ${invalidIds.join(', ')}` });
    }

    const tournament = new Tournament({
      name,
      club: clubId || null,
      type,
      sport,
      category,
      format,
      participants,
      groups: type === 'RoundRobin' && groups ? groups : [],
      rounds: type === 'Eliminatorio' && rounds ? rounds : [],
      schedule: schedule || { group: null, matches: [] },
      creator: req.user._id,
      draft: draft !== undefined ? draft : true,
      status: draft ? 'Pendiente' : 'En curso',
      playersPerGroupToAdvance: type === 'RoundRobin' ? playersPerGroupToAdvance : undefined,
    });

    await tournament.save();
    res.status(201).json(tournament);
  } catch (error) {
    logger.error('Error creating tournament:', { message: error.message, stack: error.stack });
    res.status(500).json({ message: 'Error al crear torneo', error: error.message });
  }
});

app.get('/api/tournaments', async (req, res) => {
  try {
    const { status } = req.query;
    const token = req.headers['authorization']?.split(' ')[1];
    let user = null;
    if (token) {
      try {
        user = jwt.verify(token, process.env.JWT_SECRET);
      } catch (err) {
        logger.debug('Invalid token, proceeding as spectator');
      }
    }
    const query = { draft: false };
    if (status) {
      query.status = status;
    } else {
      query.status = 'En curso';
    }
    if (user && user.role === 'admin') {
      delete query.draft;
    } else if (user) {
      query.$or = [{ creator: user._id }, { draft: false }];
    }
    const tournaments = await Tournament.find(query)
      .populate('creator', 'username')
      .populate('club', 'name')
      .populate({
        path: 'participants.player1 participants.player2',
        select: 'firstName lastName',
      })
      .populate({
        path: 'groups.matches.player1.player1 groups.matches.player1.player2 groups.matches.player2.player1 groups.matches.player2.player2',
        select: 'firstName lastName',
      })
      .populate({
        path: 'rounds.matches.player1.player1 rounds.matches.player1.player2 rounds.matches.player2.player1 rounds.matches.player2.player2',
        select: 'firstName lastName',
      })
      .lean();
    res.json(tournaments);
  } catch (error) {
    logger.error('Error fetching tournaments:', { message: error.message, stack: error.stack });
    res.status(500).json({ message: 'Error al obtener torneos', error: error.message });
  }
});

app.get('/api/tournaments/:id', [
  param('id').custom(validateObjectId).withMessage('ID de torneo inválido'),
  validateRequest,
], async (req, res) => {
  try {
    const { id } = req.params;
    const token = req.headers['authorization']?.split(' ')[1];
    let user = null;
    if (token) {
      try {
        user = jwt.verify(token, process.env.JWT_SECRET);
      } catch (err) {
        logger.debug('Invalid token, proceeding as spectator');
      }
    }
    const tournament = await Tournament.findById(id)
      .populate('creator', 'username')
      .populate('club', 'name')
      .populate({
        path: 'participants.player1 participants.player2',
        select: 'firstName lastName',
      })
      .populate({
        path: 'groups.matches.player1.player1 groups.matches.player1.player2 groups.matches.player2.player1 groups.matches.player2.player2',
        select: 'firstName lastName',
      })
      .populate({
        path: 'rounds.matches.player1.player1 rounds.matches.player1.player2 rounds.matches.player2.player1 rounds.matches.player2.player2',
        select: 'firstName lastName',
      })
      .lean();
    if (!tournament) return res.status(404).json({ message: 'Torneo no encontrado' });
    if (tournament.draft && (!user || (user.role !== 'admin' && user._id.toString() !== tournament.creator._id.toString()))) {
      return res.status(403).json({ message: 'No tienes permiso para ver este borrador' });
    }
    res.json(tournament);
  } catch (error) {
    logger.error('Error fetching tournament by ID:', { message: error.message, stack: error.stack });
    res.status(500).json({ message: 'Error al obtener el torneo', error: error.message });
  }
});

app.put('/api/tournaments/:id', authenticateToken, isAdminOrCoach, [
  param('id').custom(validateObjectId).withMessage('ID de torneo inválido'),
  validateRequest,
], async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    logger.debug('Updating tournament:', { id, updates });

    const tournament = await Tournament.findById(id);
    if (!tournament) return res.status(404).json({ message: 'Torneo no encontrado' });

    if (updates.participants) {
      const playerIds = updates.participants.flatMap((p) => {
        const ids = [];
        if (p.player1) {
          const id = typeof p.player1 === 'object' ? p.player1._id?.toString() || p.player1.$oid : p.player1.toString();
          if (validateObjectId(id)) ids.push(id);
        }
        if (p.player2 && tournament.format.mode === 'Dobles') {
          const id = typeof p.player2 === 'object' ? p.player2._id?.toString() || p.player2.$oid : p.player2.toString();
          if (validateObjectId(id)) ids.push(id);
        }
        return ids;
      });
      const invalidIds = await checkPlayersExist(playerIds);
      if (invalidIds.length > 0) {
        return res.status(400).json({ message: `Algunos jugadores no existen: ${invalidIds.join(', ')}` });
      }
    }

    if (updates.groups) {
      for (const group of updates.groups) {
        if (group.matches) {
          const matchPlayerIds = group.matches.flatMap((m) => {
            const ids = [];
            if (m.player1?.player1) {
              const id = typeof m.player1.player1 === 'object' ? m.player1.player1._id?.toString() || m.player1.player1.$oid : m.player1.player1.toString();
              if (validateObjectId(id)) ids.push(id);
            }
            if (m.player1?.player2 && tournament.format.mode === 'Dobles') {
              const id = typeof m.player1.player2 === 'object' ? m.player1.player2._id?.toString() || m.player1.player2.$oid : m.player1.player2.toString();
              if (validateObjectId(id)) ids.push(id);
            }
            if (m.player2?.player1 && !m.player2.name) {
              const id = typeof m.player2.player1 === 'object' ? m.player2.player1._id?.toString() || m.player2.player1.$oid : m.player2.player1.toString();
              if (validateObjectId(id)) ids.push(id);
            }
            if (m.player2?.player2 && !m.player2.name && tournament.format.mode === 'Dobles') {
              const id = typeof m.player2.player2 === 'object' ? m.player2.player2._id?.toString() || m.player2.player2.$oid : m.player2.player2.toString();
              if (validateObjectId(id)) ids.push(id);
            }
            if (m.result?.winner?.player1) {
              const id = m.result.winner.player1.toString();
              if (validateObjectId(id)) ids.push(id);
            }
            if (m.result?.winner?.player2) {
              const id = m.result.winner.player2.toString();
              if (validateObjectId(id)) ids.push(id);
            }
            return ids;
          });
          const invalidIds = await checkPlayersExist(matchPlayerIds);
          if (invalidIds.length > 0) {
            return res.status(400).json({ message: `Algunos jugadores no existen en partidos de grupos: ${invalidIds.join(', ')}` });
          }
        }
      }
    }

    if (updates.rounds) {
      for (const round of updates.rounds) {
        if (round.matches) {
          const matchPlayerIds = round.matches.flatMap((m) => {
            const ids = [];
            if (m.player1?.player1) {
              const id = typeof m.player1.player1 === 'object' ? m.player1.player1._id?.toString() || m.player1.player1.$oid : m.player1.player1.toString();
              if (validateObjectId(id)) ids.push(id);
            }
            if (m.player1?.player2 && tournament.format.mode === 'Dobles') {
              const id = typeof m.player1.player2 === 'object' ? m.player1.player2._id?.toString() || m.player1.player2.$oid : m.player1.player2.toString();
              if (validateObjectId(id)) ids.push(id);
            }
            if (m.player2?.player1 && !m.player2.name) {
              const id = typeof m.player2.player1 === 'object' ? m.player2.player1._id?.toString() || m.player2.player1.$oid : m.player2.player1.toString();
              if (validateObjectId(id)) ids.push(id);
            }
            if (m.player2?.player2 && !m.player2.name && tournament.format.mode === 'Dobles') {
              const id = typeof m.player2.player2 === 'object' ? m.player2.player2._id?.toString() || m.player2.player2.$oid : m.player2.player2.toString();
              if (validateObjectId(id)) ids.push(id);
            }
            if (m.result?.winner?.player1) {
              const id = m.result.winner.player1.toString();
              if (validateObjectId(id)) ids.push(id);
            }
            if (m.result?.winner?.player2) {
              const id = m.result.winner.player2.toString();
              if (validateObjectId(id)) ids.push(id);
            }
            if (m.result?.runnerUp?.player1) {
              const id = m.result.runnerUp.player1.toString();
              if (validateObjectId(id)) ids.push(id);
            }
            if (m.result?.runnerUp?.player2) {
              const id = m.result.runnerUp.player2.toString();
              if (validateObjectId(id)) ids.push(id);
            }
            return ids;
          });
          const invalidIds = await checkPlayersExist(matchPlayerIds);
          if (invalidIds.length > 0) {
            return res.status(400).json({ message: `Algunos jugadores no existen en partidos de rondas: ${invalidIds.join(', ')}` });
          }
        }
      }
    }

    if (updates.status === 'Finalizado' && (!updates.winner || !updates.runnerUp)) {
      return res.status(400).json({ message: 'Debe declararse un ganador y un segundo puesto para finalizar el torneo' });
    }

    if (updates.winner && updates.runnerUp) {
      if (!updates.winner.player1 || !validateObjectId(updates.winner.player1) ||
          (tournament.format.mode === 'Dobles' && (!updates.winner.player2 || !validateObjectId(updates.winner.player2)))) {
        return res.status(400).json({ message: 'El ganador debe incluir IDs válidos para ambos jugadores en dobles' });
      }
      if (!updates.runnerUp.player1 || !validateObjectId(updates.runnerUp.player1) ||
          (tournament.format.mode === 'Dobles' && (!updates.runnerUp.player2 || !validateObjectId(updates.runnerUp.player2)))) {
        return res.status(400).json({ message: 'El subcampeón debe incluir IDs válidos para ambos jugadores en dobles' });
      }

      const winnerPlayer1 = await Player.findById(updates.winner.player1).lean();
      const winnerPlayer2 = tournament.format.mode === 'Dobles' ? await Player.findById(updates.winner.player2).lean() : null;
      const runnerUpPlayer1 = await Player.findById(updates.runnerUp.player1).lean();
      const runnerUpPlayer2 = tournament.format.mode === 'Dobles' ? await Player.findById(updates.runnerUp.player2).lean() : null;

      if (!winnerPlayer1 || (tournament.format.mode === 'Dobles' && !winnerPlayer2) ||
          !runnerUpPlayer1 || (tournament.format.mode === 'Dobles' && !runnerUpPlayer2)) {
        return res.status(400).json({ message: 'Uno o ambos jugadores del ganador o subcampeón no encontrados' });
      }

      await Player.updateOne(
        { _id: updates.winner.player1 },
        {
          $push: {
            achievements: {
              tournamentId: id,
              position: 'Winner',
              date: new Date(),
            },
          },
        }
      );
      if (tournament.format.mode === 'Dobles' && updates.winner.player2) {
        await Player.updateOne(
          { _id: updates.winner.player2 },
          {
            $push: {
              achievements: {
                tournamentId: id,
                position: 'Winner',
                date: new Date(),
              },
            },
          }
        );
      }

      await Player.updateOne(
        { _id: updates.runnerUp.player1 },
        {
          $push: {
            achievements: {
              tournamentId: id,
              position: 'RunnerUp',
              date: new Date(),
            },
          },
        }
      );
      if (tournament.format.mode === 'Dobles' && updates.runnerUp.player2) {
        await Player.updateOne(
          { _id: updates.runnerUp.player2 },
          {
            $push: {
              achievements: {
                tournamentId: id,
                position: 'RunnerUp',
                date: new Date(),
              },
            },
          }
        );
      }
    }

    Object.assign(tournament, updates);
    await tournament.save();
    const updatedTournament = await Tournament.findById(id)
      .populate('creator', 'username')
      .populate('club', 'name')
      .populate({
        path: 'participants.player1 participants.player2',
        select: 'firstName lastName',
      })
      .populate({
        path: 'groups.matches.player1.player1 groups.matches.player1.player2 groups.matches.player2.player1 groups.matches.player2.player2',
        select: 'firstName lastName',
      })
      .populate({
        path: 'rounds.matches.player1.player1 rounds.matches.player1.player2 rounds.matches.player2.player1 rounds.matches.player2.player2',
        select: 'firstName lastName',
      })
      .lean();
    res.json(updatedTournament);
  } catch (error) {
    logger.error('Error updating tournament:', { message: error.message, stack: error.stack });
    res.status(500).json({ message: 'Error al actualizar torneo', error: error.message });
  }
});

app.put('/api/tournaments/:tournamentId/matches/:matchId/result', authenticateToken, isAdminOrCoach, [
  param('tournamentId').custom(validateObjectId).withMessage('ID de torneo inválido'),
  param('matchId').custom(validateObjectId).withMessage('ID de partido inválido'),
  body('sets').isArray().withMessage('Los sets deben ser un arreglo'),
  body('winner').notEmpty().withMessage('El ganador es obligatorio'),
  validateRequest,
], async (req, res) => {
  const { tournamentId, matchId } = req.params;
  const { sets, winner, runnerUp, isKnockout, matchTiebreak1, matchTiebreak2 } = req.body;
  logger.debug('Updating match result:', { tournamentId, matchId, payload: req.body });

  try {
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) return res.status(404).json({ message: 'Torneo no encontrado' });

    let match;
    let matchType = '';
    if (tournament.type === 'RoundRobin' && !isKnockout) {
      for (const group of tournament.groups) {
        match = group.matches.id(matchId);
        if (match) {
          matchType = `group ${group.name}`;
          break;
        }
      }
    }
    if (!match) {
      for (const round of tournament.rounds) {
        match = round.matches.id(matchId);
        if (match) {
          matchType = `round ${round.round}`;
          break;
        }
      }
    }

    if (!match) return res.status(400).json({ message: 'Partido no encontrado' });

    // Validate sets
    if (!sets || !Array.isArray(sets) || sets.length === 0) {
      return res.status(400).json({ message: 'Los sets son obligatorios para registrar un resultado' });
    }

    // Validate winner pair
    if (!winner || !winner.player1 || !validateObjectId(winner.player1) ||
        (tournament.format.mode === 'Dobles' && winner.player2 && !validateObjectId(winner.player2))) {
      return res.status(400).json({ message: 'El ganador debe incluir IDs válidos para ambos jugadores en dobles' });
    }
    const winnerPlayer1 = await Player.findById(winner.player1).lean();
    const winnerPlayer2 = tournament.format.mode === 'Dobles' && winner.player2 ? await Player.findById(winner.player2).lean() : null;
    if (!winnerPlayer1 || (tournament.format.mode === 'Dobles' && winner.player2 && !winnerPlayer2)) {
      return res.status(400).json({ message: 'Uno o ambos jugadores del ganador no existen' });
    }

    // Validate runner-up pair (if provided)
    if (runnerUp) {
      if (!runnerUp.player1 || !validateObjectId(runnerUp.player1) ||
          (tournament.format.mode === 'Dobles' && runnerUp.player2 && !validateObjectId(runnerUp.player2))) {
        return res.status(400).json({ message: 'El subcampeón debe incluir IDs válidos para ambos jugadores en dobles' });
      }
      const runnerUpPlayer1 = await Player.findById(runnerUp.player1).lean();
      const runnerUpPlayer2 = tournament.format.mode === 'Dobles' && runnerUp.player2 ? await Player.findById(runnerUp.player2).lean() : null;
      if (!runnerUpPlayer1 || (tournament.format.mode === 'Dobles' && runnerUp.player2 && !runnerUpPlayer2)) {
        return res.status(400).json({ message: 'Uno o ambos jugadores del subcampeón no existen' });
      }
    }

    // Validate match tiebreak for two-set matches
    if (tournament.format.sets === 2 && matchTiebreak1 != null && matchTiebreak2 != null) {
      if (matchTiebreak1 === matchTiebreak2) {
        return res.status(400).json({ message: 'El tiebreak del partido no puede resultar en empate' });
      }
      if (Math.abs(matchTiebreak1 - matchTiebreak2) < 2) {
        return res.status(400).json({ message: 'El tiebreak del partido debe tener al menos 2 puntos de diferencia' });
      }
    }

    // Assign the result
    match.result.sets = sets;
    match.result.winner = {
      player1: winner.player1,
      player2: winner.player2 || null,
    };
    match.result.runnerUp = runnerUp ? {
      player1: runnerUp.player1,
      player2: runnerUp.player2 || null,
    } : null;
    match.result.matchTiebreak1 = matchTiebreak1 || undefined;
    match.result.matchTiebreak2 = matchTiebreak2 || undefined;

    if (runnerUp) {
      tournament.winner = {
        player1: winner.player1,
        player2: winner.player2 || null,
      };
      tournament.runnerUp = {
        player1: runnerUp.player1,
        player2: runnerUp.player2 || null,
      };

      await Player.updateOne(
        { _id: winner.player1 },
        {
          $push: {
            achievements: {
              tournamentId: tournamentId,
              position: 'Winner',
              date: new Date(),
            },
          },
        }
      );
      if (tournament.format.mode === 'Dobles' && winner.player2) {
        await Player.updateOne(
          { _id: winner.player2 },
          {
            $push: {
              achievements: {
                tournamentId: tournamentId,
                position: 'Winner',
                date: new Date(),
              },
            },
          }
        );
      }

      await Player.updateOne(
        { _id: runnerUp.player1 },
        {
          $push: {
            achievements: {
              tournamentId: tournamentId,
              position: 'RunnerUp',
              date: new Date(),
            },
          },
        }
      );
      if (tournament.format.mode === 'Dobles' && runnerUp.player2) {
        await Player.updateOne(
          { _id: runnerUp.player2 },
          {
            $push: {
              achievements: {
                tournamentId: tournamentId,
                position: 'RunnerUp',
                date: new Date(),
              },
            },
          }
        );
      }
    }

    await tournament.save();
    res.json({ message: 'Resultado actualizado' });
  } catch (error) {
    logger.error('Error updating match result:', { message: error.message, stack: error.stack });
    res.status(500).json({ message: 'Error al actualizar resultado', error: error.message });
  }
});

// Global Error Handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', { message: err.message, stack: err.stack });
  res.status(500).json({ message: 'Error interno del servidor', error: err.message });
});

// Start the Server
connectDB().then(() => {
  const PORT = process.env.PORT || 5001;
  app.listen(PORT, () => logger.info(`Server running on port ${PORT}`));
}).catch((err) => {
  logger.error('Failed to start server:', { message: err.message, stack: err.stack });
  process.exit(1);
});