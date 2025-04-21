const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const User = require('./models/User');
const Player = require('./models/Player');
const Tournament = require('./models/Tournament');
const Club = require('./models/Club');

const app = express();

mongoose.set('strictQuery', false);

// Validate environment variables
const requiredEnvVars = ['MONGO_URI', 'JWT_SECRET'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
if (missingEnvVars.length > 0) {
  console.error('Missing required environment variables:', missingEnvVars);
  process.exit(1);
}

// CORS configuration
app.use(cors({
  origin: 'https://padnis-frontend.onrender.com',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

// Connection to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB:', mongoose.connection.db.databaseName);
  } catch (err) {
    console.error('MongoDB connection error:', err.message, err.stack);
    process.exit(1);
  }
};

// Diagnostic routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'Backend is running', timestamp: new Date() });
});

app.get('/api/db-check', async (req, res) => {
  try {
    await mongoose.connection.db.admin().ping();
    res.json({ status: 'MongoDB connected', dbName: mongoose.connection.db.databaseName });
  } catch (error) {
    console.error('MongoDB check failed:', error.message, error.stack);
    res.status(500).json({ message: 'MongoDB connection failed', error: error.message });
  }
});

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Acceso denegado' });
  try {
    const user = jwt.verify(token, process.env.JWT_SECRET);
    req.user = user;
    next();
  } catch (err) {
    console.error('Token verification failed:', err.message, err.stack);
    return res.status(403).json({ message: 'Token inválido' });
  }
};

const isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Requiere rol de admin' });
  next();
};

// Authentication routes
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  if (process.env.NODE_ENV === 'development') {
    console.log('Login attempt:', { username });
  }
  try {
    if (!username || !password) return res.status(400).json({ message: 'Usuario y contraseña son obligatorios' });
    const user = await User.findOne({ username });
    if (!user) {
      console.log('User not found:', username);
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log('Password mismatch for user:', username);
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }
    const token = jwt.sign({ _id: user._id, username, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
    console.log('Login successful:', { username, role: user.role });
    res.json({ token, username, role: user.role });
  } catch (error) {
    console.error('Error in login:', error.message, error.stack);
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
    console.error('Error in register:', error.message, error.stack);
    res.status(500).json({ message: 'Error en el servidor al registrar usuario', error: error.message });
  }
});

// User routes
app.get('/api/users', authenticateToken, async (req, res) => {
  try {
    const users = await User.find({}, 'username role');
    res.status(200).json(users);
  } catch (error) {
    console.error('Error fetching users:', error.message, error.stack);
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
    console.error('Error updating user role:', error.message, error.stack);
    res.status(500).json({ message: 'Error al actualizar rol', error: error.message });
  }
});

// Club routes
app.post('/api/clubs', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { name, address, phone } = req.body;
    if (!name) return res.status(400).json({ message: 'El nombre del club es obligatorio' });
    const club = new Club({
      name,
      address: address || '',
      phone: phone || '',
    });
    await club.save();
    res.status(201).json(club);
  } catch (error) {
    console.error('Error creating club:', error.message, error.stack);
    res.status(500).json({ message: 'Error al crear club', error: error.message });
  }
});

app.get('/api/clubs', async (req, res) => {
  try {
    const clubs = await Club.find();
    res.status(200).json(clubs);
  } catch (error) {
    console.error('Error fetching clubs:', error.message, error.stack);
    res.status(500).json({ message: 'Error al obtener clubes', error: error.message });
  }
});

app.put('/api/clubs/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, address, phone } = req.body;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'ID de club inválido' });
    if (!name) return res.status(400).json({ message: 'El nombre del club es obligatorio' });
    const club = await Club.findById(id);
    if (!club) return res.status(404).json({ message: 'Club no encontrado' });
    club.name = name;
    club.address = address || '';
    club.phone = phone || '';
    await club.save();
    res.json(club);
  } catch (error) {
    console.error('Error updating club:', error.message, error.stack);
    res.status(500).json({ message: 'Error al actualizar club', error: error.message });
  }
});

