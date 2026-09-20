import test from 'node:test';
import assert from 'node:assert/strict';

import { nextId } from './equipamentos.repository.js';

test('nextId comeca em EQ-0001 em planilha vazia', () => {
  assert.equal(nextId([]), 'EQ-0001');
});

test('nextId usa o maior ID existente, nao a quantidade de linhas', () => {
  const equipamentos = [{ id: 'EQ-0001' }, { id: 'EQ-0009' }, { id: 'EQ-0003' }];
  assert.equal(nextId(equipamentos), 'EQ-0010');
});

test('nextId ignora IDs fora do padrao (linhas editadas a mao)', () => {
  const equipamentos = [{ id: 'notebook-antigo' }, { id: '' }, { id: 'EQ-0042' }, { id: undefined }];
  assert.equal(nextId(equipamentos), 'EQ-0043');
});

test('nextId nao quebra a largura quando passa de 9999', () => {
  assert.equal(nextId([{ id: 'EQ-9999' }]), 'EQ-10000');
});
