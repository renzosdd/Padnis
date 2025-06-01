// backend/server.js
/**
 * Archivo principal del servidor que expone rutas para gestionar:
 * - Usuarios (login, register, roles)
 * - Clubes
 * - Jugadores
 * - Torneos (incluye RoundRobin y fase Eliminatoria)
 * - Envío de invitaciones por email, generación de PDF “al vuelo”
 * 
 * Además emite eventos de Socket.IO para notificaciones en tiempo real.
 */

const express = require('express');
const http = require('http');                                       // ── NUEVO ──
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const { body, param, validationResult } = require('express-validator');
const winston = require('winston');
const nodemailer = require('nodemailer');                           // ── NUEVO ──
const PDFDocument = require('pdfkit');                              // ── NUEVO ──
const path = require('path');                                       // ── NUEVO ──

const User = require('./models/User');
const Player = require('./models/Player');
const Tournament = require('./models/Tournament');
const Club = require('./models/Club');

// Importar utilidades específicas de torneos
const {
  validateMatchResult,
  generateKnockoutRounds,
  advanceEliminationRound,
} = require('./tournamentUtils');

const app = express();
const server = http.createServer(app);                              // ── NUEVO ──
const { Server } = require('socket.io');                            // ── NUEVO ──
const io = new Server(server, {                                     // ── NUEVO ──
  cors: { origin: '*' }                                             // ── NUEVO ──
});                                                                  // ── NUEVO ──

// -------------------------------------------------------
// Configuración de Winston (logger)
// -------------------------------------------------------
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

// -------------------------------------------------------
// Validar variables de entorno
// -------------------------------------------------------
const requiredEnvVars = ['MONGO_URI', 'JWT_SECRET'];
const missingEnvVars = requiredEnvVars.filter((envVar) => !process.env[envVar]);
if (missingEnvVars.length > 0) {
  logger.error('Missing required environment variables:', missingEnvVars);
  process.exit(1);
}

// -------------------------------------------------------
// Configuración Nodemailer (MailHog/MailDev local)
// -------------------------------------------------------
const mailTransporter = nodemailer.createTransport({
  host: 'localhost',
  port: 1025,
  secure: false,
});

async function sendInviteEmail(to, subject, htmlContent) {
  return mailTransporter.sendMail({
    from: '"Padnis App" <no-reply@padnis.local>',
    to,
    subject,
    html: htmlContent,
  });
}

// -------------------------------------------------------
// Conexión a MongoDB
// -------------------------------------------------------
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

// -------------------------------------------------------
// Middlewares globales
// -------------------------------------------------------
app.use(helmet());
app.use(cors({
  origin: 'https://padnis-frontend.onrender.com',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

// Rate limiting para login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10,
  message: 'Demasiados intentos de inicio de sesión. Intenta de nuevo en 15 minutos.',
});
app.use('/api/login', loginLimiter);

// -------------------------------------------------------
// Funciones utilitarias
// -------------------------------------------------------
const validateObjectId = (id) => mongoose.isValidObjectId(id);

const checkPlayersExist = async (playerIds) => {
  if (!playerIds.length) return [];
  const players = await Player.find({ _id: { $in: playerIds } }).lean();
  const existingIds = new Set(players.map((p) => p._id.toString()));
  return playerIds.filter((id) => !existingIds.has(id));
};

// -------------------------------------------------------
// Middleware de autenticación y roles
// -------------------------------------------------------
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

// Middleware para validar resultados de express-validator
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: 'Errores de validación', errors: errors.array() });
  }
  next();
};

// -------------------------------------------------------
// Configuración de Socket.IO
// -------------------------------------------------------
io.on('connection', (socket) => {
  logger.info('Cliente Socket.io conectado:', socket.id);
  socket.on('disconnect', () => {
    logger.info('Cliente Socket.io desconectado:', socket.id);
  });
});

// -------------------------------------------------------
// Rutas de diagnóstico
// -------------------------------------------------------
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

