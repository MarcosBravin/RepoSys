const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');
const { MongoClient } = require('mongodb');

const DB_FILE = path.join(__dirname, 'app.db');
const LEGACY_DATA_FILE = path.join(__dirname, 'data.json');

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || 'reposicoes';
const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS || 10);
const RESET_DB_ON_START = normalizeText(process.env.RESET_DB_ON_START).toLowerCase();
const IMPORT_LEGACY_SQLITE = normalizeText(process.env.IMPORT_LEGACY_SQLITE, 'false').toLowerCase() === 'true';
const IMPORT_LEGACY_JSON = normalizeText(process.env.IMPORT_LEGACY_JSON, 'false').toLowerCase() === 'true';

let client;
let database;

function normalizeText(value, fallback = '') {
  if (value === null || value === undefined) return fallback;
  return String(value).trim();
}

function sanitizeUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    nome: row.nome,
    email: row.email,
    role: row.role,
    ativo: Boolean(row.ativo),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function connectToDatabase() {
  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI não definida. Configure server/.env antes de iniciar o backend.');
  }

  if (database) return database;

  client = new MongoClient(MONGODB_URI);
  await client.connect();
  database = client.db(MONGODB_DB_NAME);
  return database;
}

function getDb() {
  if (!database) {
    throw new Error('Banco de dados ainda não inicializado.');
  }

  return database;
}

function getCollections() {
  const db = getDb();
  return {
    users: db.collection('users'),
    reposicoes: db.collection('reposicoes'),
    activityLogs: db.collection('activity_logs'),
    notes: db.collection('notes'),
    refreshTokens: db.collection('refresh_tokens'),
    counters: db.collection('counters'),
    appMeta: db.collection('app_meta'),
  };
}

async function ensureIndexes() {
  const { users, reposicoes, activityLogs, notes } = getCollections();

  await ensureIndex(users, { id: 1 }, { unique: true, partialFilterExpression: { id: { $type: 'number' } } });
  await ensureIndex(users, { email: 1 }, { unique: true, partialFilterExpression: { email: { $type: 'string' } } });
  await ensureIndex(reposicoes, { id: 1 }, { unique: true, partialFilterExpression: { id: { $type: 'number' } } });
  await ensureIndex(reposicoes, { nome: 1 });
  await ensureIndex(reposicoes, { status: 1 });
  await ensureIndex(reposicoes, { dia: 1 });
  await ensureIndex(reposicoes, { categoria: 1 });
  await ensureIndex(activityLogs, { created_at: -1 });
  await ensureIndex(notes, { id: 1 }, { unique: true, partialFilterExpression: { id: { $type: 'string' } } });
  await ensureIndex(notes, { updated_at: -1 });
  await ensureIndex(getCollections().refreshTokens, { token: 1 }, { unique: true });
  await ensureIndex(getCollections().refreshTokens, { user_id: 1 });
}

async function ensureIndex(collection, key, options = {}) {
  let indexes = [];

  try {
    indexes = await collection.indexes();
  } catch (error) {
    if (error?.code !== 26 && error?.codeName !== 'NamespaceNotFound') {
      throw error;
    }
  }

  const requestedName = options.name || buildIndexName(key);
  const existing = indexes.find((index) => index.name === requestedName);

  if (existing) {
    const sameKey = JSON.stringify(existing.key) === JSON.stringify(key);
    const wantsUnique = Boolean(options.unique);
    const hasUnique = Boolean(existing.unique);

    if (sameKey && (!wantsUnique || hasUnique)) {
      return existing.name;
    }
  }

  try {
    return await collection.createIndex(key, options);
  } catch (error) {
    if (error?.code === 86 || error?.codeName === 'IndexKeySpecsConflict') {
      return requestedName;
    }
    throw error;
  }
}

function buildIndexName(key) {
  return Object.entries(key)
    .map(([field, direction]) => `${field}_${direction}`)
    .join('_');
}

