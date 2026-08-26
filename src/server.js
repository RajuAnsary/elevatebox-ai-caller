const app = require('./app');
const { port, nodeEnv } = require('./config/env');

app.listen(port, '0.0.0.0', () => {
  console.log(`ElevateBox AI Caller API is running on 0.0.0.0:${port} (${nodeEnv}).`);
});
