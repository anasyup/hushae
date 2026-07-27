require('dotenv').config();

module.exports = {
  port: parseInt(process.env.PORT || '4000', 10),
  mongoUri: process.env.MONGODB_URI || '',
  jwtSecret: process.env.JWT_SECRET || 'hushae-dev-secret',
  adminEmail: process.env.ADMIN_EMAIL || 'underadmin',
  adminPassword: process.env.ADMIN_PASSWORD || 'Muhammad1',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
};