async function getMetaValue(key) {
  const { appMeta } = getCollections();
  const entry = await appMeta.findOne({ key });
  return entry?.value;
}

async function setMetaValue(key, value) {
  const { appMeta } = getCollections();
  await appMeta.updateOne(
    { key },
    { $set: { key, value } },
    { upsert: true }
  );
}

async function resetDatabaseIfRequested() {
  if (!['true', 'once'].includes(RESET_DB_ON_START)) return;

  const alreadyReset = await getMetaValue('db_reset_once_completed');
  if (RESET_DB_ON_START === 'once' && alreadyReset === 'true') return;

  const db = getDb();
  const collectionNames = ['users', 'reposicoes', 'activity_logs', 'notes', 'refresh_tokens', 'counters', 'app_meta'];

  for (const name of collectionNames) {
    try {
      await db.collection(name).deleteMany({});
    } catch (_error) {
      // Collection may not exist yet.
    }
  }

  await db.collection('counters').updateOne(
    { _id: 'users' },
    { $set: { value: 0 } },
    { upsert: true }
  );
  await db.collection('counters').updateOne(
    { _id: 'reposicoes' },
    { $set: { value: 0 } },
    { upsert: true }
  );
  await db.collection('app_meta').updateOne(
    { key: 'db_reset_once_completed' },
    { $set: { key: 'db_reset_once_completed', value: 'true' } },
    { upsert: true }
  );
}

async function initializeCounter(name, currentValue = 0) {
  const { counters } = getCollections();
  await counters.updateOne(
    { _id: name },
    { $setOnInsert: { value: currentValue } },
    { upsert: true }
  );
}

async function getNextSequence(name) {
  const { counters } = getCollections();
  const result = await counters.findOneAndUpdate(
    { _id: name },
    { $inc: { value: 1 } },
    { upsert: true, returnDocument: 'after' }
  );

  if (typeof result?.value?.value === 'number') {
    return result.value.value;
  }

  if (typeof result?.value === 'number') {
    return result.value;
  }

  if (typeof result?.value?.valueOf?.() === 'number') {
    return result.value.valueOf();
  }

  if (typeof result?.value === 'object' && typeof result?.value?.value === 'number') {
    return result.value.value;
  }

  if (typeof result?.value === 'undefined' && typeof result?.value?.value === 'undefined' && typeof result?.value !== 'number') {
    const counter = await counters.findOne({ _id: name });
    if (typeof counter?.value === 'number') {
      return counter.value;
    }
  }

  if (typeof result?.value === 'object' && typeof result?.value?.value !== 'undefined') {
    return Number(result.value.value);
  }

  if (typeof result?.value !== 'undefined') {
    return Number(result.value);
  }

  const counter = await counters.findOne({ _id: name });
  return Number(counter?.value || 1);
}

async function updateCounterToAtLeast(name, candidate) {
  const { counters } = getCollections();
  await counters.updateOne(
    { _id: name },
    [
      {
        $set: {
          value: {
            $cond: [{ $lt: ['$value', candidate] }, candidate, '$value'],
          },
        },
      },
    ],
    { upsert: true }
  );
}

async function backfillMissingNumericIds(collectionName) {
  const collection = getDb().collection(collectionName);
  const docs = await collection
    .find({
      $or: [
        { id: { $exists: false } },
        { id: null },
        { id: { $not: { $type: 'number' } } },
      ],
    })
    .sort({ created_at: 1, _id: 1 })
    .toArray();

  if (docs.length === 0) return;

  const validIds = await collection.distinct('id', { id: { $type: 'number' } });
  let nextId = validIds.reduce((max, value) => Math.max(max, Number(value) || 0), 0);

  for (const doc of docs) {
    nextId += 1;
    await collection.updateOne(
      { _id: doc._id },
      { $set: { id: nextId } }
    );
  }

  await updateCounterToAtLeast(collectionName, nextId);
}

async function repairLegacyDocuments() {
  await backfillMissingNumericIds('users');
  await backfillMissingNumericIds('reposicoes');
}

