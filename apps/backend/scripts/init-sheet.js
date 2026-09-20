import { SHEET_HEADERS, STATUS } from '@frota/shared';

import { assertSheetsEnv, env } from '../src/config/env.js';
import { getDoc, translateGoogleError } from '../src/lib/sheetsClient.js';
import { logger } from '../src/lib/logger.js';

const SAMPLE_ROWS = [
  ['EQ-0001', 'Dell Latitude 3420', 'TI-001', 'João Silva', STATUS.EM_USO],
  ['EQ-0002', 'Lenovo ThinkPad T14', 'TI-002', 'Maria Souza', STATUS.EM_USO],
  ['EQ-0003', 'Dell Vostro 3510', 'TI-003', '', STATUS.DISPONIVEL],
  ['EQ-0004', 'Apple MacBook Air M2', 'TI-004', 'Carla Nunes', STATUS.EM_USO],
  ['EQ-0005', 'Acer Aspire 5', 'TI-005', '', STATUS.EM_MANUTENCAO],
];

async function main() {
  assertSheetsEnv();

  const doc = await getDoc();
  logger.info(`Planilha: "${doc.title}"`);

  let sheet = doc.sheetsByTitle[env.sheetTabName];

  if (!sheet) {
    logger.info(`Criando aba "${env.sheetTabName}"...`);
    sheet = await doc.addSheet({ title: env.sheetTabName, headerValues: [...SHEET_HEADERS] });
  } else {
    logger.info(`Aba "${env.sheetTabName}" já existe. Conferindo cabeçalho...`);
    await sheet.loadHeaderRow().catch(() => undefined);
    const atual = (sheet.headerValues ?? []).map((header) => String(header).trim());
    const faltando = SHEET_HEADERS.filter((header) => !atual.includes(header));

    if (faltando.length > 0) {
      if (atual.filter(Boolean).length === 0) {
        await sheet.setHeaderRow([...SHEET_HEADERS]);
        logger.info('Cabeçalho gravado na linha 1.');
      } else {
        throw new Error(
          `A aba já tem um cabeçalho diferente (${atual.join(' | ')}) e faltam as colunas: ` +
            `${faltando.join(', ')}. Ajuste a linha 1 manualmente para: ${SHEET_HEADERS.join(' | ')}.`,
        );
      }
    } else {
      logger.info(`Cabeçalho ok: ${atual.join(' | ')}`);
    }
  }

  await formatHeader(sheet);

  if (!env.seedSampleData) {
    logger.info('SEED_SAMPLE_DATA desligado: nada inserido. Pronto para uso.');
    return;
  }

  const rows = await sheet.getRows();
  if (rows.length > 0) {
    logger.info(`A aba já tem ${rows.length} linha(s); seed ignorado para não duplicar dados.`);
    return;
  }

  await sheet.addRows(
    SAMPLE_ROWS.map((row) => Object.fromEntries(SHEET_HEADERS.map((header, i) => [header, row[i]]))),
  );
  logger.info(`${SAMPLE_ROWS.length} equipamentos de exemplo inseridos.`);
}

async function formatHeader(sheet) {
  try {
    await sheet.loadCells('A1:E1');
    for (let column = 0; column < SHEET_HEADERS.length; column += 1) {
      const cell = sheet.getCell(0, column);
      cell.textFormat = { bold: true };
      cell.backgroundColor = { red: 0.93, green: 0.95, blue: 1 };
    }
    await sheet.saveUpdatedCells();
    await sheet.updateProperties({ gridProperties: { frozenRowCount: 1 } });
  } catch (error) {
    logger.warn('Não foi possível formatar o cabeçalho (segue sem formatação):', error.message);
  }
}

main()
  .then(() => {
    logger.info('Concluído. Rode `npm run dev` na raiz do monorepo.');
    process.exit(0);
  })
  .catch((error) => {
    const traduzido = translateGoogleError(error);
    logger.error(traduzido.message);
    process.exit(1);
  });
