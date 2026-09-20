import { request } from './http.js';

const BASE = '/api/equipamentos';

export async function listarEquipamentos({ busca, signal } = {}) {
  const dados = await request(BASE, { query: { busca }, signal });
  return Array.isArray(dados) ? dados : [];
}

export function obterResumo({ signal } = {}) {
  return request(`${BASE}/resumo`, { signal });
}

export function criarEquipamento(payload) {
  return request(BASE, { method: 'POST', body: payload });
}

export function atualizarEquipamento(id, payload) {
  return request(`${BASE}/${encodeURIComponent(id)}`, { method: 'PUT', body: payload });
}

export async function removerEquipamento(id) {
  const dados = await request(`${BASE}/${encodeURIComponent(id)}`, { method: 'DELETE' });
  return dados?.equipamento ?? null;
}

export async function verificarSaude({ signal } = {}) {
  try {
    return await request('/api/health', { signal });
  } catch (error) {
    if (error?.status === 503 && error.corpo && typeof error.corpo === 'object' && error.corpo.sheets) {
      return error.corpo;
    }
    throw error;
  }
}
