function acknowledgePlaceholderWebhook(webhookName) {
  return (_request, response) => {
    response.status(202).json({
      received: true,
      webhook: webhookName,
      message: 'Placeholder endpoint. Provider integration has not been configured yet.'
    });
  };
}

module.exports = { acknowledgePlaceholderWebhook };
