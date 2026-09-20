export const STATUS = Object.freeze({
  DISPONIVEL: 'Disponível',
  EM_USO: 'Em Uso',
  EM_MANUTENCAO: 'Em Manutenção',
});

export const STATUS_LIST = Object.freeze([
  STATUS.DISPONIVEL,
  STATUS.EM_USO,
  STATUS.EM_MANUTENCAO,
]);

export const STATUS_META = Object.freeze({
  [STATUS.DISPONIVEL]: Object.freeze({
    label: 'Disponível',
    tone: 'success',
    description: 'Pronto para ser entregue a um colaborador',
  }),
  [STATUS.EM_USO]: Object.freeze({
    label: 'Em Uso',
    tone: 'info',
    description: 'Alocado para um responsável',
  }),
  [STATUS.EM_MANUTENCAO]: Object.freeze({
    label: 'Em Manutenção',
    tone: 'warning',
    description: 'Em reparo ou aguardando peças',
  }),
});

export function isStatus(value) {
  return STATUS_LIST.includes(value);
}

export function normalizeStatus(value) {
  if (typeof value !== 'string') return null;

  const wanted = foldForCompare(value);
  if (!wanted) return null;

  return STATUS_LIST.find((status) => foldForCompare(status) === wanted) ?? null;
}

function foldForCompare(value) {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}
