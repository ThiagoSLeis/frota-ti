import test from 'node:test';
import assert from 'node:assert/strict';

import { validateEquipamento } from './validation.js';
import { STATUS, normalizeStatus } from './status.js';

test('aceita um equipamento valido e normaliza espacos/caixa', () => {
  const { valid, value } = validateEquipamento({
    modelo: '  Dell   Latitude 3420 ',
    patrimonio: ' ti-001 ',
    responsavel: '  João  Silva ',
    status: 'em uso',
  });

  assert.ok(valid);
  assert.deepEqual(value, {
    modelo: 'Dell Latitude 3420',
    patrimonio: 'TI-001',
    responsavel: 'João Silva',
    status: STATUS.EM_USO,
  });
});

test('reporta erro por campo', () => {
  const { valid, errors } = validateEquipamento({ modelo: 'A', patrimonio: 'TI 001', status: '' });

  assert.equal(valid, false);
  assert.ok(errors.modelo);
  assert.ok(errors.patrimonio);
  assert.ok(errors.status);
});

test('responsavel e opcional quando o equipamento nao esta em uso', () => {
  const { valid, value } = validateEquipamento({
    modelo: 'Lenovo T14',
    patrimonio: 'TI-002',
    status: STATUS.DISPONIVEL,
  });

  assert.ok(valid);
  assert.equal(value.responsavel, '');
});

test('modo parcial valida apenas os campos enviados', () => {
  const { valid, value } = validateEquipamento({ status: 'EM MANUTENCAO' }, { partial: true });

  assert.ok(valid);
  assert.deepEqual(value, { status: STATUS.EM_MANUTENCAO });
});

test('normalizeStatus aceita variacoes vindas da planilha', () => {
  assert.equal(normalizeStatus('disponivel'), STATUS.DISPONIVEL);
  assert.equal(normalizeStatus('  EM   USO '), STATUS.EM_USO);
  assert.equal(normalizeStatus('Em Manutencao'), STATUS.EM_MANUTENCAO);
  assert.equal(normalizeStatus('Perdido'), null);
  assert.equal(normalizeStatus(undefined), null);
});
