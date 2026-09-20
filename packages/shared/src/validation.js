import { EQUIPAMENTO_FIELDS } from './schema.js';
import { STATUS, STATUS_LIST, normalizeStatus } from './status.js';

export const PATRIMONIO_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{1,19}$/;

const LIMITS = Object.freeze({
  modelo: { min: 2, max: 80 },
  responsavel: { max: 80 },
});

export class ValidationError extends Error {
  constructor(fields, message = 'Dados inválidos') {
    super(message);
    this.name = 'ValidationError';
    this.fields = fields;
  }
}

export function validateEquipamento(input, options = {}) {
  const { partial = false } = options;
  const source = isPlainObject(input) ? input : {};
  const errors = {};
  const value = {};

  const has = (field) => Object.prototype.hasOwnProperty.call(source, field);
  const shouldCheck = (field) => !partial || has(field);

  if (shouldCheck('modelo')) {
    const modelo = collapseSpaces(source.modelo);
    if (!modelo) {
      errors.modelo = 'Modelo é obrigatório';
    } else if (modelo.length < LIMITS.modelo.min) {
      errors.modelo = `Modelo deve ter ao menos ${LIMITS.modelo.min} caracteres`;
    } else if (modelo.length > LIMITS.modelo.max) {
      errors.modelo = `Modelo deve ter no máximo ${LIMITS.modelo.max} caracteres`;
    } else {
      value.modelo = modelo;
    }
  }

  if (shouldCheck('patrimonio')) {
    const patrimonio = collapseSpaces(source.patrimonio).toUpperCase();
    if (!patrimonio) {
      errors.patrimonio = 'Patrimônio é obrigatório';
    } else if (!PATRIMONIO_PATTERN.test(patrimonio)) {
      errors.patrimonio = 'Use 2 a 20 caracteres: letras, números, "-" ou "_" (ex.: TI-001)';
    } else {
      value.patrimonio = patrimonio;
    }
  }

  if (shouldCheck('responsavel')) {
    const responsavel = collapseSpaces(source.responsavel);
    if (responsavel.length > LIMITS.responsavel.max) {
      errors.responsavel = `Responsável deve ter no máximo ${LIMITS.responsavel.max} caracteres`;
    } else {
      value.responsavel = responsavel;
    }
  }

  if (shouldCheck('status')) {
    const raw = typeof source.status === 'string' ? source.status.trim() : '';
    if (!raw) {
      errors.status = 'Status é obrigatório';
    } else {
      const status = normalizeStatus(raw);
      if (!status) {
        errors.status = `Status deve ser um destes: ${STATUS_LIST.join(', ')}`;
      } else {
        value.status = status;
      }
    }
  }

  const finalStatus = value.status ?? (partial ? null : undefined);
  if (finalStatus === STATUS.EM_USO && shouldCheck('responsavel') && !value.responsavel) {
    errors.responsavel = 'Informe o responsável para equipamentos "Em Uso"';
  }

  for (const key of Object.keys(value)) {
    if (!EQUIPAMENTO_FIELDS.includes(key)) delete value[key];
  }

  return { valid: Object.keys(errors).length === 0, value, errors };
}

function collapseSpaces(value) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/\s+/g, ' ').trim();
}

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
