const express = require('express');
const actionRoutes = require('./routes/action.routes');
const callbackRoutes = require('./routes/callback.routes');
const callRoutes = require('./routes/call.routes');
const conversationRoutes = require('./routes/conversation.routes');
const followupRoutes = require('./routes/followup.routes');
const healthRoutes = require('./routes/health.routes');
const leadRoutes = require('./routes/lead.routes');
const sessionRoutes = require('./routes/session.routes');
const webhookRoutes = require('./routes/webhook.routes');

const app = express();

app.use(express.json());

app.use('/api/actions', actionRoutes);
app.use('/api/callbacks', callbackRoutes);
app.use('/api/calls', callRoutes);
app.use('/api/conversation', conversationRoutes);
app.use('/api/followups', followupRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/health', healthRoutes);
app.use('/webhooks', webhookRoutes);

app.use((_request, response) => {
  response.status(404).json({ error: 'Route not found' });
});

module.exports = app;