// -------------------------------------------------------
// Rutas de autenticación (login / register)
// -------------------------------------------------------
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
    const token = jwt.sign(
      { _id: user._id, username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
    );
    logger.info('Login successful:', { username, role: user.role });
    res.json({ token, username, role: user.role });
  } catch (error) {
    logger.error('Error in login:', { message: error.message, stack: err.stack });
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

// -------------------------------------------------------
// Rutas de Usuarios
// -------------------------------------------------------
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

// -------------------------------------------------------
// Rutas de Clubes
// -------------------------------------------------------
app.post('/api/clubs', authenticateToken, isAdmin, [
  body('name').notEmpty().withMessage('El nombre del club es obligatorio'),
  validateRequest,
], async (req, res) => {
  try {
    const { name, address, phone } = req.body;
    const club = new Club({ name, address: address || '', phone: phone || '' });
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

// -------------------------------------------------------
// Rutas de Jugadores
// -------------------------------------------------------
app.get('/api/players', async (req, res) => {
  try {
    const { showInactive } = req.query;
    let query = { active: 'Yes' };
    const token = req.headers['authorization']?.split(' ')[1];
    if (token) {
      try {
        const user = jwt.verify(token, process.env.JWT_SECRET);
        if (user.role === 'admin' && showInactive === 'true') query = {};
      } catch {
        // Token inválido: proceder como espectador
      }
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

// -------------------------------------------------------
// Rutas de Torneos
// -------------------------------------------------------

// Crear nuevo torneo
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

    // Validación de categoría según deporte
    if (sport === 'Tenis' && !['A', 'B', 'C', 'D', 'E'].includes(category)) {
      return res.status(400).json({ message: 'Categoría inválida para Tenis' });
    }
    if (sport === 'Pádel' && !['Séptima', 'Sexta', 'Quinta', 'Cuarta', 'Tercera', 'Segunda', 'Primera'].includes(category)) {
      return res.status(400).json({ message: 'Categoría inválida para Pádel' });
    }
    if (participants.length < (format.mode === 'Singles' ? 2 : 1)) {
      return res.status(400).json({ message: `Mínimo ${format.mode === 'Singles' ? 2 : 1} participantes requeridos` });
    }

    // Validación de club
    if (clubId && !validateObjectId(clubId)) {
      return res.status(400).json({ message: 'ID de club inválido' });
    }
    if (clubId) {
      const club = await Club.findById(clubId).lean();
      if (!club) return res.status(400).json({ message: 'Club no encontrado' });
    }

    // Validación de IDs de jugadores
    const playerIds = participants.flatMap((p) => {
      const ids = [];
      if (p.player1) {
        const id = typeof p.player1 === 'object'
          ? p.player1._id?.toString() || p.player1.$oid
          : p.player1.toString();
        if (validateObjectId(id)) ids.push(id);
      }
      if (p.player2 && format.mode === 'Dobles') {
        const id = typeof p.player2 === 'object'
          ? p.player2._id?.toString() || p.player2.$oid
          : p.player2.toString();
        if (validateObjectId(id)) ids.push(id);
      }
      return ids;
    });

    const invalidIds = await checkPlayersExist(playerIds);
    if (invalidIds.length > 0) {
      return res.status(400).json({ message: `Algunos jugadores no existen: ${invalidIds.join(', ')}` });
    }

    // Crear y guardar torneo
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

// Listar torneos (puede filtrar por status, show draft para admin, etc.)
app.get('/api/tournaments', async (req, res) => {
  try {
    const { status } = req.query;
    const token = req.headers['authorization']?.split(' ')[1];
    let user = null;
    if (token) {
      try {
        user = jwt.verify(token, process.env.JWT_SECRET);
      } catch {
        // Token inválido: proceder como espectador
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

// Obtener un torneo por ID (con validación de acceso si es draft)
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
      } catch {
        // Token inválido: proceder como espectador
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
    if (
      tournament.draft &&
      (!user || (user.role !== 'admin' && user._id.toString() !== tournament.creator._id.toString()))
    ) {
      return res.status(403).json({ message: 'No tienes permiso para ver este borrador' });
    }
    res.json(tournament);
  } catch (error) {
    logger.error('Error fetching tournament by ID:', { message: error.message, stack: error.stack });
    res.status(500).json({ message: 'Error al obtener el torneo', error: error.message });
  }
});

// Actualizar torneo por ID (incluye nombre, status, draft, grupos, rondas, etc.)
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

    // Validaciones de participantes, grupos, rondas, estado, ganador/subcampeón (si corresponde)...
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

// -------------------------------------------------------
// NUEVA RUTA: Generar fase Eliminatoria (Knockout)
// POST /api/tournaments/:id/knockout
// -------------------------------------------------------
app.post('/api/tournaments/:id/knockout',
  authenticateToken,
  isAdminOrCoach,
  [
    param('id').custom(validateObjectId).withMessage('ID de torneo inválido'),
    validateRequest,
  ],
  async (req, res) => {
    try {
      const { id } = req.params;
      const tournament = await Tournament.findById(id).lean();
      if (!tournament) {
        return res.status(404).json({ message: 'Torneo no encontrado' });
      }
      if (tournament.type !== 'RoundRobin') {
        return res.status(400).json({ message: 'Sólo aplica a torneos RoundRobin' });
      }

      // Generar la primera ronda eliminatoria
      const knockoutRounds = await generateKnockoutRounds(tournament);
      await Tournament.findByIdAndUpdate(id, {
        draft: false,
        status: 'En curso',
        rounds: knockoutRounds,
      });

      const updatedTournament = await Tournament.findById(id)
        .populate({
          path: 'rounds.matches.player1.player1 rounds.matches.player1.player2 rounds.matches.player2.player1 rounds.matches.player2.player2',
        })
        .lean();

      io.emit('tournament:roundChanged', {
        tournamentId: id,
        newRounds: updatedTournament.rounds,
      });
      return res.json(updatedTournament);
    } catch (error) {
      logger.error('Error generando fase eliminatoria:', { message: error.message, stack: error.stack });
      return res.status(500).json({
        message: 'Error interno al generar fase eliminatoria',
        error: error.message,
      });
    }
  }
);

// -------------------------------------------------------
// Actualizar resultado de un partido (grupos o eliminatoria)
// PUT /api/tournaments/:tournamentId/matches/:matchId/result
// -------------------------------------------------------
app.put('/api/tournaments/:tournamentId/matches/:matchId/result',
  authenticateToken,
  isAdminOrCoach,
  [
    param('tournamentId').custom(validateObjectId).withMessage('ID de torneo inválido'),
    param('matchId').custom(validateObjectId).withMessage('ID de partido inválido'),
    body('sets').isArray().withMessage('Los sets deben ser un arreglo'),
    body('winner').notEmpty().withMessage('El ganador es obligatorio'),
    validateRequest,
  ],
  async (req, res) => {
    const { tournamentId, matchId } = req.params;
    const { sets, winner, runnerUp, isKnockout, matchTiebreak1, matchTiebreak2 } = req.body;
    logger.debug('Updating match result:', { tournamentId, matchId, payload: req.body });

    try {
      // 1) Obtener torneo (sin lean, para modificar subdocumentos)
      const tournament = await Tournament.findById(tournamentId);
      if (!tournament) {
        return res.status(404).json({ message: 'Torneo no encontrado' });
      }

      // 2) Buscar el partido en grupos o en rounds
      let match = null;
      let roundIndex = -1;

      if (!isKnockout && Array.isArray(tournament.groups)) {
        for (const grp of tournament.groups) {
          const found = grp.matches.id(matchId);
          if (found) {
            match = found;
            break;
          }
        }
      }
      if (!match && Array.isArray(tournament.rounds)) {
        for (let i = 0; i < tournament.rounds.length; i++) {
          const rnd = tournament.rounds[i];
          const found = rnd.matches.id(matchId);
          if (found) {
            match = found;
            roundIndex = i;
            break;
          }
        }
      }
      if (!match) {
        return res.status(404).json({ message: 'Partido no encontrado' });
      }

      // 3) Validar sets y tiebreaks con helper
      const validationErrors = validateMatchResult({ sets, matchTiebreak1, matchTiebreak2 });
      if (Object.keys(validationErrors).length > 0) {
        return res.status(400).json({
          errors: Object.entries(validationErrors).map(([paramKey, msg]) => ({ param: paramKey, msg })),
        });
      }

      // 4) Asignar resultado
      match.result.sets = sets;
      match.result.matchTiebreak1 = matchTiebreak1;
      match.result.matchTiebreak2 = matchTiebreak2;
      match.result.winner = winner;
      match.result.runnerUp = runnerUp || null;

      await tournament.save();

      // 5) Si es eliminatoria, verificar si se debe avanzar de ronda
      if (isKnockout && roundIndex >= 0) {
        const updatedRounds = await advanceEliminationRound(tournament, roundIndex);
        if (updatedRounds) {
          tournament.rounds = updatedRounds;
          await tournament.save();
          io.emit('tournament:roundChanged', {
            tournamentId,
            newRounds: tournament.rounds,
          });
        }
      }

      // 6) Recargar torneo con populate y emitir evento de match actualizado
      const finalTournament = await Tournament.findById(tournamentId)
        .populate({
          path: 'groups.matches.player1.player1 groups.matches.player1.player2 groups.matches.player2.player1 groups.matches.player2.player2',
        })
        .populate({
          path: 'rounds.matches.player1.player1 rounds.matches.player1.player2 rounds.matches.player2.player1 rounds.matches.player2.player2',
        })
        .lean();

      io.emit('match:updated', {
        tournamentId,
        matchId,
        newMatch: match,
      });

      return res.json(finalTournament);
    } catch (error) {
      logger.error('Error updating match result:', { message: error.message, stack: error.stack });
      return res.status(500).json({
        message: 'Error al actualizar resultado',
        error: error.message,
      });
    }
  }
);

// -------------------------------------------------------
// Generación de PDF “al vuelo” para torneo
// GET /api/tournaments/:id/pdf
// -------------------------------------------------------
app.get('/api/tournaments/:id/pdf', [
  param('id').custom(validateObjectId).withMessage('ID de torneo inválido'),
  validateRequest,
], async (req, res) => {
  try {
    const { id } = req.params;
    const tournament = await Tournament.findById(id).lean();
    if (!tournament) return res.status(404).json({ message: 'Torneo no encontrado' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="torneo-${id}.pdf"`);

    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(res);

    const logoPath = path.join(__dirname, 'public', 'logo.png');
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, 50, 45, { width: 100 });
    }

    doc.fontSize(20).text(`Torneo: ${tournament.name}`, 50, 160).moveDown();
    doc.fontSize(12).text('Primeros partidos:');
    (tournament.rounds[0]?.matches || []).slice(0, 5).forEach((m, i) => {
      const p1name = m.player1?.player1?.firstName ? `${m.player1.player1.firstName} ${m.player1.player1.lastName}` : '—';
      const p2name = m.player2?.player1 ? `${m.player2.player1.firstName} ${m.player2.player1.lastName}` : '—';
      doc.text(
        `${i + 1}. ${p1name} vs ${p2name} — ${
          m.result?.sets?.map(s => `${s.player1}-${s.player2}`).join(', ') || 'sin jugar'
        }`
      );
    });

    doc.end();
  } catch (error) {
    logger.error('Error generating PDF:', { message: error.message, stack: error.stack });
    res.status(500).json({ message: 'Error al generar PDF', error: error.message });
  }
});

// -------------------------------------------------------
// Envío de invitaciones por email para torneo
// POST /api/tournaments/:id/invite
// -------------------------------------------------------
app.post('/api/tournaments/:id/invite',
  authenticateToken,
  isAdminOrCoach,
  [
    param('id').custom(validateObjectId).withMessage('ID de torneo inválido'),
    body('email').isEmail().withMessage('Email inválido'),
    validateRequest,
  ],
  async (req, res) => {
    try {
      const { id } = req.params;
      const { email } = req.body;
      const tournament = await Tournament.findById(id).lean();
      if (!tournament) return res.status(404).json({ message: 'Torneo no encontrado' });

      const link = `https://padnis-frontend.onrender.com/tournament/${id}`;
      const html = `
        <h1>Invitación al torneo ${tournament.name}</h1>
        <p>Únete aquí: <a href="${link}">${link}</a></p>
        <img src="https://your-cdn.com/logo.png" width="120" />
      `;
      await sendInviteEmail(email, `Invitación a ${tournament.name}`, html);
      res.json({ message: 'Invitación enviada' });
    } catch (err) {
      logger.error('Error al enviar invitación:', { message: err.message, stack: err.stack });
      res.status(500).json({ message: 'Error al enviar invitación', error: err.message });
    }
  }
);

// -------------------------------------------------------
// Handler global de errores
// -------------------------------------------------------
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', { message: err.message, stack: err.stack });
  res.status(500).json({ message: 'Error interno del servidor', error: err.message });
});

// -------------------------------------------------------
// Inicialización del servidor
// -------------------------------------------------------
connectDB().then(() => {
  const PORT = process.env.PORT || 5001;
  server.listen(PORT, () => logger.info(`Server running on port ${PORT}`));  // ── MODIFICADO ──
}).catch((err) => {
  logger.error('Failed to start server:', { message: err.message, stack: err.stack });
  process.exit(1);
});

module.exports = { app, io };
