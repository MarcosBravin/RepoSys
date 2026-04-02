const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const http = require('http');
const os = require('os');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Server } = require('socket.io');
const {
  addActivity,
  computeStats,
  createNote,
  createReposicao,
  createUser,
  deleteNote,
  deleteReposicao,
  deleteRefreshToken,
  deleteRefreshTokensByUserId,
  getRefreshToken,
  getRecentActivity,
  getReposicaoById,
  saveRefreshToken,
  getUserByEmail,
  getUserById,
  getNoteById,
  initializeDatabase,
  listNotes,
  listReposicoes,
  listUsers,
  normalizeText,
  sanitizeUser,
  updateNote,
  updateReposicao,
  updateUser,
} = require('./db');

const app = express();
const server = http.createServer(app);

const HOST = process.env.HOST || '0.0.0.0';
const PORT = Number(process.env.PORT || 3001);
const JWT_SECRET = process.env.JWT_SECRET || 'reposys-dev-secret-change-me';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '12h';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'reposys-dev-refresh-secret-change-me';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '30d';
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || process.env.ALLOWED_ORIGINS || '*';
const NODE_ENV = process.env.NODE_ENV || 'development';

function buildAllowedOrigins() {
  if (FRONTEND_ORIGIN === '*') return '*';

  const configured = FRONTEND_ORIGIN.split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  if (NODE_ENV !== 'development') {
    return configured;
  }

  return Array.from(new Set([
    ...configured,
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3001',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:4173',
    'http://127.0.0.1:4173',
  ]));
}

const ALLOWED_ORIGINS = buildAllowedOrigins();

function isAllowedDevelopmentOrigin(origin) {
  if (NODE_ENV !== 'development' || !origin) return false;

  try {
    const parsed = new URL(origin);
    if (!['http:', 'https:'].includes(parsed.protocol)) return false;

    return /^(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3})$/.test(parsed.hostname);
  } catch (_error) {
    return false;
  }
}

const corsOptions = {
  origin(origin, callback) {
    if (ALLOWED_ORIGINS === '*') {
      callback(null, true);
      return;
    }

    if (!origin || ALLOWED_ORIGINS.includes(origin) || isAllowedDevelopmentOrigin(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`Origem não permitida pelo CORS: ${origin}`));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
};

const io = new Server(server, {
  cors: corsOptions,
});

app.use(cors(corsOptions));
app.use(express.json());

function signToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, email: user.email, nome: user.nome },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

function signRefreshToken(user) {
  return jwt.sign(
    { sub: user.id, type: 'refresh' },
    JWT_REFRESH_SECRET,
    { expiresIn: JWT_REFRESH_EXPIRES_IN }
  );
}

function parseExpiresAt(token) {
  const decoded = jwt.decode(token);
  if (!decoded?.exp) return null;
  return new Date(decoded.exp * 1000).toISOString();
}

function getConfiguredAdminSummary() {
  const email = process.env.ADMIN_EMAIL || 'admin@example.com';
  const password = process.env.ADMIN_PASSWORD ? '[definida via ambiente]' : '[defina ADMIN_PASSWORD no server/.env]';
  return `${email} / ${password}`;
}

function getTokenFromHeader(header = '') {
  if (!header.startsWith('Bearer ')) return null;
  return header.slice(7);
}

function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

const authRequired = asyncHandler(async (req, res, next) => {
  const token = getTokenFromHeader(req.headers.authorization);
  if (!token) {
    return res.status(401).json({ error: 'Token ausente' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = await getUserById(payload.sub);
    if (!user) {
      return res.status(401).json({ error: 'Usuário inválido ou inativo' });
    }

    req.user = sanitizeUser(user);
    next();
  } catch (_error) {
    return res.status(401).json({ error: 'Token inválido' });
  }
});

function requireRoles(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Não autenticado' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Sem permissão para esta ação' });
    }
    next();
  };
}

function canManageNote(user, note) {
  if (!user || !note) return false;
  return user.role === 'admin' || Number(note.created_by) === Number(user.id);
}

function getNetworkUrls(port) {
  const interfaces = os.networkInterfaces();
  const urls = new Set();

  Object.values(interfaces).forEach((entries = []) => {
    entries.forEach((entry) => {
      if (!entry || entry.internal || entry.family !== 'IPv4') return;
      urls.add(`http://${entry.address}:${port}`);
    });
  });

  return Array.from(urls).sort();
}

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Token ausente'));

    const payload = jwt.verify(token, JWT_SECRET);
    const user = await getUserById(payload.sub);
    if (!user) return next(new Error('Usuário inválido'));

    socket.user = sanitizeUser(user);
    next();
  } catch (_error) {
    next(new Error('Não autorizado'));
  }
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, database: 'mongodb' });
});