app.delete('/api/clubs/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'ID de club inválido' });
    const club = await Club.findById(id);
    if (!club) return res.status(404).json({ message: 'Club no encontrado' });
    const tournaments = await Tournament.find({ club: id });
    if (tournaments.length > 0) {
      return res.status(400).json({ message: 'No se puede eliminar el club porque está asociado a torneos' });
    }
    await club.deleteOne();
    res.json({ message: 'Club eliminado correctamente' });
  } catch (error) {
    console.error('Error deleting club:', error.message, error.stack);
    res.status(500).json({ message: 'Error al eliminar club', error: error.message });
  }
});

// Player routes
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
    })));
  } catch (error) {
    console.error('Error fetching players:', error.message, error.stack);
    res.status(500).json({ message: 'Error al obtener jugadores', error: error.message });
  }
});

app.post('/api/players', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'coach') return res.status(403).json({ message: 'Requiere rol de admin o coach' });
    const { firstName, lastName, email, phone, photo, dominantHand, racketBrand } = req.body;
    const lastPlayer = await Player.findOne().sort({ playerId: -1 });
    const playerId = lastPlayer ? lastPlayer.playerId + 1 : 1;
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
    res.status(201).json({ ...player.toObject(), _id: String(player._id) });
  } catch (error) {
    console.error('Error creating player:', error.message, error.stack);
    res.status(500).json({ message: 'Error al crear jugador', error: error.message });
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
    res.json({ ...player.toObject(), _id: String(player._id) });
  } catch (error) {
    console.error('Error updating player:', error.message, error.stack);
    res.status(500).json({ message: 'Error al actualizar jugador', error: error.message });
  }
});

// Tournament routes
app.post('/api/tournaments', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'coach') {
      return res.status(403).json({ message: 'Requiere rol de admin o coach' });
    }
    const { name, clubId, type, sport, category, format, participants, groups, rounds, schedule, draft, playersPerGroupToAdvance } = req.body;

    if (process.env.NODE_ENV === 'development') {
      console.log('Creating tournament with payload:', JSON.stringify(req.body, null, 2));
    }

    if (!name) return res.status(400).json({ message: 'El nombre del torneo es obligatorio' });
    if (!type || !['RoundRobin', 'Eliminatorio'].includes(type)) {
      return res.status(400).json({ message: 'Tipo de torneo inválido' });
    }
    if (!sport || !['Tenis', 'Pádel'].includes(sport)) {
      return res.status(400).json({ message: 'Deporte inválido' });
    }
    if (!category) return res.status(400).json({ message: 'La categoría es obligatoria' });
    if (sport === 'Tenis' && !['A', 'B', 'C', 'D', 'E'].includes(category)) {
      return res.status(400).json({ message: 'Categoría inválida para Tenis' });
    }
    if (sport === 'Pádel' && !['Séptima', 'Sexta', 'Quinta', 'Cuarta', 'Tercera', 'Segunda', 'Primera'].includes(category)) {
      return res.status(400).json({ message: 'Categoría inválida para Pádel' });
    }
    if (!format || !['Singles', 'Dobles'].includes(format.mode)) {
      return res.status(400).json({ message: 'Formato inválido' });
    }
    if (!participants || participants.length < (format.mode === 'Singles' ? 2 : 1)) {
      return res.status(400).json({ message: `Mínimo ${format.mode === 'Singles' ? 2 : 1} participantes requeridos` });
    }

    if (clubId && !mongoose.isValidObjectId(clubId)) {
      return res.status(400).json({ message: 'ID de club inválido' });
    }
    if (clubId) {
      const club = await Club.findById(clubId);
      if (!club) return res.status(400).json({ message: 'Club no encontrado' });
    }

    const playerIds = participants.flatMap(p => {
      const ids = [];
      if (p.player1) {
        const id = typeof p.player1 === 'object' ? p.player1._id?.toString() || p.player1.$oid : p.player1.toString();
        if (id && mongoose.isValidObjectId(id)) ids.push(id);
        else console.warn('Invalid participant player1 ID:', p.player1);
      }
      if (p.player2 && format.mode === 'Dobles') {
        const id = typeof p.player2 === 'object' ? p.player2._id?.toString() || p.player2.$oid : p.player2.toString();
        if (id && mongoose.isValidObjectId(id)) ids.push(id);
        else console.warn('Invalid participant player2 ID:', p.player2);
      }
      return ids;
    }).filter(Boolean);

    if (playerIds.length === 0 && participants.length > 0) {
      return res.status(400).json({ message: 'Ningún ID de participante válido proporcionado' });
    }
    const playersExist = await Player.find({ _id: { $in: playerIds } });
    if (playersExist.length !== playerIds.length) {
      const invalidIds = playerIds.filter(id => !playersExist.some(p => p._id.toString() === id));
      console.error('Invalid participant IDs:', invalidIds);
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
    console.log('Tournament created:', { name, type, sport, category, draft });
    res.status(201).json(tournament);
  } catch (error) {
    console.error('Error creating tournament:', error.message, error.stack);
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
        console.log('Invalid token, proceeding as spectator');
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
    if (process.env.NODE_ENV === 'development') {
      console.log('Fetching tournaments with query:', query);
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
        options: { strictPopulate: false },
      })
      .populate({
        path: 'rounds.matches.player1.player1 rounds.matches.player1.player2 rounds.matches.player2.player1 rounds.matches.player2.player2',
        select: 'firstName lastName',
        options: { strictPopulate: false },
      });
    if (process.env.NODE_ENV === 'development') {
      console.log('Tournaments fetched:', { query, count: tournaments.length });
    }
    res.json(tournaments);
  } catch (error) {
    console.error('Error fetching tournaments:', error.message, error.stack);
    res.status(500).json({ message: 'Error al obtener torneos', error: error.message });
  }
});

