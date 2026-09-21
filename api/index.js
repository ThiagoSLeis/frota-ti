// Entrypoint serverless da Vercel para toda a API.
//
// O vercel.json reescreve qualquer /api/<algo> (inclusive caminhos com varios
// segmentos, como /api/equipamentos/EQ-0001) para esta funcao. A Vercel mantem
// o caminho original em req.url, entao o app Express continua casando suas
// rotas sem nenhuma alteracao no backend.
import { createApp } from '../apps/backend/src/app.js';

const app = createApp();

export default app;
