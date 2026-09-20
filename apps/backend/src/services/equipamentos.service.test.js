import test from 'node:test';
import assert from 'node:assert/strict';
import { STATUS } from '@frota/shared';

import { createEquipamentosService, filtrar } from './equipamentos.service.js';
import { createMutex } from '../lib/mutex.js';
import { nextId } from '../repositories/equipamentos.repository.js';

function createFakeRepository(seed = []) {
  let linhas = seed.map((item) => ({ ...item }));

  return {
    get linhas() {
      return linhas;
    },
    async findAll() {
      return linhas.map((item) => ({ ...item }));
    },
    async findById(id) {
      const found = linhas.find((item) => item.id.toLowerCase() === String(id).toLowerCase());
      return found ? { ...found } : null;
    },
    async findByPatrimonio(patrimonio) {
      const found = linhas.find((item) => item.patrimonio === patrimonio);
      return found ? { ...found } : null;
    },
    async create(data) {
      const criado = { id: nextId(linhas), ...data };
      linhas = [...linhas, criado];
      return { ...criado };
    },
    async update(id, patch) {
      const index = linhas.findIndex((item) => item.id === id);
      if (index === -1) return null;
      linhas[index] = { ...linhas[index], ...patch };
      return { ...linhas[index] };
    },
    async remove(id) {
      const index = linhas.findIndex((item) => item.id === id);
      if (index === -1) return null;
      const [removido] = linhas.splice(index, 1);
      return { ...removido };
    },
  };
}

function makeService(seed) {
  const repository = createFakeRepository(seed);
  const service = createEquipamentosService({ repository, mutex: createMutex() });
  return { repository, service };
}

const NOTEBOOK = {
  modelo: 'Dell Latitude 3420',
  patrimonio: 'TI-001',
  responsavel: 'João Silva',
  status: STATUS.EM_USO,
};

test('create normaliza os dados e gera o ID', async () => {
  const { service } = makeService();

  const criado = await service.create({ ...NOTEBOOK, patrimonio: ' ti-001 ', modelo: 'Dell   Latitude 3420' });

  assert.equal(criado.id, 'EQ-0001');
  assert.equal(criado.patrimonio, 'TI-001');
  assert.equal(criado.modelo, 'Dell Latitude 3420');
  assert.equal(criado._rowNumber, undefined, 'campo interno nao deve vazar na resposta');
});

test('create recusa payload invalido com erro por campo', async () => {
  const { service } = makeService();

  await assert.rejects(
    service.create({ modelo: 'X', patrimonio: '', status: 'Sumiu' }),
    (error) => {
      assert.equal(error.status, 422);
      assert.deepEqual(Object.keys(error.details).sort(), ['modelo', 'patrimonio', 'status']);
      return true;
    },
  );
});

test('create exige responsavel quando status e "Em Uso"', async () => {
  const { service } = makeService();

  await assert.rejects(
    service.create({ ...NOTEBOOK, responsavel: '' }),
    (error) => error.status === 422 && 'responsavel' in error.details,
  );
});

test('create recusa patrimonio duplicado com 409', async () => {
  const { service } = makeService();
  await service.create(NOTEBOOK);

  await assert.rejects(
    service.create({ ...NOTEBOOK, patrimonio: 'ti-001' }),
    (error) => error.status === 409,
  );
});

test('update parcial mantem os campos nao enviados', async () => {
  const { service } = makeService();
  const criado = await service.create(NOTEBOOK);

  const atualizado = await service.update(criado.id, { status: STATUS.EM_MANUTENCAO });

  assert.equal(atualizado.modelo, NOTEBOOK.modelo);
  assert.equal(atualizado.patrimonio, 'TI-001');
  assert.equal(atualizado.status, STATUS.EM_MANUTENCAO);
});

test('update valida o registro completo depois da mesclagem', async () => {
  const { service } = makeService();
  const criado = await service.create({ ...NOTEBOOK, responsavel: '', status: STATUS.DISPONIVEL });

  await assert.rejects(
    service.update(criado.id, { status: STATUS.EM_USO }),
    (error) => error.status === 422 && 'responsavel' in error.details,
  );
});

