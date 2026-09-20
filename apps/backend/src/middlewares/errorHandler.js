import { ApiError } from '../utils/ApiError.js';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';

export function errorHandler(error, req, res, _next) {
  const apiError = normalize(error);

  if (apiError.status >= 500) {
    logger.error(`${req.method} ${req.originalUrl} ->`, apiError.message, apiError.cause ?? '');
  } else {
    logger.warn(`${req.method} ${req.originalUrl} -> ${apiError.status} ${apiError.message}`);
  }

  res.status(apiError.status).json({
    erro: {
      codigo: apiError.code,
      mensagem: apiError.message,
      ...(apiError.details ? { detalhes: apiError.details } : {}),
      ...(env.isProduction || apiError.status < 500 ? {} : { stack: apiError.stack }),
    },
  });
}

function normalize(error) {
  if (error instanceof ApiError) return error;

  if (error?.type === 'entity.parse.failed') {
    return ApiError.badRequest('Corpo da requisição não é um JSON válido');
  }

  if (error?.type === 'entity.too.large') {
    return ApiError.badRequest('Corpo da requisição muito grande');
  }

  return ApiError.internal(error?.message ?? 'Erro interno', { cause: error });
}