app.get('/api/tournaments/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'ID de torneo inválido' });
    const token = req.headers['authorization']?.split(' ')[1];
    let user = null;
    if (token) {
      try {
        user = jwt.verify(token, process.env.JWT_SECRET);
      } catch (err) {
        console.log('Invalid token, proceeding as spectator');
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
        options: { strictPopulate: false },
      })
      .populate({
        path: 'rounds.matches.player1.player1 rounds.matches.player1.player2 rounds.matches.player2.player1 rounds.matches.player2.player2',
        select: 'firstName lastName',
        options: { strictPopulate: false },
      });
    if (!tournament) return res.status(404).json({ message: 'Torneo no encontrado' });
    if (tournament.draft && (!user || (user.role !== 'admin' && user._id.toString() !== tournament.creator._id.toString()))) {
      return res.status(403).json({ message: 'No tienes permiso para ver este borrador' });
    }
    res.json(tournament.toObject({ virtuals: true }));
  } catch (error) {
    console.error('Error fetching tournament by ID:', error.message, error.stack);
    res.status(500).json({ message: 'Error al obtener el torneo', error: error.message });
  }
});

app.put('/api/tournaments/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'coach') {
      return res.status(403).json({ message: 'Requiere rol de admin o coach' });
    }
    const { id } = req.params;
    const updates = req.body;

    if (process.env.NODE_ENV === 'development') {
      console.log('Updating tournament with payload:', JSON.stringify(updates, null, 2));
    }

    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'ID de torneo inválido' });

    const tournament = await Tournament.findById(id);
    if (!tournament) return res.status(404).json({ message: 'Torneo no encontrado' });

    if (updates.participants) {
      const playerIds = updates.participants.flatMap((p, index) => {
        const ids = [];
        if (p.player1) {
          const id = typeof p.player1 === 'object' ? p.player1._id?.toString() || p.player1.$oid : p.player1.toString();
          if (id && mongoose.isValidObjectId(id)) ids.push(id);
          else console.warn(`Invalid participant player1 ID at index ${index}:`, p.player1);
        }
        if (p.player2 && tournament.format.mode === 'Dobles') {
          const id = typeof p.player2 === 'object' ? p.player2._id?.toString() || p.player2.$oid : p.player2.toString();
          if (id && mongoose.isValidObjectId(id)) ids.push(id);
          else console.warn(`Invalid participant player2 ID at index ${index}:`, p.player2);
        }
        return ids;
      }).filter(Boolean);
      if (playerIds.length === 0 && updates.participants.length > 0) {
        return res.status(400).json({ message: 'Ningún ID de participante válido proporcionado' });
      }
      const playersExist = await Player.find({ _id: { $in: playerIds } });
      if (playersExist.length !== playerIds.length) {
        const invalidIds = playerIds.filter(id => !playersExist.some(p => p._id.toString() === id));
        console.error('Invalid participant IDs:', invalidIds);
        return res.status(400).json({ message: `Algunos jugadores no existen en participantes: ${invalidIds.join(', ')}` });
      }
    }

    if (updates.groups) {
      for (const group of updates.groups) {
        if (group.matches) {
          const matchPlayerIds = group.matches.flatMap((m, index) => {
            const ids = [];
            if (m.player1?.player1) {
              const id = typeof m.player1.player1 === 'object' ? m.player1.player1._id?.toString() || m.player1.player1.$oid : m.player1.player1.toString();
              if (id && mongoose.isValidObjectId(id)) ids.push(id);
              else console.warn(`Invalid group match player1.player1 ID in group ${group.name}, match ${index}:`, m.player1?.player1);
            }
            if (m.player1?.player2 && tournament.format.mode === 'Dobles') {
              const id = typeof m.player1.player2 === 'object' ? m.player1.player2._id?.toString() || m.player1.player2.$oid : m.player1.player2.toString();
              if (id && mongoose.isValidObjectId(id)) ids.push(id);
              else console.warn(`Invalid group match player1.player2 ID in group ${group.name}, match ${index}:`, m.player1?.player2);
            }
            if (m.player2?.player1 && !m.player2.name) {
              const id = typeof m.player2.player1 === 'object' ? m.player2.player1._id?.toString() || m.player2.player1.$oid : m.player2.player1.toString();
              if (id && mongoose.isValidObjectId(id)) ids.push(id);
              else console.warn(`Invalid group match player2.player1 ID in group ${group.name}, match ${index}:`, m.player2?.player1);
            }
            if (m.player2?.player2 && !m.player2.name && tournament.format.mode === 'Dobles') {
              const id = typeof m.player2.player2 === 'object' ? m.player2.player2._id?.toString() || m.player2.player2.$oid : m.player2.player2.toString();
              if (id && mongoose.isValidObjectId(id)) ids.push(id);
              else console.warn(`Invalid group match player2.player2 ID in group ${group.name}, match ${index}:`, m.player2?.player2);
            }
            if (m.result?.winner) {
              const id = typeof m.result.winner === 'object' && m.result.winner.player1 
                ? m.result.winner.player1.toString() 
                : (typeof m.result.winner === 'object' ? m.result.winner._id?.toString() || m.result.winner.$oid : m.result.winner.toString());
              if (id && mongoose.isValidObjectId(id)) ids.push(id);
              else console.warn(`Invalid group match winner.player1 ID in group ${group.name}, match ${index}:`, m.result?.winner);

              if (typeof m.result.winner === 'object' && m.result.winner.player2) {
                const id2 = m.result.winner.player2.toString();
                if (id2 && mongoose.isValidObjectId(id2)) ids.push(id2);
                else console.warn(`Invalid group match winner.player2 ID in group ${group.name}, match ${index}:`, m.result?.winner);
              }
            }
            return ids;
          }).filter(Boolean);
          if (matchPlayerIds.length === 0 && group.matches.length > 0) {
            console.error('No valid IDs found in group matches for group:', group.name, ', matches:', JSON.stringify(group.matches, null, 2));
            return res.status(400).json({ message: `Ningún ID de jugador válido en partidos de grupos para el grupo ${group.name}` });
          }
          const playersExist = await Player.find({ _id: { $in: matchPlayerIds } });
          if (playersExist.length !== matchPlayerIds.length) {
            const invalidIds = matchPlayerIds.filter(id => !playersExist.some(p => p._id.toString() === id));
            console.error('Invalid group match IDs for group', group.name, ':', invalidIds, 'matchPlayerIds:', matchPlayerIds, 'matches:', JSON.stringify(group.matches, null, 2));
            return res.status(400).json({ message: `Algunos jugadores no existen en la base de datos para el grupo ${group.name}: ${invalidIds.join(', ')}` });
          }
        }
      }
    }

    if (updates.rounds) {
      console.log('Raw updates.rounds payload:', JSON.stringify(updates.rounds, null, 2));
      for (const round of updates.rounds) {
        if (round.matches) {
          console.log('Processing round matches for round', round.round, ':', JSON.stringify(round.matches, null, 2));
          const matchPlayerIds = round.matches.flatMap((m, index) => {
            const ids = [];
            if (m.player1?.player1) {
              const id = typeof m.player1.player1 === 'object' ? m.player1.player1._id?.toString() || m.player1.player1.$oid : m.player1.player1.toString();
              if (id && mongoose.isValidObjectId(id)) ids.push(id);
              else console.warn(`Invalid round match player1.player1 ID in round ${round.round}, match ${index}:`, m.player1?.player1);
            }
            if (m.player1?.player2 && tournament.format.mode === 'Dobles') {
              const id = typeof m.player1.player2 === 'object' ? m.player1.player2._id?.toString() || m.player1.player2.$oid : m.player1.player2.toString();
              if (id && mongoose.isValidObjectId(id)) ids.push(id);
              else console.warn(`Invalid round match player1.player2 ID in round ${round.round}, match ${index}:`, m.player1?.player2);
            }
            if (m.player2?.player1 && !m.player2.name) {
              const id = typeof m.player2.player1 === 'object' ? m.player2.player1._id?.toString() || m.player2.player1.$oid : m.player2.player1.toString();
              if (id && mongoose.isValidObjectId(id)) ids.push(id);
              else console.warn(`Invalid round match player2.player1 ID in round ${round.round}, match ${index}:`, m.player2?.player1);
            }
            if (m.player2?.player2 && !m.player2.name && tournament.format.mode === 'Dobles') {
              const id = typeof m.player2.player2 === 'object' ? m.player2.player2._id?.toString() || m.player2.player2.$oid : m.player2.player2.toString();
              if (id && mongoose.isValidObjectId(id)) ids.push(id);
              else console.warn(`Invalid round match player2.player2 ID in round ${round.round}, match ${index}:`, m.player2?.player2);
            }
            if (m.result?.winner) {
              const id = typeof m.result.winner === 'object' && m.result.winner.player1 
                ? m.result.winner.player1.toString() 
                : (typeof m.result.winner === 'object' ? m.result.winner._id?.toString() || m.result.winner.$oid : m.result.winner.toString());
              if (id && mongoose.isValidObjectId(id)) ids.push(id);
              else console.warn(`Invalid round match winner.player1 ID in round ${round.round}, match ${index}:`, m.result?.winner);

              if (typeof m.result.winner === 'object' && m.result.winner.player2) {
                const id2 = m.result.winner.player2.toString();
                if (id2 && mongoose.isValidObjectId(id2)) ids.push(id2);
                else console.warn(`Invalid round match winner.player2 ID in round ${round.round}, match ${index}:`, m.result?.winner);
              }
            }
            if (m.result?.runnerUp) {
              const id = typeof m.result.runnerUp === 'object' && m.result.runnerUp.player1 
                ? m.result.runnerUp.player1.toString() 
                : (typeof m.result.runnerUp === 'object' ? m.result.runnerUp._id?.toString() || m.result.runnerUp.$oid : m.result.runnerUp.toString());
              if (id && mongoose.isValidObjectId(id)) ids.push(id);
              else console.warn(`Invalid round match runnerUp.player1 ID in round ${round.round}, match ${index}:`, m.result?.runnerUp);

              if (typeof m.result.runnerUp === 'object' && m.result.runnerUp.player2) {
                const id2 = m.result.runnerUp.player2.toString();
                if (id2 && mongoose.isValidObjectId(id2)) ids.push(id2);
                else console.warn(`Invalid round match runnerUp.player2 ID in round ${round.round}, match ${index}:`, m.result?.runnerUp);
              }
            }
            return ids;
          }).filter(id => id && typeof id === 'string' && mongoose.isValidObjectId(id));
          console.log('Match player IDs for round', round.round, ':', matchPlayerIds);
          if (matchPlayerIds.length === 0 && round.matches.length > 0 && !round.matches.some(m => m.player2?.name === 'BYE')) {
            console.error('No valid IDs found in round matches for round:', round.round, ', matches:', JSON.stringify(round.matches, null, 2));
            return res.status(400).json({ message: `Ningún ID de jugador válido en partidos de rondas para la ronda ${round.round}` });
          }
          const playersExist = await Player.find({ _id: { $in: matchPlayerIds } });
          const existingIds = new Set(playersExist.map(p => p._id.toString()));
          const invalidIds = matchPlayerIds.filter(id => !existingIds.has(id));
          if (invalidIds.length > 0) {
            console.error('Invalid round match IDs for round', round.round, ':', invalidIds, 'matchPlayerIds:', matchPlayerIds, 'matches:', JSON.stringify(round.matches, null, 2));
            return res.status(400).json({ message: `Algunos jugadores no existen en la base de datos para la ronda ${round.round}: ${invalidIds.join(', ')}` });
          }
        }
      }
    }

    if (updates.status === 'Finalizado' && (!updates.winner || !updates.runnerUp)) {
      return res.status(400).json({ message: 'Debe declararse un ganador y un segundo puesto para finalizar el torneo' });
    }

    if (updates.winner && updates.runnerUp) {
      if (!updates.winner.player1 || !mongoose.isValidObjectId(updates.winner.player1) ||
          (tournament.format.mode === 'Dobles' && (!updates.winner.player2 || !mongoose.isValidObjectId(updates.winner.player2)))) {
        return res.status(400).json({ message: 'El ganador debe incluir IDs válidos para ambos jugadores en dobles' });
      }
      if (!updates.runnerUp.player1 || !mongoose.isValidObjectId(updates.runnerUp.player1) ||
          (tournament.format.mode === 'Dobles' && (!updates.runnerUp.player2 || !mongoose.isValidObjectId(updates.runnerUp.player2)))) {
        return res.status(400).json({ message: 'El subcampeón debe incluir IDs válidos para ambos jugadores en dobles' });
      }

      const winnerPlayer1 = await Player.findById(updates.winner.player1);
      const winnerPlayer2 = tournament.format.mode === 'Dobles' ? await Player.findById(updates.winner.player2) : null;
      const runnerUpPlayer1 = await Player.findById(updates.runnerUp.player1);
      const runnerUpPlayer2 = tournament.format.mode === 'Dobles' ? await Player.findById(updates.runnerUp.player2) : null;

      if (!winnerPlayer1 || (tournament.format.mode === 'Dobles' && !winnerPlayer2) ||
          !runnerUpPlayer1 || (tournament.format.mode === 'Dobles' && !runnerUpPlayer2)) {
        return res.status(400).json({ message: 'Uno o ambos jugadores del ganador o subcampeón no encontrados' });
      }

      // Registrar logros para ambos jugadores de la pareja ganadora
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
      if (tournament.format.mode === 'Dobles') {
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

      // Registrar logros para ambos jugadores de la pareja subcampeona
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
      if (tournament.format.mode === 'Dobles') {
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
        options: { strictPopulate: false },
      })
      .populate({
        path: 'rounds.matches.player1.player1 rounds.matches.player1.player2 rounds.matches.player2.player1 rounds.matches.player2.player2',
        select: 'firstName lastName',
        options: { strictPopulate: false },
      });
    res.json(updatedTournament);
  } catch (error) {
    console.error('Error updating tournament:', {
      message: error.message,
      stack: error.stack,
      updates: JSON.stringify(req.body, null, 2),
    });
    res.status(500).json({ message: 'Error al actualizar torneo', error: error.message });
  }
});

