export const SHEET_TAB_NAME = 'Inventário';

export const SHEET_HEADERS = Object.freeze([
  'ID',
  'Modelo',
  'Patrimônio',
  'Responsável',
  'Status',
]);

export const FIELD_TO_HEADER = Object.freeze({
  id: 'ID',
  modelo: 'Modelo',
  patrimonio: 'Patrimônio',
  responsavel: 'Responsável',
  status: 'Status',
});

export const HEADER_TO_FIELD = Object.freeze(
  Object.fromEntries(Object.entries(FIELD_TO_HEADER).map(([field, header]) => [header, field])),
);

export const EQUIPAMENTO_FIELDS = Object.freeze(['modelo', 'patrimonio', 'responsavel', 'status']);
