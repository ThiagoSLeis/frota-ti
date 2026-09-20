export const API_BASE_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

const MENSAGENS_POR_STATUS = {
  0: 'Não foi possível conectar à API. Verifique se o backend está em execução.',
  400: 'Requisição inválida.',
  404: 'Recurso não encontrado.',
  409: 'Conflito: o registro já existe ou foi alterado.',
  422: 'Alguns campos estão inválidos.',
  500: 'Erro interno no servidor. Tente novamente em instantes.',
  503: 'Serviço indisponível no momento (planilha inacessível?). Tente novamente em instantes.',
};

export class ApiRequestError extends Error {
  constructor({ status, codigo, mensagem, detalhes, corpo }) {
    const texto =
      mensagem || MENSAGENS_POR_STATUS[status] || `Falha na requisição (HTTP ${status}).`;
    super(texto);
    this.name = 'ApiRequestError';
    this.status = status;
    this.codigo = codigo || (status === 0 ? 'REDE_INDISPONIVEL' : `HTTP_${status}`);
    this.mensagem = texto;
    this.detalhes = detalhes && typeof detalhes === 'object' ? detalhes : undefined;
    this.corpo = corpo ?? null;
  }
}

function montarUrl(path, query) {
  const url = `${API_BASE_URL}${path}`;
  if (!query) return url;

  const params = new URLSearchParams();
  for (const [chave, valor] of Object.entries(query)) {
    if (valor === undefined || valor === null) continue;
    const texto = String(valor).trim();
    if (texto !== '') params.append(chave, texto);
  }
  const qs = params.toString();
  return qs ? `${url}${url.includes('?') ? '&' : '?'}${qs}` : url;
}

function isAbortError(error) {
  return error?.name === 'AbortError';
}

export async function request(path, { method = 'GET', body, signal, query } = {}) {
  const temBody = body !== undefined;
  const headers = { Accept: 'application/json' };
  if (temBody) headers['Content-Type'] = 'application/json';

  let response;
  try {
    response = await fetch(montarUrl(path, query), {
      method,
      headers,
      body: temBody ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (error) {
    if (isAbortError(error)) throw error;
    throw new ApiRequestError({ status: 0 });
  }

  let dados = null;
  let texto = '';
  try {
    texto = response.status === 204 ? '' : await response.text();
  } catch (error) {
    if (isAbortError(error)) throw error;
    throw new ApiRequestError({ status: 0 });
  }

  if (texto.trim() !== '') {
    try {
      dados = JSON.parse(texto);
    } catch {
      const offline = response.status === 502 || response.status === 504;
      throw new ApiRequestError({
        status: offline ? 0 : response.status,
        codigo: offline ? undefined : 'RESPOSTA_INVALIDA',
        mensagem: offline
          ? undefined
          : `Resposta inesperada do servidor (HTTP ${response.status}). Verifique se o backend está em execução.`,
      });
    }
  }

  if (!response.ok) {
    const erro = dados && typeof dados === 'object' ? dados.erro : undefined;
    throw new ApiRequestError({
      status: response.status,
      codigo: erro?.codigo,
      mensagem: erro?.mensagem,
      detalhes: erro?.detalhes,
      corpo: dados,
    });
  }

  return dados;
}
