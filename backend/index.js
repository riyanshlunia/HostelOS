import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { promises as fsp } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = Number(process.env.PORT) || 4000;
const DATA_FILE = path.join(__dirname, 'data.json');
const DIST_DIR = path.join(__dirname, '..', 'dist');
const AUTH_SECRET = process.env.AUTH_SECRET || 'campus-hub-demo-secret';
const CORS_ORIGIN = process.env.CORS_ORIGIN || true;

class HttpError extends Error {
  constructor(status, message, code = 'REQUEST_ERROR', details) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const fail = (status, message, code, details) => {
  throw new HttpError(status, message, code, details);
};

const asyncRoute = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

const now = () => new Date().toISOString();
const dateOnly = (value = new Date()) => new Date(value).toISOString().slice(0, 10);
const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;
const cleanString = (value) => (typeof value === 'string' ? value.trim() : value);
const asNumber = (value) => {
  const result = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(result) ? result : null;
};
const isValidDate = (value) => typeof value === 'string' && !Number.isNaN(Date.parse(value));
const makeId = (prefix, collection) => {
  const max = collection.reduce((highest, item) => {
    const match = String(item.id || '').match(/(\d+)$/);
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 0);
  return `${prefix}-${String(max + 1).padStart(3, '0')}`;
};

const safeUser = (user) => {
  if (!user) return null;
  const { password, ...publicUser } = user;
  return publicUser;
};

let store;

class JsonStore {
  constructor(file) {
    this.file = file;
    this.data = null;
    this.writeQueue = Promise.resolve();
  }

  load() {
    try {
      this.data = JSON.parse(fs.readFileSync(this.file, 'utf8'));
    } catch (error) {
      throw new Error(`Unable to read ${this.file}: ${error.message}`);
    }
    return this.data;
  }

  save() {
    const snapshot = JSON.stringify(this.data, null, 2) + '\n';
    const temp = `${this.file}.${process.pid}.${crypto.randomUUID()}.tmp`;
    this.writeQueue = this.writeQueue
      .catch(() => undefined)
      .then(async () => {
        await fsp.writeFile(temp, snapshot, { encoding: 'utf8', mode: 0o600 });
        // A rename of a complete temporary file prevents readers from seeing partial JSON.
        await fsp.rename(temp, this.file);
      });
    return this.writeQueue.finally(() => fsp.rm(temp, { force: true }).catch(() => undefined));
  }
}

store = new JsonStore(DATA_FILE);
const db = store.load();

const listResponse = (res, items, meta = {}) => {
  res.json({ data: items, meta: { count: items.length, ...meta } });
};

const paginate = (items, query) => {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const requestedLimit = Number.parseInt(query.limit, 10);
  const limit = Math.min(100, Math.max(1, requestedLimit || 25));
  const total = items.length;
  const start = (page - 1) * limit;
  return {
    items: items.slice(start, start + limit),
    meta: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
  };
};

const requireFields = (body, fields) => {
  const missing = fields.filter((field) => !isNonEmptyString(body[field]) && body[field] !== 0);
  if (missing.length) fail(400, `Missing required field${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}`, 'VALIDATION_ERROR', { fields: missing });
};

const optionalEnum = (value, allowed, field) => {
  if (value === undefined || value === null || value === '') return;
  if (!allowed.includes(value)) fail(400, `${field} must be one of: ${allowed.join(', ')}`, 'VALIDATION_ERROR', { field, allowed });
};

const normalizedToken = (value) => String(value || '').trim().toLowerCase().replace(/[ -]+/g, '_');
const normalizeResidentStatus = (value) => ({ 'notice_period': 'inactive', 'checked_out': 'inactive', pending: 'pending' }[normalizedToken(value)] || normalizedToken(value));
const normalizeComplaintStatus = (value) => ({ 'in_progress': 'in_progress', resolved: 'resolved', closed: 'closed', open: 'open' }[normalizedToken(value)] || normalizedToken(value));
const normalizeVisitorStatus = (value) => ({ expected: 'pending', approved: 'approved', 'checked_in': 'checked_in', 'checked_out': 'checked_out', rejected: 'rejected' }[normalizedToken(value)] || normalizedToken(value));
const findResidentReference = (value) => {
  if (!value) return null;
  return db.residents.find((resident) => resident.id === value || resident.name.toLowerCase() === String(value).trim().toLowerCase()) || null;
};

const optionalDate = (value, field) => {
  if (value !== undefined && value !== null && value !== '' && !isValidDate(value)) {
    fail(400, `${field} must be a valid ISO date`, 'VALIDATION_ERROR', { field });
  }
};

const findById = (collection, id, label) => {
  const item = collection.find((entry) => String(entry.id) === String(id));
  if (!item) fail(404, `${label} not found`, 'NOT_FOUND');
  return item;
};

const roomByBed = (bedId) => {
  const room = db.rooms.find((candidate) => candidate.beds.some((bed) => String(bed.id) === String(bedId)));
  if (!room) fail(404, 'Bed not found', 'NOT_FOUND');
  return room;
};

const getBed = (room, bedId) => findById(room.beds, bedId, 'Bed');

const residentView = (resident) => {
  if (!resident) return null;
  const room = db.rooms.find((candidate) => candidate.id === resident.roomId);
  return {
    ...resident,
    room: room ? { id: room.id, number: room.number, block: room.block, floor: room.floor } : null,
    bed: room && resident.bedId ? room.beds.find((bed) => bed.id === resident.bedId) || null : null,
  };
};

const roomView = (room) => {
  const beds = Array.isArray(room.beds) ? room.beds : [];
  const occupied = beds.filter((bed) => bed.status === 'occupied').length;
  const available = beds.filter((bed) => bed.status === 'available').length;
  return {
    ...room,
    beds,
    occupiedBeds: occupied,
    availableBeds: available,
    occupancy: beds.length ? Math.round((occupied / beds.length) * 100) : 0,
  };
};

const refreshRoomStatus = (room) => {
  if (room.status === 'maintenance') return;
  const occupied = room.beds.filter((bed) => bed.status === 'occupied').length;
  room.status = occupied === 0 ? 'available' : occupied === room.beds.length ? 'full' : 'partial';
};

const updateBed = (room, bed, changes) => {
  if (changes.status !== undefined) {
    optionalEnum(changes.status, ['available', 'occupied', 'maintenance'], 'status');
    if (changes.status === 'occupied' && !bed.residentId && !changes.residentId) {
      fail(400, 'An occupied bed must have a residentId', 'VALIDATION_ERROR');
    }
    bed.status = changes.status;
  }
  if (changes.residentId !== undefined) {
    if (changes.residentId !== null) findById(db.residents, changes.residentId, 'Resident');
    bed.residentId = changes.residentId || null;
  }
  if (changes.moveInDate !== undefined) {
    optionalDate(changes.moveInDate, 'moveInDate');
    bed.moveInDate = changes.moveInDate || null;
  }
  refreshRoomStatus(room);
};

const record = async (mutator) => {
  const value = await mutator();
  await store.save();
  return value;
};

const searchMatch = (values, search) => {
  if (!search) return true;
  const needle = String(search).toLowerCase();
  return values.some((value) => String(value || '').toLowerCase().includes(needle));
};

const tokenFor = (user) => {
  const payload = `${user.id}:${Date.now()}`;
  const signature = crypto.createHmac('sha256', AUTH_SECRET).update(payload).digest('hex');
  return Buffer.from(`${payload}:${signature}`).toString('base64url');
};

const userFromRequest = (req) => {
  const header = req.get('authorization') || '';
  if (!header.toLowerCase().startsWith('bearer ')) return null;
  try {
    const decoded = Buffer.from(header.slice(7).trim(), 'base64url').toString('utf8');
    const parts = decoded.split(':');
    if (parts.length !== 3) return null;
    const [userId, issuedAt, signature] = parts;
    const expected = crypto.createHmac('sha256', AUTH_SECRET).update(`${userId}:${issuedAt}`).digest('hex');
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
    if (Date.now() - Number(issuedAt) > 7 * 24 * 60 * 60 * 1000) return null;
    return db.users.find((user) => user.id === userId) || null;
  } catch (_) {
    return null;
  }
};

// Middleware is deliberately frontend-friendly: CORS can be tightened by a reverse proxy,
// while API clients may use JSON and receive a consistent request id and log line.
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({ origin: CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use((req, res, next) => {
  const requestId = req.get('x-request-id') || crypto.randomUUID();
  req.requestId = requestId;
  res.setHeader('x-request-id', requestId);
  req.user = userFromRequest(req);
  const started = Date.now();
  res.on('finish', () => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - started}ms`);
  });
  next();
});

app.get('/api/health', (req, res) => {
  res.json({ data: { status: 'ok', service: 'havenly-os-api', timestamp: now() } });
});

// Demo authentication. The token is intentionally lightweight and is not a replacement for
// production identity infrastructure. It makes the API immediately usable by a demo frontend.
app.post('/api/auth/login', asyncRoute(async (req, res) => {
  const body = req.body || {};
  const identity = cleanString(body.email || body.username || body.identifier || '');
  const password = String(body.password || '');
  if (!identity || !password) fail(400, 'email (or username) and password are required', 'VALIDATION_ERROR');
  const user = db.users.find((candidate) =>
    (candidate.email.toLowerCase() === identity.toLowerCase() || candidate.username?.toLowerCase() === identity.toLowerCase()) && candidate.password === password,
  );
  if (!user) fail(401, 'Invalid demo credentials', 'INVALID_CREDENTIALS');
  res.json({ data: { token: tokenFor(user), user: safeUser(user) } });
}));

app.get('/api/auth/me', (req, res) => {
  if (!req.user) fail(401, 'A valid bearer token is required', 'UNAUTHORIZED');
  res.json({ data: safeUser(req.user) });
});

app.post('/api/auth/logout', (req, res) => {
  res.json({ data: { success: true } });
});

const dashboardStats = (req, res) => {
  const totalBeds = db.rooms.reduce((sum, room) => sum + room.beds.length, 0);
  const occupiedBeds = db.rooms.reduce((sum, room) => sum + room.beds.filter((bed) => bed.status === 'occupied').length, 0);
  const currentMonth = dateOnly().slice(0, 7);
  const paidThisMonth = db.payments.filter((payment) => payment.status === 'paid' && String(payment.paidAt || '').startsWith(currentMonth));
  const openComplaints = db.complaints.filter((complaint) => !['resolved', 'closed'].includes(complaint.status));
  const stats = {
    residents: { total: db.residents.length, active: db.residents.filter((resident) => resident.status === 'active').length },
    rooms: { total: db.rooms.length, available: db.rooms.filter((room) => room.status === 'available').length, full: db.rooms.filter((room) => room.status === 'full').length },
    beds: { total: totalBeds, occupied: occupiedBeds, available: totalBeds - occupiedBeds, occupancyRate: totalBeds ? Math.round((occupiedBeds / totalBeds) * 100) : 0 },
    complaints: { total: db.complaints.length, open: openComplaints.length, urgent: openComplaints.filter((item) => item.priority === 'urgent').length },
    payments: { total: db.payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0), paidThisMonth: paidThisMonth.reduce((sum, payment) => sum + Number(payment.amount || 0), 0), pending: db.payments.filter((payment) => ['pending', 'overdue'].includes(payment.status)).length },
    visitors: { pending: db.visitors.filter((visitor) => visitor.status === 'pending').length, checkedIn: db.visitors.filter((visitor) => visitor.status === 'checked_in').length },
    mess: { attendanceToday: db.attendance.filter((item) => item.date === dateOnly() && item.status === 'present').length },
    notices: { published: db.notices.filter((notice) => notice.status === 'published').length },
  };
  res.json({ data: stats });
};
app.get('/api/dashboard/stats', dashboardStats);
app.get('/api/dashboard', dashboardStats);
app.get('/api/stats', dashboardStats);

// A compact adapter for the included React demo. The resource endpoints above use the
// consistent { data, meta } envelope; bootstrap keeps the view-model keys flat.
app.get('/api/bootstrap', (req, res) => {
  const initials = (name) => String(name || '').split(/\s+/).filter(Boolean).map((part) => part[0]).join('').slice(0, 2).toUpperCase();
  const residentRows = db.residents.map((resident) => {
    const view = residentView(resident);
    return { id: resident.id, name: resident.name, initials: initials(resident.name), room: view.room ? `${view.room.block}-${view.room.number} · ${view.bed?.label || 'Unassigned'}` : 'Unassigned', property: view.room?.block === 'B' ? 'Lakeview Co-living' : 'Northside House', status: resident.status === 'active' ? 'Active' : resident.status === 'pending' ? 'Pending' : 'Checked out', lease: `${resident.joinedOn || '—'} — Present`, amount: '₹18,500', phone: resident.phone || '—', tone: 'mint' };
  });
  const complaintRows = db.complaints.map((complaint) => {
    const resident = findResidentReference(complaint.residentId);
    const room = resident ? residentView(resident).room : null;
    return { id: complaint.id, title: complaint.title, resident: resident?.name || 'Unassigned', room: room ? `${room.block}-${room.number}` : '—', category: complaint.category, priority: complaint.priority[0].toUpperCase() + complaint.priority.slice(1), status: complaint.status === 'in_progress' ? 'In progress' : complaint.status[0].toUpperCase() + complaint.status.slice(1), age: complaint.createdAt, assignee: 'Unassigned' };
  });
  const visitorRows = db.visitors.map((visitor) => {
    const resident = findResidentReference(visitor.residentId);
    return { id: visitor.id, name: visitor.visitorName, resident: `${resident?.name || 'Unknown resident'}${resident?.roomId ? ` · ${residentView(resident).room?.block}-${residentView(resident).room?.number}` : ''}`, purpose: visitor.purpose, property: 'Northside House', time: visitor.expectedAt || visitor.visitDate, status: visitor.status === 'pending' ? 'Expected' : visitor.status === 'checked_in' ? 'Checked in' : visitor.status === 'checked_out' ? 'Checked out' : visitor.status[0].toUpperCase() + visitor.status.slice(1), initials: initials(visitor.visitorName) };
  });
  const noticeRows = db.notices.filter((notice) => notice.status === 'published').map((notice) => ({ id: notice.id, title: notice.title, excerpt: notice.content, audience: notice.audience === 'all' ? 'All residents' : notice.audience, author: db.users.find((user) => user.id === notice.authorId)?.name || 'Community team', date: notice.publishedAt || notice.createdAt, read: '0% read', priority: 'General', color: 'notice-blue' }));
  const roomRows = db.rooms.map((room) => ({ id: room.id, name: `${room.block}-${room.number}`, floor: `${room.floor}${room.floor === 1 ? 'st' : room.floor === 2 ? 'nd' : room.floor === 3 ? 'rd' : 'th'} floor`, type: room.type, occupied: room.beds.filter((bed) => bed.status === 'occupied').length, capacity: room.capacity, status: room.status === 'maintenance' ? 'Maintenance' : 'Good', residents: room.beds.map((bed) => db.residents.find((resident) => resident.id === bed.residentId)?.name).filter(Boolean), accent: 'room-green' }));
  res.json({ residents: residentRows, complaints: complaintRows, visitors: visitorRows, notices: noticeRows, rooms: roomRows });
});

// Rooms and beds
app.get('/api/rooms', (req, res) => {
  let rooms = db.rooms.filter((room) => {
    if (req.query.block && room.block !== req.query.block) return false;
    if (req.query.status && room.status !== req.query.status) return false;
    if (req.query.availableOnly === 'true' && !room.beds.some((bed) => bed.status === 'available')) return false;
    return searchMatch([room.number, room.block, room.type, room.floor], req.query.search);
  }).map(roomView);
  const result = paginate(rooms, req.query);
  listResponse(res, result.items, result.meta);
});

app.post('/api/rooms', asyncRoute(async (req, res) => {
  const body = req.body || {};
  requireFields(body, ['number', 'block']);
  const capacity = asNumber(body.capacity || (Array.isArray(body.beds) ? body.beds.length : 0));
  if (!capacity || capacity < 1 || capacity > 20 || !Number.isInteger(capacity)) fail(400, 'capacity must be an integer from 1 to 20', 'VALIDATION_ERROR');
  if (db.rooms.some((room) => room.number.toLowerCase() === String(body.number).trim().toLowerCase())) fail(409, 'A room with this number already exists', 'DUPLICATE');
  const beds = Array.isArray(body.beds) && body.beds.length
    ? body.beds.map((bed, index) => ({ id: bed.id || `${String(body.number).trim()}-${index + 1}`, label: bed.label || `Bed ${index + 1}`, status: bed.status || 'available', residentId: bed.residentId || null, moveInDate: bed.moveInDate || null }))
    : Array.from({ length: capacity }, (_, index) => ({ id: `${String(body.number).trim()}-${index + 1}`, label: `Bed ${index + 1}`, status: 'available', residentId: null, moveInDate: null }));
  beds.forEach((bed) => optionalEnum(bed.status, ['available', 'occupied', 'maintenance'], 'bed.status'));
  const room = { id: makeId('room', db.rooms), number: cleanString(body.number), block: cleanString(body.block), floor: body.floor ?? 1, type: cleanString(body.type || 'standard'), capacity, gender: cleanString(body.gender || 'mixed'), amenities: Array.isArray(body.amenities) ? body.amenities : [], status: 'available', beds, createdAt: now() };
  refreshRoomStatus(room);
  await record(() => { db.rooms.push(room); return room; });
  res.status(201).json({ data: roomView(room) });
}));

app.get('/api/rooms/:roomId', (req, res) => res.json({ data: roomView(findById(db.rooms, req.params.roomId, 'Room')) }));
app.get('/api/rooms/:roomId/beds', (req, res) => {
  const room = findById(db.rooms, req.params.roomId, 'Room');
  listResponse(res, room.beds, { roomId: room.id });
});

const patchRoom = asyncRoute(async (req, res) => {
  const room = findById(db.rooms, req.params.roomId, 'Room');
  const body = req.body || {};
  ['number', 'block', 'type', 'gender'].forEach((field) => { if (body[field] !== undefined) { if (!isNonEmptyString(body[field])) fail(400, `${field} must be a non-empty string`, 'VALIDATION_ERROR'); room[field] = cleanString(body[field]); } });
  ['floor', 'capacity'].forEach((field) => { if (body[field] !== undefined) { const value = asNumber(body[field]); if (value === null || value < 1 || !Number.isInteger(value)) fail(400, `${field} must be a positive integer`, 'VALIDATION_ERROR'); room[field] = value; } });
  if (body.amenities !== undefined) { if (!Array.isArray(body.amenities)) fail(400, 'amenities must be an array', 'VALIDATION_ERROR'); room.amenities = body.amenities.map(cleanString).filter(Boolean); }
  if (body.status !== undefined) { optionalEnum(body.status, ['available', 'partial', 'full', 'maintenance'], 'status'); room.status = body.status; }
  if (room.capacity < room.beds.length) fail(400, 'capacity cannot be less than the number of existing beds', 'VALIDATION_ERROR');
  await record(() => room);
  res.json({ data: roomView(room) });
});
app.patch('/api/rooms/:roomId', patchRoom);
app.put('/api/rooms/:roomId', patchRoom);
const patchRoomStatus = asyncRoute(async (req, res) => {
  const room = findById(db.rooms, req.params.roomId, 'Room');
  optionalEnum(req.body?.status, ['available', 'partial', 'full', 'maintenance'], 'status');
  if (!req.body?.status) fail(400, 'status is required', 'VALIDATION_ERROR');
  room.status = req.body.status;
  await record(() => room);
  res.json({ data: roomView(room) });
});
app.patch('/api/rooms/:roomId/status', patchRoomStatus);
app.put('/api/rooms/:roomId/status', patchRoomStatus);

const patchBed = asyncRoute(async (req, res) => {
  const room = findById(db.rooms, req.params.roomId, 'Room');
  const bed = getBed(room, req.params.bedId);
  updateBed(room, bed, req.body || {});
  await record(() => ({ room: roomView(room), bed }));
  res.json({ data: bed, meta: { roomId: room.id } });
});
app.patch('/api/rooms/:roomId/beds/:bedId', patchBed);
app.put('/api/rooms/:roomId/beds/:bedId', patchBed);
app.patch('/api/beds/:bedId', asyncRoute(async (req, res) => {
  const room = roomByBed(req.params.bedId);
  const bed = getBed(room, req.params.bedId);
  updateBed(room, bed, req.body || {});
  await record(() => room);
  res.json({ data: bed, meta: { roomId: room.id } });
}));
const patchBedStatus = asyncRoute(async (req, res) => {
  if (!req.body?.status) fail(400, 'status is required', 'VALIDATION_ERROR');
  const room = req.params.roomId ? findById(db.rooms, req.params.roomId, 'Room') : roomByBed(req.params.bedId);
  const bed = getBed(room, req.params.bedId);
  updateBed(room, bed, { status: req.body.status, residentId: req.body.residentId });
  await record(() => room);
  res.json({ data: bed, meta: { roomId: room.id } });
});
app.patch('/api/rooms/:roomId/beds/:bedId/status', patchBedStatus);
app.put('/api/rooms/:roomId/beds/:bedId/status', patchBedStatus);
app.patch('/api/beds/:bedId/status', patchBedStatus);
app.put('/api/beds/:bedId/status', patchBedStatus);

const moveIn = asyncRoute(async (req, res) => {
  const room = findById(db.rooms, req.params.roomId, 'Room');
  const bed = getBed(room, req.params.bedId);
  const body = req.body || {};
  if (bed.status === 'occupied' || bed.residentId) fail(409, 'Bed is already occupied', 'BED_OCCUPIED');
  if (bed.status === 'maintenance') fail(409, 'Bed is under maintenance', 'BED_UNAVAILABLE');
  let resident;
  if (body.residentId) {
    resident = findById(db.residents, body.residentId, 'Resident');
    if (resident.bedId) fail(409, 'Resident is already assigned to a bed', 'RESIDENT_ALREADY_ASSIGNED');
  } else {
    requireFields(body, ['name']);
    resident = { id: makeId('resident', db.residents), admissionNo: cleanString(body.admissionNo || `ADM-${new Date().getFullYear()}-${String(db.residents.length + 1).padStart(3, '0')}`), name: cleanString(body.name), email: cleanString(body.email || ''), phone: cleanString(body.phone || ''), course: cleanString(body.course || ''), year: body.year || 1, guardianName: cleanString(body.guardianName || ''), guardianPhone: cleanString(body.guardianPhone || ''), status: 'active', roomId: null, bedId: null, joinedOn: body.joinedOn || dateOnly(), createdAt: now() };
    db.residents.push(resident);
  }
  const moveInDate = body.moveInDate || dateOnly();
  optionalDate(moveInDate, 'moveInDate');
  bed.status = 'occupied';
  bed.residentId = resident.id;
  bed.moveInDate = moveInDate;
  resident.roomId = room.id;
  resident.bedId = bed.id;
  resident.status = 'active';
  refreshRoomStatus(room);
  await store.save();
  res.status(201).json({ data: { resident: residentView(resident), room: roomView(room), bed } });
});
app.post('/api/rooms/:roomId/beds/:bedId/move-in', moveIn);
app.post('/api/beds/:bedId/move-in', asyncRoute(async (req, res, next) => {
  const room = roomByBed(req.params.bedId);
  req.params.roomId = room.id;
  return moveIn(req, res, next);
}));

const moveOut = asyncRoute(async (req, res) => {
  const room = findById(db.rooms, req.params.roomId, 'Room');
  const bed = getBed(room, req.params.bedId);
  const resident = bed.residentId ? db.residents.find((item) => item.id === bed.residentId) : null;
  bed.status = 'available';
  bed.residentId = null;
  bed.moveInDate = null;
  if (resident) { resident.roomId = null; resident.bedId = null; resident.status = 'inactive'; }
  refreshRoomStatus(room);
  await record(() => room);
  res.json({ data: { room: roomView(room), bed, resident: residentView(resident) } });
});
app.post('/api/rooms/:roomId/beds/:bedId/move-out', moveOut);
app.post('/api/beds/:bedId/move-out', asyncRoute(async (req, res, next) => { const room = roomByBed(req.params.bedId); req.params.roomId = room.id; return moveOut(req, res, next); }));

// Residents
app.get('/api/residents', (req, res) => {
  let residents = db.residents.filter((resident) => {
    if (req.query.status && resident.status !== req.query.status) return false;
    return searchMatch([resident.name, resident.email, resident.phone, resident.admissionNo, resident.course], req.query.search);
  }).map(residentView);
  const result = paginate(residents, req.query);
  listResponse(res, result.items, result.meta);
});
app.post('/api/residents', asyncRoute(async (req, res) => {
  const body = req.body || {};
  requireFields(body, ['name']);
  if (body.email && !/^\S+@\S+\.\S+$/.test(body.email)) fail(400, 'email must be valid', 'VALIDATION_ERROR');
  const admissionNo = cleanString(body.admissionNo || `ADM-${new Date().getFullYear()}-${String(db.residents.length + 1).padStart(3, '0')}`);
  if (db.residents.some((resident) => resident.admissionNo === admissionNo)) fail(409, 'admissionNo already exists', 'DUPLICATE');
  const resident = { id: makeId('resident', db.residents), admissionNo, name: cleanString(body.name), email: cleanString(body.email || ''), phone: cleanString(body.phone || ''), course: cleanString(body.course || ''), year: body.year || 1, guardianName: cleanString(body.guardianName || ''), guardianPhone: cleanString(body.guardianPhone || ''), status: normalizeResidentStatus(body.status || 'active'), roomId: null, bedId: null, joinedOn: body.joinedOn || body.moveIn || dateOnly(), createdAt: now() };
  optionalEnum(resident.status, ['active', 'inactive', 'alumni', 'pending'], 'status');
  optionalDate(resident.joinedOn, 'joinedOn');
  await record(() => { db.residents.push(resident); return resident; });
  res.status(201).json({ data: residentView(resident) });
}));
app.get('/api/residents/:residentId', (req, res) => res.json({ data: residentView(findById(db.residents, req.params.residentId, 'Resident')) }));

const patchResident = asyncRoute(async (req, res) => {
  const resident = findById(db.residents, req.params.residentId, 'Resident');
  const body = req.body || {};
  const editable = ['name', 'email', 'phone', 'course', 'guardianName', 'guardianPhone', 'admissionNo', 'joinedOn', 'year', 'status'];
  editable.forEach((field) => { if (body[field] !== undefined) resident[field] = typeof body[field] === 'string' ? cleanString(body[field]) : body[field]; });
  if (body.status !== undefined) resident.status = normalizeResidentStatus(body.status);
  if (!isNonEmptyString(resident.name)) fail(400, 'name must be a non-empty string', 'VALIDATION_ERROR');
  if (body.email && !/^\S+@\S+\.\S+$/.test(body.email)) fail(400, 'email must be valid', 'VALIDATION_ERROR');
  optionalEnum(resident.status, ['active', 'inactive', 'alumni', 'pending'], 'status');
  optionalDate(resident.joinedOn, 'joinedOn');
  await record(() => resident);
  res.json({ data: residentView(resident) });
});
app.patch('/api/residents/:residentId', patchResident);
app.put('/api/residents/:residentId', patchResident);
app.delete('/api/residents/:residentId', asyncRoute(async (req, res) => {
  const resident = findById(db.residents, req.params.residentId, 'Resident');
  if (resident.bedId) fail(409, 'Move the resident out before deleting the record', 'RESIDENT_ASSIGNED');
  db.residents = db.residents.filter((item) => item.id !== resident.id);
  await store.save();
  res.status(204).send();
}));

// Complaints
const complaintStatuses = ['open', 'in_progress', 'resolved', 'closed'];
app.get('/api/complaints', (req, res) => {
  let complaints = db.complaints.filter((complaint) => {
    if (req.query.status && complaint.status !== req.query.status) return false;
    if (req.query.priority && complaint.priority !== req.query.priority) return false;
    if (req.query.residentId && complaint.residentId !== req.query.residentId) return false;
    return searchMatch([complaint.title, complaint.category, complaint.description], req.query.search);
  });
  const result = paginate(complaints, req.query);
  listResponse(res, result.items, result.meta);
});
app.post('/api/complaints', asyncRoute(async (req, res) => {
  const body = req.body || {};
  requireFields(body, ['title']);
  optionalEnum(normalizedToken(body.priority), ['low', 'medium', 'high', 'urgent'], 'priority');
  const resident = findResidentReference(body.residentId || body.resident);
  if (body.residentId || body.resident) {
    if (!resident) fail(404, 'Resident not found', 'NOT_FOUND');
  }
  const complaint = { id: makeId('complaint', db.complaints), residentId: resident?.id || null, category: cleanString(body.category || 'general'), title: cleanString(body.title), description: cleanString(body.description || body.details || body.title), priority: normalizedToken(body.priority || 'medium'), status: 'open', comments: [], createdAt: now(), updatedAt: now() };
  await record(() => { db.complaints.push(complaint); return complaint; });
  res.status(201).json({ data: complaint });
}));
app.get('/api/complaints/:complaintId', (req, res) => res.json({ data: findById(db.complaints, req.params.complaintId, 'Complaint') }));

const patchComplaint = asyncRoute(async (req, res) => {
  const complaint = findById(db.complaints, req.params.complaintId, 'Complaint');
  const body = req.body || {};
  ['title', 'description', 'category'].forEach((field) => { if (body[field] !== undefined) { if (!isNonEmptyString(body[field])) fail(400, `${field} must be a non-empty string`, 'VALIDATION_ERROR'); complaint[field] = cleanString(body[field]); } });
  optionalEnum(normalizedToken(body.priority), ['low', 'medium', 'high', 'urgent'], 'priority');
  optionalEnum(normalizeComplaintStatus(body.status), complaintStatuses, 'status');
  if (body.priority) complaint.priority = normalizedToken(body.priority);
  if (body.status) complaint.status = normalizeComplaintStatus(body.status);
  complaint.updatedAt = now();
  await record(() => complaint);
  res.json({ data: complaint });
});
app.patch('/api/complaints/:complaintId', patchComplaint);
app.put('/api/complaints/:complaintId', patchComplaint);
const patchComplaintStatus = asyncRoute(async (req, res) => {
  const complaint = findById(db.complaints, req.params.complaintId, 'Complaint');
  requireFields(req.body || {}, ['status']);
  optionalEnum(normalizeComplaintStatus(req.body.status), complaintStatuses, 'status');
  complaint.status = normalizeComplaintStatus(req.body.status);
  complaint.updatedAt = now();
  await record(() => complaint);
  res.json({ data: complaint });
});
app.patch('/api/complaints/:complaintId/status', patchComplaintStatus);
app.put('/api/complaints/:complaintId/status', patchComplaintStatus);

const addComplaintComment = asyncRoute(async (req, res) => {
  const complaint = findById(db.complaints, req.params.complaintId, 'Complaint');
  const body = req.body || {};
  const message = cleanString(body.message || body.comment || body.text);
  if (!isNonEmptyString(message)) fail(400, 'message is required', 'VALIDATION_ERROR');
  const comment = { id: makeId('comment', complaint.comments || []), authorId: req.user?.id || body.authorId || 'demo-admin', authorName: req.user?.name || body.authorName || 'Demo Admin', message, createdAt: now() };
  complaint.comments = complaint.comments || [];
  complaint.comments.push(comment);
  complaint.updatedAt = now();
  await record(() => complaint);
  res.status(201).json({ data: comment, meta: { complaintId: complaint.id } });
});
app.post('/api/complaints/:complaintId/comments', addComplaintComment);
app.post('/api/complaints/:complaintId/comment', addComplaintComment);
app.delete('/api/complaints/:complaintId', asyncRoute(async (req, res) => {
  findById(db.complaints, req.params.complaintId, 'Complaint');
  db.complaints = db.complaints.filter((item) => item.id !== req.params.complaintId);
  await store.save();
  res.status(204).send();
}));

// Payments
app.get('/api/payments', (req, res) => {
  const payments = db.payments.filter((payment) => {
    if (req.query.status && payment.status !== req.query.status) return false;
    if (req.query.residentId && payment.residentId !== req.query.residentId) return false;
    if (req.query.month && payment.month !== req.query.month) return false;
    return searchMatch([payment.reference, payment.type, payment.month], req.query.search);
  });
  const result = paginate(payments, req.query);
  listResponse(res, result.items, result.meta);
});
app.get('/api/payments/summary', (req, res) => {
  const paid = db.payments.filter((payment) => payment.status === 'paid');
  const pending = db.payments.filter((payment) => ['pending', 'overdue'].includes(payment.status));
  res.json({ data: { paid: paid.reduce((sum, item) => sum + Number(item.amount), 0), pending: pending.reduce((sum, item) => sum + Number(item.amount), 0), total: db.payments.reduce((sum, item) => sum + Number(item.amount), 0), count: db.payments.length } });
});
app.get('/api/payments/:paymentId', (req, res) => res.json({ data: findById(db.payments, req.params.paymentId, 'Payment') }));

const makePayment = asyncRoute(async (req, res) => {
  const body = req.body || {};
  requireFields(body, ['amount']);
  const resident = findResidentReference(body.residentId || body.resident);
  if (!resident) fail(body.residentId || body.resident ? 404 : 400, body.residentId || body.resident ? 'Resident not found' : 'residentId (or resident) is required', body.residentId || body.resident ? 'NOT_FOUND' : 'VALIDATION_ERROR');
  const amount = asNumber(body.amount);
  if (amount === null || amount <= 0) fail(400, 'amount must be greater than zero', 'VALIDATION_ERROR');
  optionalEnum(body.type, ['rent', 'mess', 'maintenance', 'fine', 'other'], 'type');
  const payment = { id: makeId('payment', db.payments), residentId: resident.id, amount: Math.round(amount * 100) / 100, type: cleanString(body.type || 'rent'), month: cleanString(body.month || dateOnly().slice(0, 7)), status: body.status || 'paid', method: cleanString(body.method || 'cash'), reference: cleanString(body.reference || `PAY-${Date.now()}`), paidAt: body.status === 'pending' ? null : (body.paidAt || body.date || now()), createdAt: now() };
  optionalEnum(payment.status, ['pending', 'paid', 'failed', 'overdue', 'refunded'], 'status');
  optionalDate(payment.paidAt, 'paidAt');
  await record(() => { db.payments.push(payment); return payment; });
  res.status(201).json({ data: payment });
});
app.post('/api/payments', makePayment);
app.post('/api/payments/record', makePayment);
const recordForResident = asyncRoute(async (req, res, next) => { req.body = { ...(req.body || {}), residentId: req.params.residentId, status: 'paid' }; return makePayment(req, res, next); });
app.post('/api/payments/record/:residentId', recordForResident);
app.post('/api/payments/:residentId/record', recordForResident);

// Visitors
const visitorStatuses = ['pending', 'approved', 'checked_in', 'checked_out', 'rejected'];
app.get('/api/visitors', (req, res) => {
  const visitors = db.visitors.filter((visitor) => {
    if (req.query.status && visitor.status !== req.query.status) return false;
    if (req.query.residentId && visitor.residentId !== req.query.residentId) return false;
    return searchMatch([visitor.visitorName, visitor.phone, visitor.purpose, visitor.visitDate], req.query.search);
  });
  const result = paginate(visitors, req.query);
  listResponse(res, result.items, result.meta);
});
app.post('/api/visitors', asyncRoute(async (req, res) => {
  const body = req.body || {};
  requireFields(body, ['residentId', 'visitorName', 'visitDate']);
  findById(db.residents, body.residentId, 'Resident');
  optionalDate(body.visitDate, 'visitDate');
  const visitor = { id: makeId('visitor', db.visitors), residentId: body.residentId, visitorName: cleanString(body.visitorName), phone: cleanString(body.phone || ''), purpose: cleanString(body.purpose || 'Visit'), visitDate: body.visitDate, expectedAt: body.expectedAt || null, status: 'pending', checkInAt: null, checkOutAt: null, createdAt: now(), updatedAt: now() };
  await record(() => { db.visitors.push(visitor); return visitor; });
  res.status(201).json({ data: visitor });
}));
app.get('/api/visitors/:visitorId', (req, res) => res.json({ data: findById(db.visitors, req.params.visitorId, 'Visitor') }));

const transitionVisitor = asyncRoute(async (req, res) => {
  const visitor = findById(db.visitors, req.params.visitorId, 'Visitor');
  const action = req.params.action || req.body?.status;
  const transitions = { approve: 'approved', reject: 'rejected', 'check-in': 'checked_in', 'check-out': 'checked_out' };
  const status = transitions[action] || normalizeVisitorStatus(req.body?.status);
  optionalEnum(status, visitorStatuses, 'status');
  if (!status) fail(400, 'A visitor status or supported action is required', 'VALIDATION_ERROR');
  if (status === 'checked_in' && !['approved', 'pending'].includes(visitor.status)) fail(409, 'Only an approved visitor can check in', 'INVALID_TRANSITION');
  if (status === 'checked_out' && visitor.status !== 'checked_in') fail(409, 'Visitor is not checked in', 'INVALID_TRANSITION');
  visitor.status = status;
  if (status === 'checked_in') visitor.checkInAt = now();
  if (status === 'checked_out') visitor.checkOutAt = now();
  visitor.updatedAt = now();
  await record(() => visitor);
  res.json({ data: visitor });
});
app.patch('/api/visitors/:visitorId/status', transitionVisitor);
app.put('/api/visitors/:visitorId/status', transitionVisitor);
app.post('/api/visitors/:visitorId/:action', transitionVisitor);
app.patch('/api/visitors/:visitorId', transitionVisitor);
app.delete('/api/visitors/:visitorId', asyncRoute(async (req, res) => { findById(db.visitors, req.params.visitorId, 'Visitor'); db.visitors = db.visitors.filter((item) => item.id !== req.params.visitorId); await store.save(); res.status(204).send(); }));

// Mess menus and attendance
app.get('/api/mess/menus', (req, res) => {
  const menus = db.messMenus.filter((menu) => !req.query.date || menu.date === req.query.date).sort((a, b) => a.date.localeCompare(b.date));
  const result = paginate(menus, req.query);
  listResponse(res, result.items, result.meta);
});
app.get('/api/mess/menus/today', (req, res) => {
  const menu = db.messMenus.find((item) => item.date === dateOnly());
  res.json({ data: menu || null });
});
app.get('/api/mess/menu', (req, res) => res.redirect(307, '/api/mess/menus'));
app.post('/api/mess/menus', asyncRoute(async (req, res) => {
  const body = req.body || {};
  requireFields(body, ['date']);
  optionalDate(body.date, 'date');
  const menu = { id: makeId('menu', db.messMenus), date: body.date, day: body.day || new Date(body.date).toLocaleDateString('en-US', { weekday: 'long' }), breakfast: cleanString(body.breakfast || ''), lunch: cleanString(body.lunch || ''), snacks: cleanString(body.snacks || ''), dinner: cleanString(body.dinner || ''), createdAt: now(), updatedAt: now() };
  await record(() => { db.messMenus.push(menu); return menu; });
  res.status(201).json({ data: menu });
}));
app.get('/api/mess/menus/:menuId', (req, res) => res.json({ data: findById(db.messMenus, req.params.menuId, 'Mess menu') }));
const patchMenu = asyncRoute(async (req, res) => {
  const menu = findById(db.messMenus, req.params.menuId, 'Mess menu');
  const body = req.body || {};
  if (body.date !== undefined) { optionalDate(body.date, 'date'); menu.date = body.date; }
  ['day', 'breakfast', 'lunch', 'snacks', 'dinner'].forEach((field) => { if (body[field] !== undefined) menu[field] = cleanString(body[field]); });
  menu.updatedAt = now();
  await record(() => menu);
  res.json({ data: menu });
});
app.patch('/api/mess/menus/:menuId', patchMenu);
app.put('/api/mess/menus/:menuId', patchMenu);
app.delete('/api/mess/menus/:menuId', asyncRoute(async (req, res) => { findById(db.messMenus, req.params.menuId, 'Mess menu'); db.messMenus = db.messMenus.filter((item) => item.id !== req.params.menuId); await store.save(); res.status(204).send(); }));

const attendanceList = (req, res) => {
  const attendance = db.attendance.filter((item) => (!req.query.date || item.date === req.query.date) && (!req.query.meal || item.meal === req.query.meal) && (!req.query.residentId || item.residentId === req.query.residentId));
  const result = paginate(attendance, req.query);
  listResponse(res, result.items, result.meta);
};
app.get('/api/mess/attendance', attendanceList);
app.get('/api/attendance', attendanceList);
const saveAttendance = asyncRoute(async (req, res) => {
  const body = req.body || {};
  const records = Array.isArray(body.records) ? body.records : [body];
  records.forEach((record) => { requireFields(record, ['residentId', 'meal', 'date', 'status']); findById(db.residents, record.residentId, 'Resident'); optionalDate(record.date, 'date'); optionalEnum(record.meal, ['breakfast', 'lunch', 'snacks', 'dinner'], 'meal'); optionalEnum(record.status, ['present', 'absent', 'excused'], 'status'); });
  const created = records.map((record) => ({ id: makeId('attendance', db.attendance), residentId: record.residentId, date: record.date, meal: record.meal, status: record.status, markedAt: now() }));
  await recordStoreAttendance(created);
  res.status(201).json({ data: Array.isArray(body.records) ? created : created[0] });
});
const recordStoreAttendance = async (items) => { db.attendance.push(...items); await store.save(); };
app.post('/api/mess/attendance', saveAttendance);
app.post('/api/attendance', saveAttendance);
app.patch('/api/mess/attendance/:attendanceId', asyncRoute(async (req, res) => {
  const attendance = findById(db.attendance, req.params.attendanceId, 'Attendance record');
  optionalEnum(req.body?.status, ['present', 'absent', 'excused'], 'status');
  if (!req.body?.status) fail(400, 'status is required', 'VALIDATION_ERROR');
  attendance.status = req.body.status;
  attendance.markedAt = now();
  await record(() => attendance);
  res.json({ data: attendance });
}));

// Notices
app.get('/api/notices', (req, res) => {
  const notices = db.notices.filter((notice) => {
    if (req.query.status && notice.status !== req.query.status) return false;
    if (req.query.audience && notice.audience !== req.query.audience && notice.audience !== 'all') return false;
    return searchMatch([notice.title, notice.content, notice.audience], req.query.search);
  }).sort((a, b) => String(b.publishedAt || b.createdAt).localeCompare(String(a.publishedAt || a.createdAt)));
  const result = paginate(notices, req.query);
  listResponse(res, result.items, result.meta);
});
app.post('/api/notices', asyncRoute(async (req, res) => {
  const body = req.body || {};
  requireFields(body, ['title']);
  if (!isNonEmptyString(body.content || body.excerpt)) fail(400, 'content (or excerpt) is required', 'VALIDATION_ERROR');
  const requestedStatus = body.status === undefined ? undefined : normalizedToken(body.status);
  optionalEnum(requestedStatus, ['draft', 'published'], 'status');
  const status = requestedStatus || (body.publish === false ? 'draft' : 'published');
  const notice = { id: makeId('notice', db.notices), title: cleanString(body.title), content: cleanString(body.content || body.excerpt || body.title), audience: cleanString(normalizedToken(body.audience || 'all') === 'all_residents' ? 'all' : (body.audience || 'all')), status, authorId: req.user?.id || body.authorId || 'demo-admin', createdAt: now(), publishedAt: status === 'published' ? (body.publishedAt || now()) : null, updatedAt: now() };
  optionalDate(notice.publishedAt, 'publishedAt');
  await record(() => { db.notices.push(notice); return notice; });
  res.status(201).json({ data: notice });
}));
app.get('/api/notices/:noticeId', (req, res) => res.json({ data: findById(db.notices, req.params.noticeId, 'Notice') }));
const patchNotice = asyncRoute(async (req, res) => {
  const notice = findById(db.notices, req.params.noticeId, 'Notice');
  const body = req.body || {};
  ['title', 'content', 'audience'].forEach((field) => { if (body[field] !== undefined) { if (!isNonEmptyString(body[field])) fail(400, `${field} must be a non-empty string`, 'VALIDATION_ERROR'); notice[field] = cleanString(body[field]); } });
  if (body.status !== undefined) { optionalEnum(body.status, ['draft', 'published'], 'status'); notice.status = body.status; notice.publishedAt = body.status === 'published' ? (notice.publishedAt || now()) : null; }
  notice.updatedAt = now();
  await record(() => notice);
  res.json({ data: notice });
});
app.patch('/api/notices/:noticeId', patchNotice);
app.put('/api/notices/:noticeId', patchNotice);
app.post('/api/notices/:noticeId/publish', asyncRoute(async (req, res) => {
  const notice = findById(db.notices, req.params.noticeId, 'Notice');
  notice.status = 'published';
  notice.publishedAt = now();
  notice.updatedAt = now();
  await record(() => notice);
  res.json({ data: notice });
}));
app.delete('/api/notices/:noticeId', asyncRoute(async (req, res) => { findById(db.notices, req.params.noticeId, 'Notice'); db.notices = db.notices.filter((item) => item.id !== req.params.noticeId); await store.save(); res.status(204).send(); }));

// Serve the compiled SPA from the same Node process in production. API routes always win,
// while Vite remains the preferred development server through its /api proxy.
if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR, { index: false }));
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) return res.sendFile(path.join(DIST_DIR, 'index.html'));
    return next();
  });
}

app.use((req, res, next) => next(new HttpError(404, `Route ${req.method} ${req.originalUrl} not found`, 'NOT_FOUND')));
app.use((error, req, res, _next) => {
  const status = error instanceof HttpError ? error.status : (error.status || 500);
  const payload = { error: { code: error.code || 'INTERNAL_ERROR', message: status >= 500 ? 'Internal server error' : error.message, requestId: req.requestId } };
  if (error.details) payload.error.details = error.details;
  if (status >= 500) console.error(error);
  res.status(status).json({ ...payload, message: payload.error.message });
});

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  app.listen(PORT, () => console.log(`Havenly API listening on http://localhost:${PORT}`));
}

export { app, store, JsonStore };