function mapLegacyUser(row) {
  return {
    id: Number(row.id),
    nome: normalizeText(row.nome, 'Administrador'),
    email: normalizeText(row.email).toLowerCase(),
    password_hash: row.password_hash,
    role: normalizeText(row.role, 'viewer'),
    ativo: Boolean(row.ativo),
    created_at: row.created_at || new Date().toISOString(),
    updated_at: row.updated_at || new Date().toISOString(),
  };
}

function mapLegacyReposicao(row) {
  return {
    id: Number(row.id),
    nome: normalizeText(row.nome, 'Sem nome'),
    obs: normalizeText(row.obs),
    horario: normalizeText(row.horario),
    status: normalizeText(row.status, 'PENDENTE'),
    categoria: normalizeText(row.categoria, 'GERAL'),
    dia: normalizeText(row.dia, 'SEGUNDA'),
    created_by: row.created_by ?? null,
    updated_by: row.updated_by ?? null,
    created_at: row.created_at || new Date().toISOString(),
    updated_at: row.updated_at || new Date().toISOString(),
  };
}

function mapLegacyActivity(row) {
  return {
    id: row.id || randomUUID(),
    type: normalizeText(row.type, 'SYSTEM'),
    message: normalizeText(row.message),
    data: (() => {
      try {
        return row.data ? JSON.parse(row.data) : {};
      } catch {
        return {};
      }
    })(),
    user_id: row.user_id ?? null,
    created_at: row.created_at || new Date().toISOString(),
  };
}

function mapLegacyNote(row) {
  return {
    id: row.id || randomUUID(),
    title: normalizeText(row.title),
    content: normalizeText(row.content),
    color: normalizeText(row.color, 'sun').toLowerCase(),
    scope: normalizeText(row.scope, 'personal').toLowerCase(),
    pinned: Boolean(row.pinned),
    created_by: row.created_by,
    updated_by: row.updated_by,
    created_at: row.created_at || new Date().toISOString(),
    updated_at: row.updated_at || new Date().toISOString(),
  };
}

async function migrateLegacySqliteIfNeeded() {
  if (!IMPORT_LEGACY_SQLITE) return;
  const migrated = await getMetaValue('legacy_sqlite_migrated');
  if (migrated === 'true') return;
  if (!fs.existsSync(DB_FILE)) return;

  const { users, reposicoes, activityLogs, notes } = getCollections();
  const [userCount, reposicaoCount, activityCount, noteCount] = await Promise.all([
    users.countDocuments(),
    reposicoes.countDocuments(),
    activityLogs.countDocuments(),
    notes.countDocuments(),
  ]);

  if (userCount > 0 || reposicaoCount > 0 || activityCount > 0 || noteCount > 0) {
    await setMetaValue('legacy_sqlite_migrated', 'true');
    return;
  }

  const legacyDb = new Database(DB_FILE, { readonly: true });
  try {
    const legacyUsers = legacyDb.prepare('SELECT * FROM users').all().map(mapLegacyUser);
    const legacyReposicoes = legacyDb.prepare('SELECT * FROM reposicoes').all().map(mapLegacyReposicao);
    const legacyActivity = legacyDb.prepare('SELECT * FROM activity_logs').all().map(mapLegacyActivity);
    const noteTableInfo = legacyDb.prepare("SELECT name FROM pragma_table_info('notes')").all();
    const hasScopeColumn = noteTableInfo.some((column) => column.name === 'scope');
    const legacyNotes = legacyDb.prepare(`
      SELECT id, title, content, color, ${hasScopeColumn ? 'scope' : "'personal' AS scope"}, pinned,
             created_by, updated_by, created_at, updated_at
      FROM notes
    `).all().map(mapLegacyNote);

    if (legacyUsers.length > 0) await users.insertMany(legacyUsers);
    if (legacyReposicoes.length > 0) await reposicoes.insertMany(legacyReposicoes);
    if (legacyActivity.length > 0) await activityLogs.insertMany(legacyActivity);
    if (legacyNotes.length > 0) await notes.insertMany(legacyNotes);

    const maxUserId = legacyUsers.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0);
    const maxReposicaoId = legacyReposicoes.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0);
    await updateCounterToAtLeast('users', maxUserId);
    await updateCounterToAtLeast('reposicoes', maxReposicaoId);
    await setMetaValue('legacy_sqlite_migrated', 'true');
  } finally {
    legacyDb.close();
  }
}

