import 'dotenv/config';
import bcrypt from 'bcryptjs';
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import Groq from 'groq-sdk';
import multer from 'multer';
import fs from 'fs';
import path from 'path';

// Asegurar directorio de subida
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const ALLOWED_IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeExt = ALLOWED_IMAGE_EXTS.includes(ext) ? ext : '.png';
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + safeExt);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (file.mimetype.startsWith('image/') && ALLOWED_IMAGE_EXTS.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Sólo se permiten archivos de imagen válidos (.jpg, .jpeg, .png, .webp, .gif)'));
    }
  }
});


// Helper de Validación Anti-Garabatos
const checkGibberish = (text: string | undefined): string | null => {
  if (!text) return null;
  
  // 1. Letras repetidas consecutivamente (ej: fffffff)
  if (/(.)\1{4,}/.test(text)) {
    return "Contiene caracteres repetidos de forma sospechosa";
  }
  
  // 2. Patrones de tipeo aleatorio en el teclado (ej: asdfg, qwert)
  const keyboardPatterns = ['asdf', 'qwer', 'zxcv', 'hjkl', 'tyui'];
  for (const pattern of keyboardPatterns) {
    if (text.toLowerCase().includes(pattern)) {
      return "Contiene un patrón de texto no válido (ej: asdf)";
    }
  }

  // 3. Proporción alta de consonantes (ej: rghjk)
  const words = text.split(/\s+/);
  for (const word of words) {
    if (word.length > 5) {
      const consonants = word.match(/[bcdfghjklmnpqrstvwxyzBCDFGHJKLMNPQRSTVWXYZ]/g);
      const vowels = word.match(/[aeiouáéíóúAEIOUÁÉÍÓÚ]/g);
      const cCount = consonants ? consonants.length : 0;
      const vCount = vowels ? vowels.length : 0;
      if (cCount > 0 && vCount === 0) {
        return "Contiene palabras sin vocales (posible texto incoherente)";
      }
      if (cCount > vCount * 4) {
        return "Demasiadas consonantes seguidas";
      }
    }
  }

  return null;
};

// Validación de Contraseña Segura (6 letras y 4 números sin excepción)
const validatePassword = (password: string): string | null => {
  if (password.length !== 10) return "La contraseña debe tener exactamente 10 caracteres.";
  const letters = (password.match(/[a-zA-Z]/g) || []).length;
  const numbers = (password.match(/[0-9]/g) || []).length;
  if (letters !== 6 || numbers !== 4) {
    return "La contraseña debe tener exactamente 6 letras y 4 números.";
  }
  return null;
};

const prisma = new PrismaClient();

// Campos seguros de usuario (nunca exponer hash de contraseña)
const safeUserSelect = {
  id: true,
  cedula: true,
  fullName: true,
  email: true,
  gerencia: true,
  unidad: true,
  role: true,
  status: true,
  mustChangePassword: true,
  createdAt: true,
  updatedAt: true
};

const excludePassword = <T extends Record<string, any>>(user: T | null): any => {
  if (!user) return user;
  const { password, ...safeUser } = user;
  return safeUser;
};

// Inclusión estándar segura en tickets
const ticketInclude = {
  user: { select: safeUserSelect },
  tech: { select: safeUserSelect },
  category: true
};

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
  }
});

// Middleware de Rate Limiting en memoria contra ataques de fuerza bruta
const authAttempts = new Map<string, { count: number; resetTime: number }>();

// Limpieza periódica de IPs expiradas para prevenir fugas de memoria
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of authAttempts.entries()) {
    if (record.resetTime <= now) {
      authAttempts.delete(ip);
    }
  }
}, 5 * 60 * 1000);

const rateLimitAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const windowMs = 5 * 60 * 1000; // 5 minutos
  const maxAttempts = 15; // Máximo 15 intentos por IP en 5 minutos

  const record = authAttempts.get(ip);
  if (record && record.resetTime > now) {
    if (record.count >= maxAttempts) {
      return res.status(429).json({ error: 'Demasiados intentos. Por favor espere 5 minutos antes de volver a intentar.' });
    }
    record.count++;
  } else {
    authAttempts.set(ip, { count: 1, resetTime: now + windowMs });
  }
  next();
};

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads', (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
}, express.static(path.join(__dirname, 'uploads')));


