import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';

const app = createApp();

const server = app.listen(env.port, () => {
  logger.info(`API no ar em http://localhost:${env.port} (${env.nodeEnv})`);
  logger.info(`Planilha: ${maskSheetId(env.googleSheetId)} | aba: "${env.sheetTabName}"`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    logger.info(`${signal} recebido, encerrando servidor...`);
    server.close(() => process.exit(0));
  });
}

process.on('unhandledRejection', (reason) => {
  logger.error('unhandledRejection', reason);
});

function maskSheetId(id) {
  if (!id) return '(nao configurada)';
  return id.length <= 8 ? id : `${id.slice(0, 4)}...${id.slice(-4)}`;
}