async function ensureConfiguredAdmin() {
  const { users } = getCollections();
  const now = new Date().toISOString();
  const adminEmail = (process.env.ADMIN_EMAIL || 'marcosmv022@gmail.com').toLowerCase();
  const existing = await users.findOne({ email: adminEmail });

  if (existing) {
    const nextUpdate = {
      nome: process.env.ADMIN_NAME || existing.nome || 'Marcos',
      password_hash: bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'Casamv022@', BCRYPT_ROUNDS),
      role: 'admin',
      ativo: true,
      updated_at: now,
    };

    if (typeof existing.id !== 'number') {
      nextUpdate.id = await getNextSequence('users');
    } else {
      await updateCounterToAtLeast('users', existing.id);
    }

    await users.updateOne({ _id: existing._id }, { $set: nextUpdate });
    return;
  }

  const adminId = await getNextSequence('users');
  await users.insertOne({
    id: adminId,
    nome: process.env.ADMIN_NAME || 'Marcos',
    email: adminEmail,
    password_hash: bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'Casamv022@', BCRYPT_ROUNDS),
    role: 'admin',
    ativo: true,
    created_at: now,
    updated_at: now,
  });
}

async function seedReposicoesFromJson() {
  if (!IMPORT_LEGACY_JSON) return;
  const seededMeta = await getMetaValue('legacy_reposicoes_seeded');
  if (seededMeta === 'true') return;

  const { reposicoes } = getCollections();
  const count = await reposicoes.countDocuments();

  if (count > 0 || !fs.existsSync(LEGACY_DATA_FILE)) {
    await setMetaValue('legacy_reposicoes_seeded', 'true');
    return;
  }

  const raw = JSON.parse(fs.readFileSync(LEGACY_DATA_FILE, 'utf-8'));
  const now = new Date().toISOString();
  const items = raw.map((item) => ({
    id: Number(item.id),
    nome: normalizeText(item.nome, 'Sem nome'),
    obs: normalizeText(item.obs),
    horario: normalizeText(item.horario),
    status: normalizeText(item.status, 'PENDENTE'),
    categoria: normalizeText(item.categoria, 'GERAL'),
    dia: normalizeText(item.dia, 'SEGUNDA'),
    created_by: null,
    updated_by: null,
    created_at: now,
    updated_at: now,
  }));

  if (items.length > 0) {
    await reposicoes.insertMany(items);
    const maxReposicaoId = items.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0);
    await updateCounterToAtLeast('reposicoes', maxReposicaoId);
  }

  await setMetaValue('legacy_reposicoes_seeded', 'true');
}

async function initializeDatabase() {
  await connectToDatabase();
  await resetDatabaseIfRequested();
  await initializeCounter('users', 0);
  await initializeCounter('reposicoes', 0);
  await repairLegacyDocuments();
  await ensureIndexes();
  await migrateLegacySqliteIfNeeded();
  await ensureConfiguredAdmin();
  await seedReposicoesFromJson();
}

async function getUserById(id) {
  const { users } = getCollections();
  return users.findOne({ id: Number(id), ativo: true });
}

async function getUserByEmail(email) {
  const { users } = getCollections();
  return users.findOne({ email: normalizeText(email).toLowerCase() });
}

async function listUsers() {
  const { users } = getCollections();
  const rows = await users.find({}).toArray();
  return rows.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }));
}

async function createUser({ nome, email, password, role, ativo }) {
  const { users } = getCollections();
  const id = await getNextSequence('users');
  const now = new Date().toISOString();
  const user = {
    id,
    nome,
    email,
    password_hash: bcrypt.hashSync(password, BCRYPT_ROUNDS),
    role,
    ativo: Boolean(ativo),
    created_at: now,
    updated_at: now,
  };

  await users.insertOne(user);
  return user;
}

