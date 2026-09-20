import { Router } from 'express';
import { STATUS_LIST } from '@frota/shared';

import { equipamentosRoutes } from './equipamentos.routes.js';
import { healthRoutes } from './health.routes.js';

export const routes = Router();

routes.use('/health', healthRoutes);
routes.use('/equipamentos', equipamentosRoutes);

routes.get('/', (req, res) => {
  res.json({
    nome: 'API Gestão de Frota de TI',
    versao: '1.0.0',
    documentacao: '/api/docs',
    statusDisponiveis: STATUS_LIST,
    rotas: [
      'GET    /api/health',
      'GET    /api/docs',
      'GET    /api/equipamentos',
      'GET    /api/equipamentos/resumo',
      'GET    /api/equipamentos/:id',
      'POST   /api/equipamentos',
      'PUT    /api/equipamentos/:id',
      'PATCH  /api/equipamentos/:id',
      'DELETE /api/equipamentos/:id',
    ],
  });
});
