import { FIELD_TO_HEADER, normalizeStatus } from '@frota/shared';

export function rowToEquipamento(row) {
  const statusRaw = read(row, 'status');

  return {
    id: read(row, 'id'),
    modelo: read(row, 'modelo'),
    patrimonio: read(row, 'patrimonio'),
    responsavel: read(row, 'responsavel'),
    status: normalizeStatus(statusRaw) ?? statusRaw,
    _rowNumber: row.rowNumber,
  };
}

export function equipamentoToRow(equipamento) {
  const row = {};
  for (const [field, header] of Object.entries(FIELD_TO_HEADER)) {
    if (equipamento[field] !== undefined) row[header] = equipamento[field];
  }
  return row;
}

export function toPublicEquipamento(equipamento) {
  const { _rowNumber, ...pub } = equipamento;
  return pub;
}

function read(row, field) {
  const value = row.get(FIELD_TO_HEADER[field]);
  if (value === null || value === undefined) return '';
  return String(value).trim();
}