// ---- BOT RULES ----
app.get('/api/bot-rules', async (req, res) => {
  try {
    const rules = await prisma.botRule.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(rules);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener reglas del bot' });
  }
});

app.post('/api/bot-rules', async (req, res) => {
  try {
    const { keywords, response, isActive } = req.body;
    const rule = await prisma.botRule.create({
      data: { keywords, response, isActive }
    });
    res.json(rule);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear regla del bot' });
  }
});

app.put('/api/bot-rules/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { keywords, response, isActive } = req.body;
    const rule = await prisma.botRule.update({
      where: { id },
      data: { keywords, response, isActive }
    });
    res.json(rule);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar regla del bot' });
  }
});

app.delete('/api/bot-rules/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.botRule.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar regla del bot' });
  }
});

// API: PYMI Chatbot (IA) - Powered by Groq + Llama
app.post('/api/pymi/chat', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.json({ reply: "Hola, soy PYMI. ¿En qué te ayudo?" });

    const lowerMessage = message.toLowerCase();
    
    // Buscar reglas activas en la BD
    const rules = await prisma.botRule.findMany({ where: { isActive: true } });
    
    let matchedResponse = null;

    for (const rule of rules) {
      // Separar palabras clave por comas y limpiar
      const keywords = rule.keywords.split(',').map((k: string) => k.trim().toLowerCase()).filter((k: string) => k.length > 0);
      
      if (keywords.some((kw: string) => lowerMessage.includes(kw))) {
        matchedResponse = rule.response;
        break; // Tomar la primera coincidencia
      }
    }

    if (!matchedResponse) {
      matchedResponse = "Soy PYMI, el asistente automático de INAPYMI. Por favor detalla bien tu problema para intentar ayudarte, y de no poder, crea un 'Nuevo Requerimiento' desde la Bandeja Principal detallando tu problema para que un Técnico te asista.";
    }

    // Retraso artificial para simular tipeo humano
    setTimeout(() => {
      res.json({ reply: matchedResponse });
    }, 800);

  } catch (error: any) {
    console.error("Error en PYMI local chat:", error);
    res.status(500).json({ error: "Error interno en PYMI." });
  }
});


// API: Usuarios
app.post('/api/users', async (req, res) => {
  try {
    const { fullName, cedula, email, role, password, gerencia, unidad } = req.body;
    let finalPassword = (password && password.trim() !== '') ? password.trim() : 'inapym1234';
    const pwdError = validatePassword(finalPassword);
    if (pwdError) {
      return res.status(400).json({ error: pwdError });
    }
    const hashedPassword = await bcrypt.hash(finalPassword, 10);

    const user = await prisma.user.create({
      data: {
        fullName,
        cedula,
        email,
        role,
        gerencia,
        unidad,
        password: hashedPassword
      },
      select: safeUserSelect
    });
    // Emitimos evento Socket para actualizar dashboards si es necesario
    io.emit('users:updated', user);
    res.json(user);
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return res.status(400).json({ error: 'La cédula ingresada ya está registrada por otro trabajador. No puede haber cédulas duplicadas.' });
    }
    console.error("Error creating user:", error);
    res.status(500).json({ error: 'Error al registrar trabajador' });
  }
});