app.post('/api/auth/login', asyncHandler(async (req, res) => {
  const email = normalizeText(req.body.email).toLowerCase();
  const password = String(req.body.password || '');

  if (!email || !password) {
    return res.status(400).json({ error: 'Email e senha são obrigatórios' });
  }

  const user = await getUserByEmail(email);
  if (!user || !user.ativo) {
    return res.status(401).json({ error: 'Credenciais inválidas' });
  }

  const isValid = bcrypt.compareSync(password, user.password_hash);
  if (!isValid) {
    return res.status(401).json({ error: 'Credenciais inválidas' });
  }

  const safeUser = sanitizeUser(user);
  const token = signToken(safeUser);
  const refreshToken = signRefreshToken(safeUser);
  await deleteRefreshTokensByUserId(safeUser.id);
  await saveRefreshToken({
    token: refreshToken,
    userId: safeUser.id,
    expiresAt: parseExpiresAt(refreshToken),
  });
  const activity = await addActivity('LOGIN', `Login realizado por ${safeUser.nome}`, { role: safeUser.role }, safeUser.id);
  io.emit('activity', activity);
  res.json({ token, refreshToken, user: safeUser });
}));

app.get('/api/auth/me', authRequired, (req, res) => {
  res.json(req.user);
});

app.post('/api/auth/refresh', asyncHandler(async (req, res) => {
  const refreshToken = String(req.body.refreshToken || '');
  if (!refreshToken) {
    return res.status(401).json({ error: 'Refresh token ausente' });
  }

  let payload;
  try {
    payload = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
  } catch (_error) {
    await deleteRefreshToken(refreshToken);
    return res.status(401).json({ error: 'Refresh token inválido' });
  }

  if (payload.type !== 'refresh') {
    await deleteRefreshToken(refreshToken);
    return res.status(401).json({ error: 'Refresh token inválido' });
  }

  const storedToken = await getRefreshToken(refreshToken);
  if (!storedToken) {
    return res.status(401).json({ error: 'Refresh token inválido' });
  }

  const user = await getUserById(payload.sub);
  if (!user) {
    await deleteRefreshTokensByUserId(payload.sub);
    return res.status(401).json({ error: 'Usuário inválido ou inativo' });
  }

  const safeUser = sanitizeUser(user);
  const nextToken = signToken(safeUser);
  const nextRefreshToken = signRefreshToken(safeUser);

  await deleteRefreshToken(refreshToken);
  await saveRefreshToken({
    token: nextRefreshToken,
    userId: safeUser.id,
    expiresAt: parseExpiresAt(nextRefreshToken),
  });

  res.json({
    token: nextToken,
    refreshToken: nextRefreshToken,
    user: safeUser,
  });
}));

app.post('/api/auth/logout', asyncHandler(async (req, res) => {
  const refreshToken = String(req.body.refreshToken || '');
  if (refreshToken) {
    await deleteRefreshToken(refreshToken);
  }
  res.json({ success: true });
}));

app.get('/api/users', authRequired, requireRoles('admin'), asyncHandler(async (_req, res) => {
  const users = await listUsers();
  res.json(users.map(sanitizeUser));
}));

app.post('/api/users', authRequired, requireRoles('admin'), asyncHandler(async (req, res) => {
  const nome = normalizeText(req.body.nome);
  const email = normalizeText(req.body.email).toLowerCase();
  const password = String(req.body.password || '');
  const role = normalizeText(req.body.role, 'viewer');
  const ativo = req.body.ativo === false ? false : true;

  if (!nome || !email || !password) {
    return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
  }

  if (!['admin', 'manager', 'viewer'].includes(role)) {
    return res.status(400).json({ error: 'Perfil inválido' });
  }

  const existing = await getUserByEmail(email);
  if (existing) {
    return res.status(409).json({ error: 'Já existe usuário com este email' });
  }

  const created = await createUser({ nome, email, password, role, ativo });
  const activity = await addActivity('USER_CREATE', `Usuário ${nome} criado`, { role, email }, req.user.id);
  io.emit('activity', activity);
  res.status(201).json(sanitizeUser(created));
}));

