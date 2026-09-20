import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import { SHEET_HEADERS } from '@frota/shared';

import { assertSheetsEnv, env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { logger } from './logger.js';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

let docPromise = null;

function createAuth() {
  return new JWT({
    email: env.googleServiceAccountEmail,
    key: env.googlePrivateKey,
    scopes: SCOPES,
  });
}

export async function getDoc() {
  try {
    assertSheetsEnv();
  } catch (error) {
    throw new ApiError(503, error.message, { code: 'CONFIG_INCOMPLETE' });
  }

  if (!docPromise) {
    docPromise = (async () => {
      const doc = new GoogleSpreadsheet(env.googleSheetId, createAuth());
      await doc.loadInfo();
      logger.info(`Planilha conectada: "${doc.title}"`);
      return doc;
    })().catch((error) => {
      docPromise = null;
      throw translateGoogleError(error);
    });
  }

  return docPromise;
}

export async function getInventorySheet() {
  const doc = await getDoc();
  let sheet = doc.sheetsByTitle[env.sheetTabName];

  if (!sheet) {
    await doc.loadInfo();
    sheet = doc.sheetsByTitle[env.sheetTabName];
  }

  if (!sheet) {
    const abas = Object.keys(doc.sheetsByTitle).join(', ') || '(nenhuma)';
    throw ApiError.internal(
      `Aba "${env.sheetTabName}" não existe na planilha. Abas encontradas: ${abas}. ` +
        'Rode `npm run sheets:init` para criá-la.',
    );
  }

  try {
    await sheet.loadHeaderRow();
  } catch (error) {
    throw ApiError.internal(
      `Não foi possível ler o cabeçalho da aba "${env.sheetTabName}". ` +
        'Confirme que a linha 1 contém as colunas: ' +
        SHEET_HEADERS.join(', '),
      { cause: error },
    );
  }

  assertHeaders(sheet);
  return sheet;
}

function assertHeaders(sheet) {
  const found = sheet.headerValues.map((header) => header.trim());
  const missing = SHEET_HEADERS.filter((header) => !found.includes(header));

  if (missing.length > 0) {
    throw ApiError.internal(
      `Colunas ausentes na aba "${env.sheetTabName}": ${missing.join(', ')}. ` +
        `Esperado na linha 1: ${SHEET_HEADERS.join(' | ')}.`,
    );
  }
}

export function resetSheetsClient() {
  docPromise = null;
}

export function translateGoogleError(error) {
  if (error instanceof ApiError) return error;

  const status = error?.response?.status ?? error?.code;
  const googleMessage = error?.response?.data?.error?.message ?? error?.message ?? 'erro desconhecido';

  if (status === 404) {
    return ApiError.internal(
      `Planilha não encontrada (GOOGLE_SHEET_ID inválido). Detalhe do Google: ${googleMessage}`,
      { cause: error },
    );
  }

  if (status === 403) {
    return ApiError.internal(
      'Acesso negado à planilha. Compartilhe a planilha com o e-mail da service account ' +
        `(${env.googleServiceAccountEmail || 'GOOGLE_SERVICE_ACCOUNT_EMAIL'}) como Editor. ` +
        `Detalhe do Google: ${googleMessage}`,
      { cause: error },
    );
  }

  if (status === 401 || /invalid_grant|DECODER|private key/i.test(String(googleMessage))) {
    return ApiError.internal(
      'Credenciais inválidas. Revise GOOGLE_SERVICE_ACCOUNT_EMAIL e GOOGLE_PRIVATE_KEY ' +
        `(a chave precisa manter os \\n). Detalhe do Google: ${googleMessage}`,
      { cause: error },
    );
  }

  if (status === 429 || status === 503) {
    return ApiError.serviceUnavailable(
      `Google Sheets indisponível ou com limite de cota excedido. Tente novamente em instantes. Detalhe: ${googleMessage}`,
      { cause: error },
    );
  }

  return ApiError.internal(`Falha ao falar com o Google Sheets: ${googleMessage}`, { cause: error });
}
