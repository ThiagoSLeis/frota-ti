import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useEquipamentos } from './hooks/useEquipamentos.js';
import { useDebounce } from './hooks/useDebounce.js';
import { useTheme } from './hooks/useTheme.js';
import { useToast } from './hooks/useToast.js';
import { BUSCA_DEBOUNCE_MS } from './lib/constants.js';
import { Button } from './components/ui/Button.jsx';
import { ConfirmDialog } from './components/ui/Modal.jsx';
import { ErrorState } from './components/ui/States.jsx';
import { IconPlus } from './components/icons.jsx';
import { AppShell } from './components/layout/AppShell.jsx';
import { Sidebar } from './components/layout/Sidebar.jsx';
import { Topbar } from './components/layout/Topbar.jsx';
import { SummaryCards } from './components/equipamentos/SummaryCards.jsx';
import { SearchField } from './components/equipamentos/SearchField.jsx';
import { StatusFilter } from './components/equipamentos/StatusFilter.jsx';
import { EquipamentosTable } from './components/equipamentos/EquipamentosTable.jsx';
import { EquipamentoFormModal } from './components/equipamentos/EquipamentoFormModal.jsx';

const MODAL_FECHADO = { open: false, modo: 'criar', equipamento: null };
const CONFIRM_FECHADO = { open: false, equipamento: null };
const SEM_ITENS = [];