// Endpoint de Inicio de Sesión Seguro con Rate Limiting
app.post('/api/login', rateLimitAuth, async (req, res) => {
  const { cedula, password } = req.body;
  if (!cedula || !password) {
    return res.status(400).json({ error: 'Cédula y contraseña requeridas' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { cedula } });

    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    let isMatch = await bcrypt.compare(password, user.password);
    
    // Migración transparente si alguna cuenta antigua tenía la contraseña en texto plano
    if (!isMatch && user.password === password) {
      const secureHash = await bcrypt.hash(password, 10);
      await prisma.user.update({
        where: { id: user.id },
        data: { password: secureHash }
      });
      isMatch = true;
    }

    if (!isMatch) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    if (user.status === 'Inactivo') {
      return res.status(403).json({ error: 'Usuario inhabilitado. Contacte al administrador.' });
    }

    // Retornamos el objeto usuario sanitizado (sin hash de contraseña)
    res.json(excludePassword(user));
  } catch(err) {
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// Endpoint de Validación y Sincronización de Perfil en Tiempo Real
app.get('/api/auth/me', async (req, res) => {
  try {
    const { id, cedula } = req.query;
    if (!id && !cedula) {
      return res.status(400).json({ error: 'Identificador requerido' });
    }

    const where: any = id ? { id: String(id) } : { cedula: String(cedula) };
    const user = await prisma.user.findUnique({
      where,
      select: safeUserSelect
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json(user);
  } catch (err) {
    console.error('Error fetching me:', err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// ======================================
// API: CATEGORÍAS
// ======================================

app.post('/api/categories', async (req, res) => {
  try {
    const { title, requiresDescription, requiresImage } = req.body;
    const gibberishError = checkGibberish(title);
    if (gibberishError) return res.status(400).json({ error: gibberishError + " en el Título" });
    const cat = await prisma.category.create({ 
      data: { 
        title, 
        requiresDescription: requiresDescription === true,
        requiresImage: requiresImage === true
      } 
    });
    res.json(cat);
  } catch(err) {
    res.status(500).json({ error: 'Error al crear categoría' });
  }
});

app.get('/api/categories', async (req, res) => {
  try {
    const cats = await prisma.category.findMany();
    res.json(cats);
  } catch(err) {
    res.status(500).json({ error: 'Error obteniendo categorías' });
  }
});

app.put('/api/categories/:id', async (req, res) => {
  try {
    const { title, requiresDescription, requiresImage } = req.body;
    const gibberishError = checkGibberish(title);
    if (gibberishError) return res.status(400).json({ error: gibberishError + " en el Título" });
    const cat = await prisma.category.update({
      where: { id: req.params.id },
      data: { 
        title, 
        requiresDescription: requiresDescription === true,
        requiresImage: requiresImage === true
      }
    });
    res.json(cat);
  } catch(err) {
    res.status(500).json({ error: 'Error actualizando categoría' });
  }
});

app.delete('/api/categories/:id', async (req, res) => {
  try {
    // Verificar si hay tickets usandola
    const tickets = await prisma.ticket.count({ where: { categoryId: req.params.id } });
    if (tickets > 0) {
      return res.status(400).json({ error: 'No se puede eliminar porque hay tickets asociados a esta categoría' });
    }
    await prisma.category.delete({ where: { id: req.params.id } });
    res.json({ message: 'Categoría eliminada' });
  } catch(err) {
    res.status(500).json({ error: 'Error eliminando categoría' });
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: safeUserSelect,
      orderBy: { createdAt: 'desc' }
    });
    res.json(users);
  } catch(err) {
    res.status(500).json({ error: 'Error obteniendo usuarios' });
  }
});

// Obtener estadísticas en tiempo real (Mes actual)
app.get('/api/stats', async (req, res) => {
  try {
    const currentMonth = new Date().toISOString().substring(0, 7);
    const techs = await prisma.user.findMany({ where: { role: 'Técnico IT' } });
    
    // Obtener todos los tickets y filtrar los del mes actual
    const allTickets = await prisma.ticket.findMany();
    const monthTickets = allTickets.filter(t => t.createdAt.toISOString().substring(0, 7) === currentMonth);
    
    // Calcular ranking de técnicos por tickets conformes en EL MES ACTUAL
    const techRanking = techs.map(tech => {
      const closedCount = monthTickets.filter(t => t.techId === tech.id && t.status === 'Cerrado (Conforme)').length;
      return { name: tech.fullName, closed: closedCount };
    }).sort((a, b) => b.closed - a.closed); // todos los técnicos

    res.json({ techRanking, currentMonth });
  } catch(err) {
    res.status(500).json({ error: 'Error cargando estadísticas' });
  }
});

// Obtener Reporte Mensual Completo
app.get('/api/reports', async (req, res) => {
  try {
    const { month } = req.query; // YYYY-MM
    const targetMonth = month ? String(month) : new Date().toISOString().substring(0, 7);
    
    const allTickets = await prisma.ticket.findMany({ 
      include: { 
        tech: { select: safeUserSelect } 
      } 
    });
    const techs = await prisma.user.findMany({ 
      where: { role: 'Técnico IT' },
      select: safeUserSelect 
    });

    // Filtrar tickets por mes exacto
    const monthTickets = allTickets.filter(t => t.createdAt.toISOString().substring(0, 7) === targetMonth);

    // Estadísticas Globales
    const globalStats = {
      total: monthTickets.length,
      conformes: monthTickets.filter(t => t.status === 'Cerrado (Conforme)').length,
      noConformes: monthTickets.filter(t => t.status === 'Cerrado (No Conforme)').length,
      cancelados: monthTickets.filter(t => t.status === 'Cancelado').length,
      pendientes: monthTickets.filter(t => t.status === 'En Espera' || t.status === 'En Proceso' || t.status === 'Resuelto (Esperando Conformidad)').length,
    };

    // Estadísticas Individuales (Técnicos)
    const techStats = techs.map(tech => {
      const techTickets = monthTickets.filter(t => t.techId === tech.id);
      const conformes = techTickets.filter(t => t.status === 'Cerrado (Conforme)').length;
      const rate = techTickets.length > 0 ? ((conformes / techTickets.length) * 100).toFixed(1) : "0.0";
      
      return {
        id: tech.id,
        name: tech.fullName,
        totalAssigned: techTickets.length,
        conformes: conformes,
        successRate: rate
      };
    }).sort((a, b) => b.conformes - a.conformes);

    res.json({ targetMonth, globalStats, techStats });
  } catch(err) {
    res.status(500).json({ error: 'Error generando reporte' });
  }
});

app.put('/api/tickets/:id/take', async (req, res) => {
  try {
    const { techId } = req.body;
    const ticket = await prisma.ticket.update({
      where: { id: req.params.id },
      data: { techId, status: 'En Proceso' },
      include: ticketInclude
    });
    io.emit('ticket:taken', ticket);
    io.emit('tickets:updated');
    res.json(ticket);
  } catch(err) {
    res.status(500).json({ error: 'Error tomando ticket' });
  }
});

// Asignar o Reasignar Ticket (Por Admin)
app.put('/api/tickets/:id/assign', async (req, res) => {
  try {
    const { techId } = req.body;
    const isUnassigning = !techId || techId === 'unassign';
    const ticket = await prisma.ticket.update({
      where: { id: req.params.id },
      data: {
        techId: isUnassigning ? null : techId,
        status: isUnassigning ? 'En Espera' : 'En Proceso'
      },
      include: ticketInclude
    });
    io.emit('ticket:assigned', ticket);
    io.emit('tickets:updated');
    res.json(ticket);
  } catch(err) {
    res.status(500).json({ error: 'Error asignando ticket' });
  }
});

// Cancelar Ticket (Por Solicitante)
app.put('/api/tickets/:id/cancel', async (req, res) => {
  try {
    const ticket = await prisma.ticket.update({
      where: { id: req.params.id },
      data: { status: 'Cancelado' },
      include: ticketInclude
    });
    io.emit('ticket:cancelled', ticket);
    io.emit('tickets:updated');
    res.json(ticket);
  } catch(err) {
    res.status(500).json({ error: 'Error cancelando ticket' });
  }
});

app.put('/api/users/:id/toggle-status', async (req, res) => {
  try {
    const { status } = req.body;
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { status },
      select: safeUserSelect
    });
    io.emit('users:updated');
    res.json(user);
  } catch(err) {
    res.status(500).json({ error: 'Error cambiando estado' });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  try {
    const user = await prisma.user.delete({
      where: { id: req.params.id },
      select: safeUserSelect
    });
    io.emit('users:updated');
    res.json(user);
  } catch(err) {
    res.status(500).json({ error: 'Error eliminando usuario' });
  }
});

// Editar usuario completo (todos los campos)
app.put('/api/users/:id', async (req, res) => {
  try {
    const { fullName, cedula, email, role, status, password, gerencia, unidad } = req.body;
    const data: any = { fullName, cedula, email, role, status, gerencia, unidad };
    if (password && password.trim() !== '') {
      const pwdError = validatePassword(password);
      if (pwdError) {
        return res.status(400).json({ error: pwdError });
      }
      data.password = await bcrypt.hash(password, 10);
    }
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data,
      select: safeUserSelect
    });

    // Si el rol cambia a Solicitante, liberar automáticamente tickets que tuviera en proceso
    if (role === 'Solicitante') {
      await prisma.ticket.updateMany({
        where: { techId: req.params.id, status: 'En Proceso' },
        data: { status: 'En Espera', techId: null }
      });
      io.emit('tickets:updated');
    }

    io.emit('user:updated', user);
    io.emit('users:updated');
    res.json(user);
  } catch(err: any) {
    if (err?.code === 'P2002') {
      return res.status(400).json({ error: 'Esa cédula ya está registrada por otro usuario.' });
    }
    res.status(500).json({ error: 'Error actualizando usuario' });
  }
});

app.put('/api/users/:id/force-password', async (req, res) => {
  try {
    const { newPassword } = req.body;
    const pwdError = validatePassword(newPassword);
    if (pwdError) {
      return res.status(400).json({ error: pwdError });
    }
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { password: hashedPassword, mustChangePassword: true }
    });
    res.json({ message: 'Contraseña forzada' });
  } catch(err) {
    res.status(500).json({ error: 'Error forzando contraseña' });
  }
});

app.put('/api/users/:id/password', async (req, res) => {
  try {
    const { newPassword } = req.body;
    const pwdError = validatePassword(newPassword);
    if (pwdError) {
      return res.status(400).json({ error: pwdError });
    }
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { password: hashedPassword, mustChangePassword: false }
    });
    res.json({ message: 'Contraseña cambiada' });
  } catch(err) {
    res.status(500).json({ error: 'Error cambiando contraseña' });
  }
});