app.put('/api/users/:id', authRequired, requireRoles('admin'), asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const users = await listUsers();
  const user = users.find((item) => Number(item.id) === id);
  if (!user) {
    return res.status(404).json({ error: 'Usuário não encontrado' });
  }

  const nome = normalizeText(req.body.nome, user.nome);
  const email = normalizeText(req.body.email, user.email).toLowerCase();
  const role = normalizeText(req.body.role, user.role);
  const ativo = typeof req.body.ativo === 'boolean' ? req.body.ativo : user.ativo;
  const password = String(req.body.password || '');

  if (!['admin', 'manager', 'viewer'].includes(role)) {
    return res.status(400).json({ error: 'Perfil inválido' });
  }

  const duplicate = await getUserByEmail(email);
  if (duplicate && Number(duplicate.id) !== id) {
    return res.status(409).json({ error: 'Já existe usuário com este email' });
  }

  const willStayAdmin = role === 'admin' && Boolean(ativo);
  const activeAdminCount = users.filter((item) => item.role === 'admin' && item.ativo).length;
  if (user.role === 'admin' && user.ativo && !willStayAdmin && activeAdminCount <= 1) {
    return res.status(400).json({ error: 'É preciso manter pelo menos um administrador ativo.' });
  }

  const updated = await updateUser(id, {
    nome,
    email,
    role,
    ativo,
    ...(password ? { password } : {}),
  });

  const activity = await addActivity('USER_UPDATE', `Usuário ${nome} atualizado`, { role, ativo: Boolean(ativo) }, req.user.id);
  io.emit('activity', activity);
  res.json(sanitizeUser(updated));
}));

app.get('/api/notes', authRequired, asyncHandler(async (req, res) => {
  const search = normalizeText(req.query.search).toLowerCase();
  const rows = await listNotes({ user: req.user, search });
  res.json(rows);
}));

app.post('/api/notes', authRequired, asyncHandler(async (req, res) => {
  const content = normalizeText(req.body.content);
  const title = normalizeText(req.body.title);
  const color = normalizeText(req.body.color, 'sun').toLowerCase();
  const scope = normalizeText(req.body.scope, 'personal').toLowerCase();
  const pinned = Boolean(req.body.pinned);
  const allowedColors = ['sun', 'mint', 'sky', 'lavender', 'rose', 'slate', 'cobalt', 'terracotta'];
  const adminOnlyColors = ['cobalt', 'terracotta'];

  if (!content) {
    return res.status(400).json({ error: 'O conteúdo da anotação é obrigatório' });
  }

  if (!allowedColors.includes(color)) {
    return res.status(400).json({ error: 'Cor de anotação inválida' });
  }

  if (adminOnlyColors.includes(color) && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Apenas administradores podem usar essa cor de anotação' });
  }

  if (!['personal', 'general'].includes(scope)) {
    return res.status(400).json({ error: 'Visibilidade da anotação inválida' });
  }

  const created = await createNote({
    title,
    content,
    color,
    scope,
    pinned,
    userId: req.user.id,
  });

  const activity = await addActivity(
    'NOTE_CREATE',
    `Nova anotação criada${title ? `: ${title}` : ''}`,
    { noteId: created.id, scope },
    req.user.id
  );
  io.emit('activity', activity);
  io.emit('note:created', created);
  res.status(201).json(created);
}));