function normalizar(texto) {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function compararId(a, b) {
  return String(a.id).localeCompare(String(b.id), 'pt-BR', { numeric: true });
}

function mensagemDe(erro, padrao) {
  return erro?.mensagem || erro?.message || padrao;
}

export default function App() {
  const {
    equipamentos,
    resumo,
    carregando,
    atualizando,
    erro,
    recarregar,
    criar,
    atualizar,
    remover,
    salvando,
    removendoId,
  } = useEquipamentos();
  const { theme, toggleTheme } = useTheme();
  const toast = useToast();

  const [busca, setBusca] = useState('');
  const buscaDebounced = useDebounce(busca, BUSCA_DEBOUNCE_MS);
  const [statusFiltro, setStatusFiltro] = useState(null);
  const [modal, setModal] = useState(MODAL_FECHADO);
  const [confirmacao, setConfirmacao] = useState(CONFIRM_FECHADO);
  const [menuAberto, setMenuAberto] = useState(false);
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState(null);

  useEffect(() => {
    if (!carregando && !atualizando && !erro) setUltimaAtualizacao(new Date());
  }, [equipamentos, carregando, atualizando, erro]);

  const lista = equipamentos ?? SEM_ITENS;

  const visiveis = useMemo(() => {
    const termo = normalizar(buscaDebounced.trim());
    return lista
      .filter((eq) => {
        if (statusFiltro && eq.status !== statusFiltro) return false;
        if (!termo) return true;
        return normalizar(eq.responsavel).includes(termo) || normalizar(eq.patrimonio).includes(termo);
      })
      .sort(compararId);
  }, [lista, buscaDebounced, statusFiltro]);

  const abrirNovo = useCallback(() => {
    setMenuAberto(false);
    setModal({ open: true, modo: 'criar', equipamento: null });
  }, []);
  const abrirEdicao = useCallback((equipamento) => setModal({ open: true, modo: 'editar', equipamento }), []);
  const fecharModal = useCallback(() => setModal((atual) => ({ ...atual, open: false })), []);
  const fecharMenu = useCallback(() => setMenuAberto(false), []);

  const limparFiltros = useCallback(() => {
    setBusca('');
    setStatusFiltro(null);
  }, []);

  const salvar = async (payload) => {
    const editando = modal.modo === 'editar' && modal.equipamento;
    try {
      if (editando) {
        await atualizar(modal.equipamento.id, payload);
        toast.sucesso('Equipamento atualizado');
      } else {
        await criar(payload);
        toast.sucesso('Equipamento cadastrado');
      }
      fecharModal();
    } catch (err) {
      if (editando && err?.status === 404) {
        toast.erro('Este equipamento não existe mais na planilha. A lista foi atualizada.');
        fecharModal();
        recarregar();
        return;
      }
      throw err;
    }
  };

  const confirmarRemocao = async () => {
    const alvo = confirmacao.equipamento;
    if (!alvo) return;
    try {
      await remover(alvo.id);
      toast.sucesso(`Equipamento ${alvo.patrimonio || alvo.id} removido`);
    } catch (err) {
      toast.erro(mensagemDe(err, 'Não foi possível remover o equipamento.'));
    } finally {
      setConfirmacao(CONFIRM_FECHADO);
    }
  };

  const toastRef = useRef(toast);
  useEffect(() => {
    toastRef.current = toast;
  });
  const temDados = lista.length > 0;
  useEffect(() => {
    if (erro && temDados) toastRef.current.erro(mensagemDe(erro, 'Não foi possível atualizar os dados.'));
  }, [erro, temDados]);

  const falhaSemDados = Boolean(erro) && !temDados && !carregando;
  const alvoRemocao = confirmacao.equipamento;

  return (
    <AppShell
      sidebarOpen={menuAberto}
      onCloseSidebar={fecharMenu}
      sidebar={<Sidebar resumo={resumo} onNovo={abrirNovo} />}
      topbar={
        <Topbar
          titulo="Inventário de notebooks"
          subtitulo="Controle de quem está com cada equipamento da frota de TI"
          atualizando={atualizando}
          onRecarregar={recarregar}
          theme={theme}
          onToggleTheme={toggleTheme}
          onAbrirMenu={() => setMenuAberto(true)}
          ultimaAtualizacao={ultimaAtualizacao}
        />
      }
    >
      {falhaSemDados ? (
        <ErrorState
          title="Não foi possível carregar o inventário"
          description={mensagemDe(erro, 'Verifique a conexão com o servidor e tente novamente.')}
          onRetry={recarregar}
          retryLabel="Tentar novamente"
        />
      ) : (
        <>
          <SummaryCards
            resumo={resumo}
            carregando={carregando}
            statusFiltro={statusFiltro}
            onSelecionarStatus={setStatusFiltro}
          />

          <div className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="w-full sm:max-w-md">
                <SearchField value={busca} onChange={setBusca} total={lista.length} filtrados={visiveis.length} />
              </div>
              <Button
                onClick={abrirNovo}
                iconLeft={<IconPlus className="size-4" aria-hidden="true" />}
                className="shrink-0"
              >
                Novo equipamento
              </Button>
            </div>
            <StatusFilter value={statusFiltro} onChange={setStatusFiltro} resumo={resumo} />
          </div>

          <EquipamentosTable
            equipamentos={visiveis}
            total={lista.length}
            filtroAtivo={statusFiltro != null}
            carregando={carregando}
            atualizando={atualizando}
            onEditar={abrirEdicao}
            onRemover={(equipamento) => setConfirmacao({ open: true, equipamento })}
            removendoId={removendoId}
            busca={buscaDebounced}
            onLimparBusca={limparFiltros}
            onNovo={abrirNovo}
          />
        </>
      )}

      <EquipamentoFormModal
        open={modal.open}
        modo={modal.modo}
        equipamento={modal.equipamento}
        onFechar={fecharModal}
        onSalvar={salvar}
        salvando={salvando}
      />

      <ConfirmDialog
        open={confirmacao.open}
        title="Remover equipamento?"
        description={
          alvoRemocao
            ? `${alvoRemocao.modelo || 'O equipamento'} (${alvoRemocao.patrimonio || alvoRemocao.id}) será removido da planilha. Esta ação não pode ser desfeita.`
            : ''
        }
        confirmLabel="Remover"
        cancelLabel="Cancelar"
        tone="danger"
        loading={Boolean(alvoRemocao) && removendoId === alvoRemocao.id}
        onConfirm={confirmarRemocao}
        onCancel={() => setConfirmacao(CONFIRM_FECHADO)}
      />
    </AppShell>
  );
}
