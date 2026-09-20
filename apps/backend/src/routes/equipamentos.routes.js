import { Router } from 'express';

import { equipamentosController } from '../controllers/equipamentos.controller.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const equipamentosRoutes = Router();

equipamentosRoutes.get('/', asyncHandler(equipamentosController.index));
equipamentosRoutes.get('/resumo', asyncHandler(equipamentosController.summary));
equipamentosRoutes.get('/:id', asyncHandler(equipamentosController.show));
equipamentosRoutes.post('/', asyncHandler(equipamentosController.store));
equipamentosRoutes.put('/:id', asyncHandler(equipamentosController.update));
equipamentosRoutes.patch('/:id', asyncHandler(equipamentosController.update));
equipamentosRoutes.delete('/:id', asyncHandler(equipamentosController.destroy));