async function updateUser(id, updates) {
  const { users } = getCollections();
  const next = {
    ...updates,
    updated_at: new Date().toISOString(),
  };

  if (next.password) {
    next.password_hash = bcrypt.hashSync(next.password, BCRYPT_ROUNDS);
    delete next.password;
  }

  await users.updateOne({ id: Number(id) }, { $set: next });
  return users.findOne({ id: Number(id) });
}

async function resolveUserNames(userIds) {
  const ids = Array.from(new Set(userIds.filter((value) => value !== null && value !== undefined).map(Number)));
  if (ids.length === 0) return new Map();

  const { users } = getCollections();
  const rows = await users.find({ id: { $in: ids } }).toArray();
  return new Map(rows.map((row) => [row.id, row.nome]));
}

function serializeActivity(row, userNames = new Map()) {
  return {
    id: row.id,
    type: row.type,
    message: row.message,
    data: row.data || {},
    userId: row.user_id ?? null,
    userName: row.user_name || userNames.get(Number(row.user_id)) || null,
    timestamp: row.created_at,
  };
}

async function addActivity(type, message, data = {}, userId = null) {
  const { activityLogs } = getCollections();
  const entry = {
    id: randomUUID(),
    type,
    message,
    data,
    user_id: userId ?? null,
    created_at: new Date().toISOString(),
  };

  await activityLogs.insertOne(entry);
  const userNames = await resolveUserNames([userId]);
  return serializeActivity(entry, userNames);
}

async function getRecentActivity(limit = 50) {
  const { activityLogs } = getCollections();
  const rows = await activityLogs.find({}).sort({ created_at: -1 }).limit(limit).toArray();
  const userNames = await resolveUserNames(rows.map((row) => row.user_id));
  return rows.map((row) => serializeActivity(row, userNames));
}

async function listNotes({ user, search = '' }) {
  const { notes } = getCollections();
  const query = {};

  if (user.role !== 'admin') {
    query.$or = [{ scope: 'general' }, { created_by: Number(user.id) }];
  }

  if (search) {
    const regex = new RegExp(escapeRegExp(search), 'i');
    query.$and = [{ $or: [{ title: regex }, { content: regex }] }];
  }

  const rows = await notes.find(query).sort({ pinned: -1, updated_at: -1 }).toArray();
  return serializeNotes(rows);
}

function serializeNote(row, userNames = new Map()) {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    color: row.color,
    scope: row.scope,
    pinned: Boolean(row.pinned),
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    authorName: userNames.get(Number(row.created_by)) || null,
    updaterName: userNames.get(Number(row.updated_by)) || null,
  };
}

async function serializeNotes(rows) {
  const userNames = await resolveUserNames(
    rows.flatMap((row) => [row.created_by, row.updated_by])
  );
  return rows.map((row) => serializeNote(row, userNames));
}

async function getNoteById(id) {
  const { notes } = getCollections();
  return notes.findOne({ id });
}

async function createNote({ title, content, color, scope, pinned, userId }) {
  const { notes } = getCollections();
  const now = new Date().toISOString();
  const note = {
    id: randomUUID(),
    title,
    content,
    color,
    scope,
    pinned: Boolean(pinned),
    created_by: Number(userId),
    updated_by: Number(userId),
    created_at: now,
    updated_at: now,
  };

  await notes.insertOne(note);
  const serialized = await serializeNotes([note]);
  return serialized[0];
}

async function updateNote(id, updates) {
  const { notes } = getCollections();
  const next = {
    ...updates,
    updated_at: new Date().toISOString(),
  };

  await notes.updateOne({ id }, { $set: next });
  const updated = await notes.findOne({ id });
  const serialized = await serializeNotes([updated]);
  return serialized[0];
}

