import test from 'node:test';
import assert from 'node:assert/strict';

import { createMutex } from './mutex.js';

const tick = (ms = 5) => new Promise((resolve) => setTimeout(resolve, ms));

test('mutex executa uma tarefa por vez, mesmo com tarefas concorrentes', async () => {
  const mutex = createMutex();
  let emExecucao = 0;
  let maxSimultaneo = 0;

  const tarefa = async (id) => {
    emExecucao += 1;
    maxSimultaneo = Math.max(maxSimultaneo, emExecucao);
    await tick(10);
    emExecucao -= 1;
    return id;
  };

  const resultados = await Promise.all([1, 2, 3, 4, 5].map((id) => mutex.runExclusive(() => tarefa(id))));

  assert.equal(maxSimultaneo, 1, 'duas tarefas rodaram ao mesmo tempo');
  assert.deepEqual(resultados, [1, 2, 3, 4, 5]);
});

test('mutex preserva a ordem de chegada (FIFO)', async () => {
  const mutex = createMutex();
  const ordem = [];

  await Promise.all(
    ['a', 'b', 'c'].map((letra) =>
      mutex.runExclusive(async () => {
        await tick(letra === 'a' ? 20 : 1);
        ordem.push(letra);
      }),
    ),
  );

  assert.deepEqual(ordem, ['a', 'b', 'c']);
});

test('erro em uma tarefa nao trava a fila', async () => {
  const mutex = createMutex();

  await assert.rejects(
    mutex.runExclusive(async () => {
      throw new Error('falhou');
    }),
    /falhou/,
  );

  assert.equal(await mutex.runExclusive(() => 'segue vivo'), 'segue vivo');
  assert.equal(mutex.queued, 0);
});

test('queued volta a zero quando a fila esvazia', async () => {
  const mutex = createMutex();
  const pendentes = [1, 2, 3].map(() => mutex.runExclusive(() => tick(5)));

  assert.equal(mutex.queued, 3);
  await Promise.all(pendentes);
  await tick(1);
  assert.equal(mutex.queued, 0);
});
