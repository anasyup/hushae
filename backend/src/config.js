require('dotenv').config();

module.exports = {
  port: parseInt(process.env.PORT || '4000', 10),
  mongoUri: process.env.MONGODB_URI || '',
  jwtSecret: process.env.JWT_SECRET || 'veloura-dev-secret',
  adminEmail: process.env.ADMIN_EMAIL || 'admin@veloura.pk',
  adminPassword: process.env.ADMIN_PASSWORD || 'VelouraAdmin@123',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
};