app.post('/api/recover-password', rateLimitAuth, async (req, res) => {
  try {
    const { cedula, email } = req.body;
    const user = await prisma.user.findFirst({
      where: { cedula, email }
    });
    if (!user) {
      return res.status(404).json({ error: 'Los datos no coinciden con ningún usuario activo.' });
    }
    
    // Buscar o crear categoría para recuperación
    let category = await prisma.category.findFirst({
      where: { title: 'Acceso y Credenciales' }
    });
    if (!category) {
      category = await prisma.category.create({ data: { title: 'Acceso y Credenciales' } });
    }
    
    // Crear el ticket automáticamente
    const lastTicket = await prisma.ticket.findFirst({
      orderBy: { correlative: 'desc' }
    });
    const nextCorrelative = lastTicket ? lastTicket.correlative + 1 : 1;

    const ticket = await prisma.ticket.create({
      data: {
        correlative: nextCorrelative,
        title: 'Restablecimiento de Contraseña',
        description: `El usuario ${user.fullName} ha solicitado restablecer su contraseña desde el panel de acceso.`,
        userId: user.id,
        categoryId: category.id
      }
    });

    io.emit('ticket:created', ticket);
    io.emit('tickets:updated');

    res.json({ message: 'Solicitud enviada' });
  } catch(err) {
    res.status(500).json({ error: 'Error en recuperación' });
  }
});