app.put('/api/notes/:id', authRequired, asyncHandler(async (req, res) => {
  const existing = await getNoteById(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Anotação não encontrada' });
  if (!canManageNote(req.user, existing)) {
    return res.status(403).json({ error: 'Sem permissão para editar esta anotação' });
  }

  const title = normalizeText(req.body.title, existing.title);
  const content = normalizeText(req.body.content, existing.content);
  const color = normalizeText(req.body.color, existing.color).toLowerCase();
  const scope = normalizeText(req.body.scope, existing.scope || 'personal').toLowerCase();
  const pinned = typeof req.body.pinned === 'boolean' ? req.body.pinned : Boolean(existing.pinned);
  const allowedColors = ['sun', 'mint', 'sky', 'lavender', 'rose', 'slate', 'cobalt', 'terracotta'];
  const adminOnlyColors = ['cobalt', 'terracotta'];

  if (!content) {
    return res.status(400).json({ error: 'O conteúdo da anotação é obrigatório' });
  }

  if (!allowedColors.includes(color)) {
    return res.status(400).json({ error: 'Cor de anotação inválida' });
  }

  if (adminOnlyColors.includes(color) && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Apenas administradores podem usar essa cor de anotação' });
  }

  if (!['personal', 'general'].includes(scope)) {
    return res.status(400).json({ error: 'Visibilidade da anotação inválida' });
  }

  const updated = await updateNote(req.params.id, {
    title,
    content,
    color,
    scope,
    pinned,
    updated_by: Number(req.user.id),
  });

  const activity = await addActivity(
    'NOTE_UPDATE',
    `Anotação atualizada${title ? `: ${title}` : ''}`,
    { noteId: updated.id, scope },
    req.user.id
  );
  io.emit('activity', activity);
  io.emit('note:updated', updated);
  res.json(updated);
}));

app.delete('/api/notes/:id', authRequired, asyncHandler(async (req, res) => {
  const existing = await getNoteById(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Anotação não encontrada' });
  if (!canManageNote(req.user, existing)) {
    return res.status(403).json({ error: 'Sem permissão para excluir esta anotação' });
  }

  await deleteNote(req.params.id);
  const activity = await addActivity(
    'NOTE_DELETE',
    `Anotação removida${existing.title ? `: ${existing.title}` : ''}`,
    { noteId: existing.id },
    req.user.id
  );
  io.emit('activity', activity);
  io.emit('note:deleted', { id: existing.id });
  res.json({ success: true });
}));

app.get('/api/reposicoes', authRequired, asyncHandler(async (req, res) => {
  const rows = await listReposicoes({
    search: normalizeText(req.query.search),
    status: normalizeText(req.query.status),
    dia: normalizeText(req.query.dia),
    categoria: normalizeText(req.query.categoria),
  });
  res.json(rows);
}));

app.get('/api/reposicoes/:id', authRequired, asyncHandler(async (req, res) => {
  const item = await getReposicaoById(req.params.id);
  if (!item) return res.status(404).json({ error: 'Não encontrado' });
  res.json(item);
}));

app.post('/api/reposicoes', authRequired, requireRoles('admin', 'manager'), asyncHandler(async (req, res) => {
  const nome = normalizeText(req.body.nome);
  if (!nome) return res.status(400).json({ error: 'Nome do aluno é obrigatório' });

  const item = await createReposicao({
    nome,
    obs: normalizeText(req.body.obs),
    horario: normalizeText(req.body.horario),
    status: normalizeText(req.body.status, 'PENDENTE'),
    categoria: normalizeText(req.body.categoria, 'GERAL'),
    dia: normalizeText(req.body.dia, 'SEGUNDA'),
    userId: req.user.id,
  });

  const activity = await addActivity('CREATE', `Nova reposição criada: ${item.nome}`, item, req.user.id);
  io.emit('activity', activity);
  io.emit('reposicao:created', item);
  res.status(201).json(item);
}));

app.put('/api/reposicoes/:id', authRequired, requireRoles('admin', 'manager'), asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const existing = await getReposicaoById(id);
  if (!existing) return res.status(404).json({ error: 'Não encontrado' });

  const updated = await updateReposicao(id, {
    nome: normalizeText(req.body.nome, existing.nome),
    obs: normalizeText(req.body.obs, existing.obs),
    horario: normalizeText(req.body.horario, existing.horario),
    status: normalizeText(req.body.status, existing.status),
    categoria: normalizeText(req.body.categoria, existing.categoria),
    dia: normalizeText(req.body.dia, existing.dia),
    updated_by: Number(req.user.id),
  });

  const activity = await addActivity('UPDATE', `Reposição atualizada: ${updated.nome}`, { old: existing, new: updated }, req.user.id);
  io.emit('activity', activity);
  io.emit('reposicao:updated', updated);
  res.json(updated);
}));

app.delete('/api/reposicoes/:id', authRequired, requireRoles('admin'), asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const existing = await getReposicaoById(id);
  if (!existing) return res.status(404).json({ error: 'Não encontrado' });

  await deleteReposicao(id);
  const activity = await addActivity('DELETE', `Reposição removida: ${existing.nome}`, existing, req.user.id);
  io.emit('activity', activity);
  io.emit('reposicao:deleted', { id });
  res.json({ success: true });
}));

app.get('/api/stats', authRequired, asyncHandler(async (_req, res) => {
  res.json(await computeStats());
}));

app.get('/api/activity', authRequired, asyncHandler(async (_req, res) => {
  res.json(await getRecentActivity(50));
}));

io.on('connection', (socket) => {
  socket.emit('connected', {
    message: 'Conectado ao servidor de reposições',
    user: socket.user,
  });

  socket.on('disconnect', () => {
    // no-op
  });
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

async function start() {
  await initializeDatabase();

  server.listen(PORT, HOST, async () => {
    console.log(`Servidor rodando em http://${HOST}:${PORT}`);
    console.log(`Acesso local: http://localhost:${PORT}`);
    const networkUrls = getNetworkUrls(PORT);
    if (networkUrls.length > 0) {
      console.log(`Acesso na rede local: ${networkUrls.join(' | ')}`);
    }
    console.log(`Admin configurado: ${getConfiguredAdminSummary()}`);
    const activity = await addActivity('SYSTEM', 'Servidor iniciado');
    io.emit('activity', activity);
  });
}

start().catch((error) => {
  console.error('Falha ao iniciar o servidor:', error);
  process.exit(1);
});
