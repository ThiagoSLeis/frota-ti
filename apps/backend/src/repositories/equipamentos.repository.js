import { getInventorySheet, translateGoogleError } from '../lib/sheetsClient.js';
import { equipamentoToRow, rowToEquipamento } from '../domain/equipamento.js';

const ID_PREFIX = 'EQ-';
const ID_PATTERN = /^EQ-(\d+)$/i;
const ID_PAD = 4;

export const equipamentosRepository = {
  async findAll() {
    const rows = await loadRows();
    return rows.map(rowToEquipamento);
  },

  async findById(id) {
    const { equipamento } = await findRow(id);
    return equipamento;
  },

  async findByPatrimonio(patrimonio) {
    const rows = await loadRows();
    const target = normalizeKey(patrimonio);
    const row = rows.find((item) => normalizeKey(rowToEquipamento(item).patrimonio) === target);
    return row ? rowToEquipamento(row) : null;
  },

  async create(data) {
    const sheet = await withGoogleErrors(() => getInventorySheet());
    const rows = await withGoogleErrors(() => sheet.getRows());
    const id = nextId(rows.map(rowToEquipamento));

    const row = await withGoogleErrors(() =>
      sheet.addRow(equipamentoToRow({ ...data, id }), { insert: true }),
    );

    return rowToEquipamento(row);
  },

  async update(id, patch) {
    const { row, equipamento } = await findRow(id);
    if (!row) return null;

    row.assign(equipamentoToRow({ ...patch, id: equipamento.id }));
    await withGoogleErrors(() => row.save());

    return rowToEquipamento(row);
  },

  async remove(id) {
    const { row, equipamento } = await findRow(id);
    if (!row) return null;

    await withGoogleErrors(() => row.delete());
    return equipamento;
  },
};

async function loadRows() {
  const sheet = await withGoogleErrors(() => getInventorySheet());
  return withGoogleErrors(() => sheet.getRows());
}

async function findRow(id) {
  const rows = await loadRows();
  const target = normalizeKey(id);

  for (const row of rows) {
    const equipamento = rowToEquipamento(row);
    if (normalizeKey(equipamento.id) === target) return { row, equipamento };
  }

  return { row: null, equipamento: null };
}

export function nextId(equipamentos) {
  const maior = equipamentos.reduce((max, { id }) => {
    const match = ID_PATTERN.exec(String(id ?? '').trim());
    if (!match) return max;
    return Math.max(max, Number.parseInt(match[1], 10));
  }, 0);

  return `${ID_PREFIX}${String(maior + 1).padStart(ID_PAD, '0')}`;
}

function normalizeKey(value) {
  return String(value ?? '').trim().toLowerCase();
}

async function withGoogleErrors(operation) {
  try {
    return await operation();
  } catch (error) {
    throw translateGoogleError(error);
  }
}