// ======================================
// API: TICKETS / REQUERIMIENTOS
// ======================================

app.post('/api/tickets', upload.single('image'), async (req, res) => {
  try {
    const { title, description, categoryId, userId, priority, remoteId } = req.body;
    
    const titleErr = checkGibberish(title);
    if (titleErr) return res.status(400).json({ error: titleErr + " en el Título" });
    const descErr = checkGibberish(description);
    if (descErr) return res.status(400).json({ error: descErr + " en la Descripción" });

    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;
    
    const lastTicket = await prisma.ticket.findFirst({
      orderBy: { correlative: 'desc' }
    });
    const nextCorrelative = lastTicket ? lastTicket.correlative + 1 : 1;

    const ticket = await prisma.ticket.create({
      data: { 
        correlative: nextCorrelative,
        title, 
        description, 
        categoryId, 
        userId, 
        imageUrl,
        priority: priority || 'Media',
        remoteId: remoteId ? String(remoteId).trim() : null
      },
      include: ticketInclude
    });
    io.emit('ticket:created', ticket);
    io.emit('tickets:updated');
    res.json(ticket);
  } catch(err) {
    console.error("Error creating ticket:", err);
    res.status(500).json({ error: 'Error creando ticket' });
  }
});

app.get('/api/tickets', async (req, res) => {
  try {
    const { userId, role, month, techId } = req.query;
    
    // Construir clausula 'where' base
    let whereClause: any = {};
    
    if (role === 'Solicitante' && userId) {
      whereClause.userId = String(userId);
    }
    
    if (techId) {
      whereClause.techId = String(techId);
    }

    const tickets = await prisma.ticket.findMany({
      where: whereClause,
      include: ticketInclude,
      orderBy: { correlative: 'desc' }
    });
    
    // Filtrar en memoria por mes (YYYY-MM) si viene en el query
    let filteredTickets = tickets;
    if (month) {
      filteredTickets = tickets.filter(t => t.createdAt.toISOString().substring(0, 7) === String(month));
    }
    
    res.json(filteredTickets);
  } catch(err) {
    res.status(500).json({ error: 'Error obteniendo tickets' });
  }
});

