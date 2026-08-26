const dotenv = require('dotenv');

dotenv.config();

const port = Number.parseInt(process.env.PORT, 10);

module.exports = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number.isInteger(port) ? port : 3000
};
