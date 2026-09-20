import { EQUIPAMENTO_FIELDS, STATUS_LIST, validateEquipamento } from '@frota/shared';

import { equipamentosRepository } from '../repositories/equipamentos.repository.js';
import { sheetWriteMutex } from '../lib/mutex.js';
import { toPublicEquipamento } from '../domain/equipamento.js';
import { ApiError } from '../utils/ApiError.js';

export function createEquipamentosService({
  repository = equipamentosRepository,
  mutex = sheetWriteMutex,
} = {}) {
  async function list({ busca } = {}) {
    const equipamentos = await repository.findAll();
    const filtrados = filtrar(equipamentos, busca);
    return filtrados.map(toPublicEquipamento);
  }

  async function getById(id) {
    const equipamento = await repository.findById(id);
    if (!equipamento) throw naoEncontrado(id);
    return toPublicEquipamento(equipamento);
  }

  async function create(payload) {
    const { valid, value, errors } = validateEquipamento(payload);
    if (!valid) throw ApiError.unprocessable('Dados inválidos', { details: errors });

    return mutex.runExclusive(async () => {
      await assertPatrimonioLivre(value.patrimonio, null);
      const criado = await repository.create(value);
      return toPublicEquipamento(criado);
    });
  }

  async function update(id, payload) {
    if (!isPlainObject(payload) || !EQUIPAMENTO_FIELDS.some((field) => field in payload)) {
      throw ApiError.badRequest('Envie ao menos um campo para atualizar');
    }

    return mutex.runExclusive(async () => {
      const atual = await repository.findById(id);
      if (!atual) throw naoEncontrado(id);

      const mesclado = {
        modelo: pick(payload, 'modelo', atual.modelo),
        patrimonio: pick(payload, 'patrimonio', atual.patrimonio),
        responsavel: pick(payload, 'responsavel', atual.responsavel),
        status: pick(payload, 'status', atual.status),
      };

      const { valid, value, errors } = validateEquipamento(mesclado);
      if (!valid) throw ApiError.unprocessable('Dados inválidos', { details: errors });

      await assertPatrimonioLivre(value.patrimonio, atual.id);

      const atualizado = await repository.update(atual.id, value);
      if (!atualizado) throw naoEncontrado(id);

      return toPublicEquipamento(atualizado);
    });
  }

  async function remove(id) {
    return mutex.runExclusive(async () => {
      const removido = await repository.remove(id);
      if (!removido) throw naoEncontrado(id);
      return toPublicEquipamento(removido);
    });
  }

  async function summary() {
    const equipamentos = await repository.findAll();
    const porStatus = Object.fromEntries(STATUS_LIST.map((status) => [status, 0]));
    let outros = 0;

    for (const { status } of equipamentos) {
      if (status in porStatus) porStatus[status] += 1;
      else outros += 1;
    }

    return { total: equipamentos.length, porStatus, outros };
  }

  async function assertPatrimonioLivre(patrimonio, idAtual) {
    const existente = await repository.findByPatrimonio(patrimonio);
    if (existente && existente.id !== idAtual) {
      throw ApiError.conflict(`O patrimônio ${patrimonio} já está cadastrado (${existente.id})`, {
        details: { patrimonio: 'Patrimônio já cadastrado' },
      });
    }
  }

  return { list, getById, create, update, remove, summary };
}

export function filtrar(equipamentos, busca) {
  const termo = foldForSearch(busca);
  if (!termo) return equipamentos;

  return equipamentos.filter(
    (item) =>
      foldForSearch(item.responsavel).includes(termo) ||
      foldForSearch(item.patrimonio).includes(termo),
  );
}

function foldForSearch(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase();
}

function pick(payload, field, fallback) {
  return Object.prototype.hasOwnProperty.call(payload, field) ? payload[field] : fallback;
}

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function naoEncontrado(id) {
  return ApiError.notFound(`Equipamento ${id} não encontrado`);
}

export const equipamentosService = createEquipamentosService();