app.put('/api/tickets/:id/release', async (req, res) => {
  try {
    const ticket = await prisma.ticket.update({
      where: { id: req.params.id },
      data: { status: 'En Espera', techId: null },
      include: ticketInclude
    });
    io.emit('tickets:updated');
    res.json(ticket);
  } catch(err) {
    res.status(500).json({ error: 'Error al liberar el ticket' });
  }
});

app.put('/api/tickets/:id/resolve', upload.single('resolutionImage'), async (req, res) => {
  try {
    const { resolutionNotes } = req.body;
    const resolutionImageUrl = req.file ? `/uploads/${req.file.filename}` : null;

    const updateData: any = {
      status: 'Resuelto (Esperando Conformidad)',
      closedAt: new Date(),
    };
    if (resolutionNotes && resolutionNotes.trim()) {
      updateData.resolutionNotes = resolutionNotes.trim();
    }
    if (resolutionImageUrl) {
      updateData.resolutionImageUrl = resolutionImageUrl;
    }

    const ticket = await (prisma as any).ticket.update({
      where: { id: req.params.id },
      data: updateData,
      include: ticketInclude
    });
    io.emit('ticket:resolved', ticket);
    io.emit('tickets:updated');
    res.json(ticket);
  } catch(err) {
    console.error('Error al resolver ticket:', err);
    res.status(500).json({ error: 'Error al resolver' });
  }
});

app.put('/api/tickets/:id/conformity', async (req, res) => {
  try {
    const { approved, rating, ratingFeedback } = req.body;
    const updateData: any = {
      status: approved ? 'Cerrado (Conforme)' : 'Cerrado (No Conforme)',
    };
    if (rating !== undefined && rating !== null) {
      updateData.rating = Number(rating);
    } else {
      updateData.rating = approved ? 5 : 1;
    }
    if (ratingFeedback && String(ratingFeedback).trim()) {
      updateData.ratingFeedback = String(ratingFeedback).trim();
    }

    const ticket = await (prisma as any).ticket.update({
      where: { id: req.params.id },
      data: updateData,
      include: ticketInclude
    });
    io.emit('ticket:conformity', ticket);
    io.emit('tickets:updated');
    res.json(ticket);
  } catch(err) {
    console.error('Error al dar conformidad:', err);
    res.status(500).json({ error: 'Error al dar conformidad' });
  }
});

app.put('/api/tickets/:id/reset-password', async (req, res) => {
  try {
    const { id } = req.params;
    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: { user: { select: safeUserSelect } }
    });
    
    if (!ticket || !ticket.user) {
      return res.status(404).json({ error: 'Ticket o usuario no encontrado' });
    }

    const hashedPassword = await bcrypt.hash('inapym1234', 10);

    // Actualizar contraseña del usuario
    await prisma.user.update({
      where: { id: ticket.user.id },
      data: {
        password: hashedPassword,
        mustChangePassword: true
      }
    });

    // Cerrar el ticket
    const updatedTicket = await prisma.ticket.update({
      where: { id },
      data: {
        status: 'Cerrado (Conforme)',
      },
      include: ticketInclude
    });

    io.emit('ticket:conformity', updatedTicket);
    io.emit('tickets:updated');
    io.emit('users:updated');

    res.json({ message: 'Contraseña restablecida con éxito', ticket: updatedTicket });
  } catch(err) {
    res.status(500).json({ error: 'Error al restablecer contraseña' });
  }
});

// ======================================
// API: MENSAJES Y CHAT DE TICKETS
// ======================================

