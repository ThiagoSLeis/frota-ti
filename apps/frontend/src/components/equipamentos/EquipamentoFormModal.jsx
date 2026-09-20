import { useEffect, useId, useRef, useState } from 'react';
import { STATUS, validateEquipamento } from '@frota/shared';
import { STATUS_OPTIONS } from '../../lib/constants.js';
import { Button } from '../ui/Button.jsx';
import { Input, Select } from '../ui/Field.jsx';
import { Modal } from '../ui/Modal.jsx';
import { IconAlertCircle, IconInfo } from '../icons.jsx';

const VAZIO = { modelo: '', patrimonio: '', responsavel: '', status: STATUS.DISPONIVEL };

function formInicial(equipamento) {
  if (!equipamento) return VAZIO;
  return {
    modelo: equipamento.modelo ?? '',
    patrimonio: equipamento.patrimonio ?? '',
    responsavel: equipamento.responsavel ?? '',
    status: equipamento.status || STATUS.DISPONIVEL,
  };
}

export function EquipamentoFormModal({ open, modo = 'criar', equipamento, onFechar, onSalvar, salvando }) {
  const formId = useId();
  const modeloId = `${formId}-modelo`;
  const modeloRef = useRef(null);
  const [form, setForm] = useState(VAZIO);
  const [erros, setErros] = useState({});
  const [erroGeral, setErroGeral] = useState('');

  const editando = modo === 'editar';

  useEffect(() => {
    if (!open) return;
    setForm(formInicial(editando ? equipamento : null));
    setErros({});
    setErroGeral('');
  }, [open, equipamento, editando]);

  const alterar = (campo) => (event) => {
    const valor = event.target.value;
    setForm((atual) => ({ ...atual, [campo]: valor }));
    setErros((atual) => {
      if (!atual[campo] && !(campo === 'status' && atual.responsavel)) return atual;
      const proximo = { ...atual };
      delete proximo[campo];
      if (campo === 'status') delete proximo.responsavel;
      return proximo;
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (salvando) return;

    const { valid, value, errors } = validateEquipamento(form);
    if (!valid) {
      setErros(errors);
      setErroGeral('');
      return;
    }

    setErroGeral('');
    try {
      await onSalvar(value);
    } catch (erro) {
      const detalhes = erro?.detalhes && typeof erro.detalhes === 'object' ? erro.detalhes : null;
      if (detalhes && Object.keys(detalhes).length > 0) {
        setErros((atual) => ({ ...atual, ...detalhes }));
      } else {
        setErroGeral(erro?.mensagem || erro?.message || 'Não foi possível salvar o equipamento. Tente novamente.');
      }
    }
  };

  const avisoResponsavel = form.status === STATUS.EM_USO && !form.responsavel.trim() && !erros.responsavel;

  const descricao = editando
    ? `Atualize os dados do equipamento${equipamento?.id ? ` ${equipamento.id}` : ''}. As alterações são gravadas na planilha.`
    : 'Preencha os dados do novo notebook. O ID é gerado automaticamente.';

  return (
    <Modal
      open={open}
      onClose={salvando ? () => {} : onFechar}
      title={editando ? 'Editar equipamento' : 'Novo equipamento'}
      description={descricao}
      initialFocusRef={modeloRef}
      footer={
        <>
          <Button variant="secondary" onClick={onFechar} disabled={salvando}>
            Cancelar
          </Button>
          <Button type="submit" form={formId} loading={salvando}>
            {editando ? 'Salvar alterações' : 'Cadastrar equipamento'}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={handleSubmit} noValidate className="space-y-4" aria-busy={salvando || undefined}>
        {erroGeral && (
          <div
            role="alert"
            className="flex gap-3 rounded-lg border border-danger/30 bg-danger-soft px-3 py-2.5 text-sm text-danger-strong"
          >
            <IconAlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <p>{erroGeral}</p>
          </div>
        )}

        <Input
          ref={modeloRef}
          id={modeloId}
          name="modelo"
          label="Modelo"
          required
          placeholder="Dell Latitude 3420"
          autoComplete="off"
          maxLength={80}
          value={form.modelo}
          onChange={alterar('modelo')}
          error={erros.modelo}
        />

        <Input
          id={`${formId}-patrimonio`}
          name="patrimonio"
          label="Patrimônio"
          required
          placeholder="TI-001"
          autoComplete="off"
          spellCheck={false}
          maxLength={20}
          value={form.patrimonio}
          onChange={alterar('patrimonio')}
          onBlur={() => setForm((atual) => ({ ...atual, patrimonio: atual.patrimonio.trim().toUpperCase() }))}
          hint="De 2 a 20 caracteres: letras, números, “-” ou “_”. Convertido para maiúsculas."
          error={erros.patrimonio}
        />

        <Input
          id={`${formId}-responsavel`}
          name="responsavel"
          label="Responsável"
          placeholder="Nome do colaborador"
          autoComplete="off"
          maxLength={80}
          value={form.responsavel}
          onChange={alterar('responsavel')}
          hint="Obrigatório quando o status é “Em Uso”."
          error={erros.responsavel}
        />

        <Select
          id={`${formId}-status`}
          name="status"
          label="Status"
          required
          options={STATUS_OPTIONS}
          value={form.status}
          onChange={alterar('status')}
          error={erros.status}
        />

        {avisoResponsavel && (
          <p className="flex items-start gap-2 rounded-lg bg-info-soft px-3 py-2 text-xs text-info-strong" aria-live="polite">
            <IconInfo className="mt-px size-4 shrink-0" aria-hidden="true" />
            Equipamentos “Em Uso” precisam de um responsável. Informe quem está com o notebook.
          </p>
        )}
      </form>
    </Modal>
  );
}
