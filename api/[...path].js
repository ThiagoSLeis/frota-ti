// Entrypoint serverless da Vercel para toda a API.
//
// A Vercel roteia qualquer /api/<algo> para esta funcao mantendo o caminho
// original em req.url, entao o app Express continua casando suas rotas
// (/api/health, /api/equipamentos, ...) sem nenhuma alteracao no backend.
import { createApp } from '../apps/backend/src/app.js';

const app = createApp();

export default app;