test('update e remove retornam 404 para ID inexistente', async () => {
  const { service } = makeService();

  await assert.rejects(service.update('EQ-9999', { status: STATUS.DISPONIVEL }), (e) => e.status === 404);
  await assert.rejects(service.remove('EQ-9999'), (e) => e.status === 404);
});

test('update sem campos retorna 400', async () => {
  const { service } = makeService();
  const criado = await service.create(NOTEBOOK);

  await assert.rejects(service.update(criado.id, {}), (error) => error.status === 400);
});

test('remove apaga a linha e devolve o equipamento', async () => {
  const { repository, service } = makeService();
  const criado = await service.create(NOTEBOOK);

  const removido = await service.remove(criado.id);

  assert.equal(removido.id, criado.id);
  assert.equal(repository.linhas.length, 0);
});

test('escritas concorrentes nao geram IDs duplicados nem patrimonio repetido', async () => {
  const { repository, service } = makeService();

  const resultados = await Promise.allSettled([
    service.create({ ...NOTEBOOK, patrimonio: 'TI-100' }),
    service.create({ ...NOTEBOOK, patrimonio: 'TI-101' }),
    service.create({ ...NOTEBOOK, patrimonio: 'TI-102' }),
    service.create({ ...NOTEBOOK, patrimonio: 'TI-100' }),
  ]);

  const criados = resultados.filter((r) => r.status === 'fulfilled').map((r) => r.value);
  const rejeitados = resultados.filter((r) => r.status === 'rejected');

  assert.equal(criados.length, 3);
  assert.equal(rejeitados.length, 1);
  assert.equal(rejeitados[0].reason.status, 409);
  assert.deepEqual(
    criados.map((item) => item.id).sort(),
    ['EQ-0001', 'EQ-0002', 'EQ-0003'],
  );
  assert.equal(new Set(repository.linhas.map((l) => l.patrimonio)).size, 3);
});

test('summary conta total e agrupa por status', async () => {
  const { service } = makeService();
  await service.create({ ...NOTEBOOK, patrimonio: 'TI-001' });
  await service.create({ modelo: 'Lenovo T14', patrimonio: 'TI-002', responsavel: '', status: STATUS.DISPONIVEL });
  await service.create({ modelo: 'Macbook Air', patrimonio: 'TI-003', responsavel: '', status: STATUS.EM_MANUTENCAO });

  const resumo = await service.summary();

  assert.equal(resumo.total, 3);
  assert.equal(resumo.porStatus[STATUS.EM_USO], 1);
  assert.equal(resumo.porStatus[STATUS.DISPONIVEL], 1);
  assert.equal(resumo.porStatus[STATUS.EM_MANUTENCAO], 1);
  assert.equal(resumo.outros, 0);
});

test('list filtra por responsavel ou patrimonio ignorando acento e caixa', async () => {
  const { service } = makeService();
  await service.create({ ...NOTEBOOK, patrimonio: 'TI-001', responsavel: 'João Silva' });
  await service.create({ modelo: 'Lenovo T14', patrimonio: 'RH-050', responsavel: 'Maria Souza', status: STATUS.EM_USO });

  assert.equal((await service.list({ busca: 'joao' })).length, 1);
  assert.equal((await service.list({ busca: 'RH-' })).length, 1);
  assert.equal((await service.list({ busca: 'rh-050' })).length, 1);
  assert.equal((await service.list({ busca: '' })).length, 2);
  assert.equal((await service.list({ busca: 'ninguem' })).length, 0);
});

test('filtrar e puro e nao muta a lista original', () => {
  const lista = [{ patrimonio: 'TI-001', responsavel: 'Ana' }];
  const resultado = filtrar(lista, 'ana');

  assert.equal(resultado.length, 1);
  assert.equal(lista.length, 1);
});

test('update com apenas chaves desconhecidas retorna 400', async () => {
  const { service } = makeService();
  const criado = await service.create(NOTEBOOK);

  await assert.rejects(service.update(criado.id, { foo: 1 }), (error) => error.status === 400);
});
