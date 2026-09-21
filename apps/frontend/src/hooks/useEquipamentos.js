import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { STATUS_LIST } from '@frota/shared';

import {
  atualizarEquipamento,
  criarEquipamento,
  listarEquipamentos,
  removerEquipamento,
} from '../api/equipamentos.js';

function isAbortError(error) {
  return error?.name === 'AbortError';
}

function calcularResumo(equipamentos) {
  const porStatus = Object.fromEntries(STATUS_LIST.map((status) => [status, 0]));
  let outros = 0;
  for (const { status } of equipamentos) {
    if (Object.prototype.hasOwnProperty.call(porStatus, status)) porStatus[status] += 1;
    else outros += 1;
  }
  return { total: equipamentos.length, porStatus, outros };
}

export function useEquipamentos() {
  const [equipamentos, setEquipamentos] = useState([]);
  const [jaCarregou, setJaCarregou] = useState(false);
  const [buscando, setBuscando] = useState(true);
  const [erro, setErro] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [removendoId, setRemovendoId] = useState(null);

  const controllerRef = useRef(null);
  const montadoRef = useRef(true);

  const recarregar = useCallback(async () => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    setBuscando(true);
    try {
      const lista = await listarEquipamentos({ signal: controller.signal });
      if (controller.signal.aborted) return false;
      setEquipamentos(lista);
      setErro(null);
      setJaCarregou(true);
      return true;
    } catch (error) {
      if (isAbortError(error) || controller.signal.aborted) return false;
      setErro(error);
      return false;
    } finally {
      if (controllerRef.current === controller) {
        controllerRef.current = null;
        if (montadoRef.current) setBuscando(false);
      }
    }
  }, []);

  useEffect(() => {
    montadoRef.current = true;
    recarregar();
    return () => {
      montadoRef.current = false;
      controllerRef.current?.abort();
    };
  }, [recarregar]);

  const criar = useCallback(async (payload) => {
    setSalvando(true);
    try {
      const criado = await criarEquipamento(payload);
      if (criado) setEquipamentos((lista) => [...lista, criado]);
      return criado;
    } finally {
      if (montadoRef.current) setSalvando(false);
    }
  }, []);

  const atualizar = useCallback(async (id, payload) => {
    setSalvando(true);
    try {
      const atualizado = await atualizarEquipamento(id, payload);
      if (atualizado) {
        setEquipamentos((lista) =>
          lista.map((item) => (item.id === id ? { ...item, ...atualizado } : item)),
        );
      }
      return atualizado;
    } finally {
      if (montadoRef.current) setSalvando(false);
    }
  }, []);

  const remover = useCallback(async (id) => {
    setRemovendoId(id);
    try {
      const removido = await removerEquipamento(id);
      setEquipamentos((lista) => lista.filter((item) => item.id !== id));
      return removido;
    } catch (error) {
      // 404 pode ser item ja removido ou falha de roteamento: a planilha decide.
      if (error?.status === 404) recarregar();
      throw error;
    } finally {
      if (montadoRef.current) setRemovendoId(null);
    }
  }, [recarregar]);

  const resumo = useMemo(() => calcularResumo(equipamentos), [equipamentos]);

  return {
    equipamentos,
    resumo,
    carregando: buscando && !jaCarregou,
    atualizando: buscando && jaCarregou,
    erro,
    recarregar,
    criar,
    atualizar,
    remover,
    salvando,
    removendoId,
  };
}