app.put('/api/tournaments/:tournamentId/matches/:matchId/result', authenticateToken, async (req, res) => {
  const { tournamentId, matchId } = req.params;
  const { sets, winner, runnerUp, isKnockout } = req.body;

  console.log('Received request to update match result:', { tournamentId, matchId, payload: req.body });

  try {
    if (!mongoose.isValidObjectId(tournamentId)) {
      console.log('Invalid tournament ID:', tournamentId);
      return res.status(400).json({ message: 'ID de torneo inválido' });
    }
    if (!mongoose.isValidObjectId(matchId)) {
      console.log('Invalid match ID:', matchId);
      return res.status(400).json({ message: 'ID de partido inválido' });
    }

    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      console.log('Tournament not found:', tournamentId);
      return res.status(404).json({ message: 'Torneo no encontrado' });
    }

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

    if (!match) {
      console.log('Match not found:', matchId);
      return res.status(400).json({ message: 'Partido no encontrado' });
    }

    console.log('Match found:', { matchType, matchId });

    // Validar la pareja ganadora
    if (!winner || !winner.player1 || !mongoose.isValidObjectId(winner.player1) ||
        (tournament.format.mode === 'Dobles' && (!winner.player2 || !mongoose.isValidObjectId(winner.player2)))) {
      console.log('Invalid winner pair:', winner);
      return res.status(400).json({ message: 'El ganador debe incluir IDs válidos para ambos jugadores en dobles' });
    }
    const winnerPlayer1 = await Player.findById(winner.player1);
    const winnerPlayer2 = tournament.format.mode === 'Dobles' ? await Player.findById(winner.player2) : null;
    if (!winnerPlayer1 || (tournament.format.mode === 'Dobles' && !winnerPlayer2)) {
      console.log('Winner players not found:', { winnerPlayer1, winnerPlayer2 });
      return res.status(400).json({ message: 'Uno o ambos jugadores del ganador no existen' });
    }

    // Validar la pareja subcampeona (si aplica)
    if (runnerUp) {
      if (!runnerUp.player1 || !mongoose.isValidObjectId(runnerUp.player1) ||
          (tournament.format.mode === 'Dobles' && (!runnerUp.player2 || !mongoose.isValidObjectId(runnerUp.player2)))) {
        console.log('Invalid runner-up pair:', runnerUp);
        return res.status(400).json({ message: 'El subcampeón debe incluir IDs válidos para ambos jugadores en dobles' });
      }
      const runnerUpPlayer1 = await Player.findById(runnerUp.player1);
      const runnerUpPlayer2 = tournament.format.mode === 'Dobles' ? await Player.findById(runnerUp.player2) : null;
      if (!runnerUpPlayer1 || (tournament.format.mode === 'Dobles' && !runnerUpPlayer2)) {
        console.log('Runner-up players not found:', { runnerUpPlayer1, runnerUpPlayer2 });
        return res.status(400).json({ message: 'Uno o ambos jugadores del subcampeón no existen' });
      }
    }

    // Validar que los sets estén presentes
    if (!sets || !Array.isArray(sets) || sets.length === 0) {
      console.log('No sets provided:', sets);
      return res.status(400).json({ message: 'Los sets son obligatorios para registrar un resultado' });
    }

    match.result.sets = sets;
    match.result.winner = winner;
    match.result.runnerUp = runnerUp || null;

    if (runnerUp) {
      tournament.winner = winner;
      tournament.runnerUp = runnerUp;

      console.log('Updating achievements for winner and runner-up:', { winner, runnerUp });

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
      if (tournament.format.mode === 'Dobles') {
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
      if (tournament.format.mode === 'Dobles') {
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

    console.log(`Match result updated for tournament ${tournamentId}, ${matchType}, match ${matchId}:`, { sets, winner, runnerUp });
    res.json({ message: 'Resultado actualizado' });
  } catch (error) {
    console.error('Error updating match result:', {
      message: error.message,
      stack: error.stack,
      tournamentId,
      matchId,
      payload: JSON.stringify(req.body, null, 2),
    });
    res.status(500).json({ message: 'Error al actualizar resultado', error: error.message });
  }
});

// Start the server
connectDB().then(() => {
  const PORT = process.env.PORT || 5001;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}).catch(err => {
  console.error('Failed to start server:', err.message, err.stack);
  process.exit(1);
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message, err.stack);
  res.status(500).json({ message: 'Error interno del servidor', error: err.message });
});