app.get('/api/tickets/:id/messages', async (req, res) => {
  try {
    const { id } = req.params;
    const { role, userId } = req.query;

    const ticket = await prisma.ticket.findUnique({
      where: { id },
      select: { id: true, userId: true, techId: true }
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket no encontrado' });
    }

    // Privacidad estricta:
    // Super Admin: Acceso total
    // Solicitante: Solo el creador del requerimiento
    // Técnico IT: Solo el técnico asignado
    const isSuperAdmin = role === 'Super Admin';
    const isOwner = ticket.userId === String(userId);
    const isAssignedTech = ticket.techId === String(userId);
    const isUnassigned = role === 'Técnico IT' && !ticket.techId;

    if (!isSuperAdmin && !isOwner && !isAssignedTech && !isUnassigned) {
      return res.status(403).json({ error: 'Acceso denegado: este chat es estrictamente privado entre el solicitante y su técnico asignado.' });
    }

    const whereClause: any = { ticketId: id };
    // Si el usuario es Solicitante, no mostrar las notas internas exclusivas de técnicos
    if (role === 'Solicitante') {
      whereClause.isInternal = false;
    }

    const messages = await (prisma as any).ticketMessage.findMany({
      where: whereClause,
      include: {
        user: { select: safeUserSelect }
      },
      orderBy: { createdAt: 'asc' }
    });

    res.json(messages);
  } catch(err) {
    console.error("Error fetching ticket messages:", err);
    res.status(500).json({ error: 'Error obteniendo mensajes del ticket' });
  }
});

app.post('/api/tickets/:id/messages', async (req, res) => {
  try {
    const { id } = req.params;
    const { message, userId, isInternal } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'El mensaje no puede estar vacío' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: safeUserSelect
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id },
      select: { id: true, userId: true, techId: true }
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket no encontrado' });
    }

    const isSuperAdmin = user.role === 'Super Admin';
    const isOwner = ticket.userId === user.id;
    const isAssignedTech = ticket.techId === user.id;
    const isUnassignedTech = user.role === 'Técnico IT' && !ticket.techId;

    if (!isSuperAdmin && !isOwner && !isAssignedTech && !isUnassignedTech) {
      return res.status(403).json({ error: 'Acceso denegado: no puedes publicar en este chat.' });
    }

    // Solo técnicos y super admin pueden publicar notas internas
    const internalFlag = (user.role === 'Super Admin' || user.role === 'Técnico IT') && isInternal === true;

    const newMsg = await (prisma as any).ticketMessage.create({
      data: {
        ticketId: id,
        userId: user.id,
        message: message.trim(),
        isInternal: internalFlag
      },
      include: {
        user: { select: safeUserSelect }
      }
    });

    // Emitir mensaje por WebSockets en tiempo real
    io.emit('ticket:message', { ticketId: id, message: newMsg });

    res.json(newMsg);
  } catch(err) {
    console.error("Error creating ticket message:", err);
    res.status(500).json({ error: 'Error enviando mensaje' });
  }
});

// Exportación a CSV compatible con Excel
app.get('/api/tickets/export/csv', async (req, res) => {
  try {
    const { month } = req.query;
    let whereClause: any = {};
    const tickets = await prisma.ticket.findMany({
      where: whereClause,
      include: ticketInclude,
      orderBy: { correlative: 'desc' }
    });

    const filtered = month 
      ? tickets.filter(t => t.createdAt.toISOString().substring(0, 7) === String(month))
      : tickets;

    // Generar CSV con BOM UTF-8 para apertura perfecta en Excel
    let csv = '\uFEFFNro;Título;Prioridad;Estado;Solicitante;Cédula;Gerencia;Unidad;Técnico Asignado;AnyDesk ID;Informe Solución;Calificación;Fecha Creación\r\n';
    
    for (const t of filtered) {
      const escape = (val: string | null | undefined) => `"${(val || '').replace(/"/g, '""')}"`;
      const dateStr = new Date(t.createdAt).toLocaleString('es-VE', { hour12: true });
      const ratingStr = (t as any).rating ? `${(t as any).rating}/5` : 'Pendiente';
      csv += `${t.correlative};${escape(t.title)};${escape((t as any).priority || 'Media')};${escape(t.status)};${escape(t.user?.fullName)};${escape(t.user?.cedula)};${escape(t.user?.gerencia)};${escape(t.user?.unidad)};${escape(t.tech?.fullName || 'No asignado')};${escape((t as any).remoteId || 'N/A')};${escape((t as any).resolutionNotes || 'Sin informe')};${escape(ratingStr)};${escape(dateStr)}\r\n`;
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="Reporte_SAT_${month || 'historico'}.csv"`);
    res.send(csv);
  } catch(err) {
    console.error("Error exporting tickets to CSV:", err);
    res.status(500).json({ error: 'Error exportando tickets' });
  }
});

// Inicialización
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`[BACKEND] HelpDesk activo en puerto ${PORT}`);
});
