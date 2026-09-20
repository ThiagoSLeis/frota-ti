import { Router } from 'express';

import { env, missingSheetsEnv } from '../config/env.js';
import { getInventorySheet } from '../lib/sheetsClient.js';
import { sheetWriteMutex } from '../lib/mutex.js';

export const healthRoutes = Router();

healthRoutes.get('/', async (req, res) => {
  const faltando = missingSheetsEnv();
  const base = {
    status: 'ok',
    ambiente: env.nodeEnv,
    uptimeSegundos: Math.round(process.uptime()),
    escritasNaFila: sheetWriteMutex.queued,
  };

  if (faltando.length > 0) {
    return res.status(503).json({
      ...base,
      status: 'configuracao_incompleta',
      sheets: { conectado: false, variaveisAusentes: faltando },
    });
  }

  try {
    const sheet = await getInventorySheet();
    const rows = await sheet.getRows();
    return res.json({
      ...base,
      sheets: {
        conectado: true,
        aba: sheet.title,
        equipamentos: rows.length,
        colunas: sheet.headerValues,
      },
    });
  } catch (error) {
    return res.status(503).json({
      ...base,
      status: 'sheets_indisponivel',
      sheets: { conectado: false, erro: error.message },
    });
  }
});
