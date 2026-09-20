export class ApiError extends Error {
  constructor(status, message, { code, details, cause } = {}) {
    super(message, cause ? { cause } : undefined);
    this.name = 'ApiError';
    this.status = status;
    this.code = code ?? defaultCode(status);
    if (details) this.details = details;
  }

  static badRequest(message, options) {
    return new ApiError(400, message, { code: 'BAD_REQUEST', ...options });
  }

  static notFound(message = 'Recurso não encontrado', options) {
    return new ApiError(404, message, { code: 'NOT_FOUND', ...options });
  }

  static conflict(message, options) {
    return new ApiError(409, message, { code: 'CONFLICT', ...options });
  }

  static unprocessable(message = 'Dados inválidos', options) {
    return new ApiError(422, message, { code: 'VALIDATION_ERROR', ...options });
  }

  static internal(message = 'Erro interno', options) {
    return new ApiError(500, message, { code: 'INTERNAL_ERROR', ...options });
  }

  static serviceUnavailable(message, options) {
    return new ApiError(503, message, { code: 'SHEETS_UNAVAILABLE', ...options });
  }
}

function defaultCode(status) {
  return status >= 500 ? 'INTERNAL_ERROR' : 'REQUEST_ERROR';
}