async function deleteNote(id) {
  const { notes } = getCollections();
  await notes.deleteOne({ id });
}

async function listReposicoes(filters = {}) {
  const { reposicoes } = getCollections();
  const query = {};

  if (filters.search) {
    const regex = new RegExp(escapeRegExp(filters.search), 'i');
    query.$or = [{ nome: regex }, { obs: regex }, { horario: regex }];
  }
  if (filters.status && filters.status !== 'TODOS') {
    query.status = filters.status;
  }
  if (filters.dia && filters.dia !== 'TODOS') {
    query.dia = filters.dia;
  }
  if (filters.categoria && filters.categoria !== 'TODOS') {
    query.categoria = filters.categoria;
  }

  const rows = await reposicoes.find(query).toArray();
  return rows.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }));
}

async function getReposicaoById(id) {
  const { reposicoes } = getCollections();
  return reposicoes.findOne({ id: Number(id) });
}

async function createReposicao(data) {
  const { reposicoes } = getCollections();
  const now = new Date().toISOString();
  const id = await getNextSequence('reposicoes');
  const item = {
    id,
    nome: data.nome,
    obs: data.obs,
    horario: data.horario,
    status: data.status,
    categoria: data.categoria,
    dia: data.dia,
    created_by: Number(data.userId),
    updated_by: Number(data.userId),
    created_at: now,
    updated_at: now,
  };

  await reposicoes.insertOne(item);
  return item;
}

async function updateReposicao(id, updates) {
  const { reposicoes } = getCollections();
  const next = {
    ...updates,
    updated_at: new Date().toISOString(),
  };

  await reposicoes.updateOne({ id: Number(id) }, { $set: next });
  return reposicoes.findOne({ id: Number(id) });
}

async function deleteReposicao(id) {
  const { reposicoes } = getCollections();
  await reposicoes.deleteOne({ id: Number(id) });
}

async function computeStats() {
  const { reposicoes } = getCollections();
  const rows = await reposicoes.find({}).toArray();

  const stats = {
    total: rows.length,
    confirmadas: 0,
    concluidas: 0,
    pendentes: 0,
    aguardandoDoc: 0,
    porDia: {},
    porCategoria: {},
  };

  rows.forEach((row) => {
    if (row.status === 'SIM') stats.confirmadas += 1;
    if (row.status === 'FEITO') stats.concluidas += 1;
    if (row.status === 'PENDENTE') stats.pendentes += 1;
    if (row.categoria === 'AGUARDANDO DOC') stats.aguardandoDoc += 1;

    stats.porDia[row.dia] = (stats.porDia[row.dia] || 0) + 1;
    stats.porCategoria[row.categoria] = (stats.porCategoria[row.categoria] || 0) + 1;
  });

  return stats;
}

async function saveRefreshToken({ token, userId, expiresAt }) {
  const { refreshTokens } = getCollections();
  await refreshTokens.insertOne({
    token,
    user_id: Number(userId),
    expires_at: expiresAt,
    created_at: new Date().toISOString(),
  });
}

async function getRefreshToken(token) {
  const { refreshTokens } = getCollections();
  return refreshTokens.findOne({ token });
}

async function deleteRefreshToken(token) {
  const { refreshTokens } = getCollections();
  await refreshTokens.deleteOne({ token });
}

async function deleteRefreshTokensByUserId(userId) {
  const { refreshTokens } = getCollections();
  await refreshTokens.deleteMany({ user_id: Number(userId) });
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = {
  addActivity,
  computeStats,
  createNote,
  createReposicao,
  createUser,
  deleteNote,
  deleteReposicao,
  getRecentActivity,
  getReposicaoById,
  getUserByEmail,
  getUserById,
  getNoteById,
  initializeDatabase,
  listNotes,
  listReposicoes,
  listUsers,
  normalizeText,
  deleteRefreshToken,
  deleteRefreshTokensByUserId,
  getRefreshToken,
  saveRefreshToken,
  sanitizeUser,
  updateNote,
  updateReposicao,
  updateUser,
};
