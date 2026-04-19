const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET || 'opensquad-dev-secret-change-in-production';
const JWT_EXPIRY = '7d';

function generateToken(user) {
  return jwt.sign({
    id: user.id,
    whatsappNumber: user.whatsappNumber,
    nome: user.nome,
    plano: user.plano
  }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

async function authenticateJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);

  if (!decoded) {
    return res.status(401).json({ error: 'Token inválido ou expirado' });
  }

  const user = await prisma.user.findUnique({
    where: { id: decoded.id }
  });

  if (!user) {
    return res.status(401).json({ error: 'Usuário não encontrado' });
  }

  req.user = user;
  next();
}

module.exports = {
  authenticateJWT,
  generateToken,
  verifyToken
};
