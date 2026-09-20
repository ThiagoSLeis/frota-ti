import { STATUS, STATUS_LIST, STATUS_META } from '@frota/shared';

export const THEME_STORAGE_KEY = 'frota-ti:theme';

export const STATUS_TONE = Object.freeze({
  [STATUS.DISPONIVEL]: 'success',
  [STATUS.EM_USO]: 'info',
  [STATUS.EM_MANUTENCAO]: 'warning',
});

export const STATUS_OPTIONS = Object.freeze(
  STATUS_LIST.map((status) => Object.freeze({ value: status, label: STATUS_META[status]?.label ?? status })),
);

export const BUSCA_DEBOUNCE_MS = 300;
