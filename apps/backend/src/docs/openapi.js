import { STATUS, STATUS_LIST } from '@frota/shared';

const equipamentoExemplo = {
  id: 'EQ-0001',
  modelo: 'Dell Latitude 3420',
  patrimonio: 'TI-001',
  responsavel: 'João Silva',
  status: STATUS.EM_USO,
};

const erroExemplo = (codigo, mensagem, detalhes) => ({
  erro: { codigo, mensagem, ...(detalhes ? { detalhes } : {}) },
});

const respostaErro = (descricao, exemplo) => ({
  description: descricao,
  content: {
    'application/json': {
      schema: { $ref: '#/components/schemas/Erro' },
      example: exemplo,
    },
  },
});

const idParam = {
  name: 'id',
  in: 'path',
  required: true,
  description: 'ID do equipamento gerado pela API',
  schema: { type: 'string', example: 'EQ-0001' },
};

const erros = {
  badRequest: respostaErro(
    'Requisição malformada (JSON inválido ou corpo vazio)',
    erroExemplo('BAD_REQUEST', 'Corpo da requisição não é um JSON válido'),
  ),
  notFound: respostaErro(
    'Equipamento não encontrado',
    erroExemplo('NOT_FOUND', 'Equipamento EQ-9999 não encontrado'),
  ),
  conflict: respostaErro(
    'Patrimônio já cadastrado em outro equipamento',
    erroExemplo('CONFLICT', 'O patrimônio TI-001 já está cadastrado (EQ-0001)', {
      patrimonio: 'Patrimônio já cadastrado',
    }),
  ),
  validation: respostaErro(
    'Dados inválidos, com a mensagem de cada campo em `detalhes`',
    erroExemplo('VALIDATION_ERROR', 'Dados inválidos', {
      modelo: 'Modelo é obrigatório',
      responsavel: 'Informe o responsável para equipamentos "Em Uso"',
    }),
  ),
  internal: respostaErro(
    'Falha inesperada ou erro de integração com o Google Sheets',
    erroExemplo('INTERNAL_ERROR', 'Acesso negado à planilha. Compartilhe a planilha com o e-mail da service account como Editor.'),
  ),
  unavailable: respostaErro(
    'Variáveis de ambiente ausentes ou Google Sheets indisponível / cota excedida',
    erroExemplo(
      'CONFIG_INCOMPLETE',
      'Variáveis de ambiente ausentes: GOOGLE_SHEET_ID. Copie apps/backend/.env.example para apps/backend/.env e preencha com suas credenciais.',
    ),
  ),
};

export function buildOpenApiSpec({ serverUrl = '/' } = {}) {
  return {
    openapi: '3.0.3',
    info: {
      title: 'Gestão de Frota de TI — API',
      version: '1.0.0',
      description: [
        'API REST para o inventário de notebooks da empresa, usando uma planilha do **Google Sheets** como banco de dados.',
        '',
        '- Cada linha da aba **Inventário** é um equipamento; as colunas são `ID | Modelo | Patrimônio | Responsável | Status`.',
        '- O JSON usa chaves sem acento (`patrimonio`, `responsavel`) mapeadas para as colunas acentuadas da planilha.',
        '- Leitura e escrita são feitas pelo **nome** da coluna: reordenar colunas na planilha não corrompe os dados.',
        '- Toda escrita (POST, PUT, PATCH, DELETE) passa por uma **fila exclusiva (mutex)**: requisições simultâneas são gravadas uma por vez, sem sobrescrever dados, sem IDs duplicados e sem apagar a linha errada.',
        '',
        'Todos os erros seguem o formato `{ "erro": { "codigo", "mensagem", "detalhes?" } }`.',
      ].join('\n'),
    },
    servers: [{ url: serverUrl, description: 'Servidor atual' }],
    tags: [
      { name: 'Equipamentos', description: 'CRUD do inventário de notebooks' },
      { name: 'Sistema', description: 'Saúde da API e diagnóstico da integração com o Google Sheets' },
    ],
    paths: {
      '/api/equipamentos': {
        get: {
          tags: ['Equipamentos'],
          summary: 'Lista todos os equipamentos',
          description: 'Retorna todas as linhas da planilha. O parâmetro `busca` filtra por Responsável ou Patrimônio, ignorando acentos e maiúsculas.',
          parameters: [
            {
              name: 'busca',
              in: 'query',
              required: false,
              description: 'Trecho do nome do responsável ou do patrimônio',
              schema: { type: 'string', example: 'joão' },
            },
          ],
          responses: {
            200: {
              description: 'Lista de equipamentos',
              content: {
                'application/json': {
                  schema: { type: 'array', items: { $ref: '#/components/schemas/Equipamento' } },
                  example: [
                    equipamentoExemplo,
                    { id: 'EQ-0002', modelo: 'Lenovo ThinkPad T14', patrimonio: 'TI-002', responsavel: '', status: STATUS.DISPONIVEL },
                  ],
                },
              },
            },
            500: erros.internal,
            503: erros.unavailable,
          },
        },
        post: {
          tags: ['Equipamentos'],
          summary: 'Cadastra um equipamento',
          description: 'Adiciona uma nova linha na planilha. O `id` é gerado automaticamente no formato `EQ-0001`, sequencial a partir do maior ID existente.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/EquipamentoEntrada' },
                example: { modelo: 'Dell Latitude 3420', patrimonio: 'TI-001', responsavel: 'João Silva', status: STATUS.EM_USO },
              },
            },
          },
          responses: {
            201: {
              description: 'Equipamento criado',
              headers: {
                Location: { description: 'URL do recurso criado', schema: { type: 'string', example: '/api/equipamentos/EQ-0001' } },
              },
              content: { 'application/json': { schema: { $ref: '#/components/schemas/Equipamento' }, example: equipamentoExemplo } },
            },
            400: erros.badRequest,
            409: erros.conflict,
            422: erros.validation,
            500: erros.internal,
            503: erros.unavailable,
          },
        },
      },
      '/api/equipamentos/resumo': {
        get: {
          tags: ['Equipamentos'],
          summary: 'Contagem total e por status',
          description: '`outros` conta linhas cujo status foi digitado na planilha fora dos valores aceitos.',
          responses: {
            200: {
              description: 'Resumo do inventário',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Resumo' },
                  example: {
                    total: 5,
                    porStatus: { [STATUS.DISPONIVEL]: 1, [STATUS.EM_USO]: 3, [STATUS.EM_MANUTENCAO]: 1 },
                    outros: 0,
                  },
                },
              },
            },
            500: erros.internal,
            503: erros.unavailable,
          },
        },
      },
      '/api/equipamentos/{id}': {
        parameters: [idParam],
        get: {
          tags: ['Equipamentos'],
          summary: 'Busca um equipamento pelo ID',
          responses: {
            200: { description: 'Equipamento encontrado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Equipamento' }, example: equipamentoExemplo } } },
            404: erros.notFound,
            500: erros.internal,
            503: erros.unavailable,
          },
        },
        put: {
          tags: ['Equipamentos'],
          summary: 'Atualiza um equipamento',
          description: 'Aceita atualização parcial (ao menos um campo conhecido, senão 400): os campos enviados são mesclados com a linha atual e o registro completo é validado novamente antes de gravar. Só as colunas do equipamento são alteradas.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/EquipamentoAtualizacao' },
                example: { status: STATUS.EM_MANUTENCAO },
              },
            },
          },
          responses: {
            200: {
              description: 'Equipamento atualizado',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/Equipamento' }, example: { ...equipamentoExemplo, status: STATUS.EM_MANUTENCAO } } },
            },
            400: erros.badRequest,
            404: erros.notFound,
            409: erros.conflict,
            422: erros.validation,
            500: erros.internal,
            503: erros.unavailable,
          },
        },
        patch: {
          tags: ['Equipamentos'],
          summary: 'Atualiza um equipamento (alias de PUT)',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/EquipamentoAtualizacao' } } },
          },
          responses: {
            200: { description: 'Equipamento atualizado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Equipamento' } } } },
            400: erros.badRequest,
            404: erros.notFound,
            409: erros.conflict,
            422: erros.validation,
          },
        },
        delete: {
          tags: ['Equipamentos'],
          summary: 'Remove um equipamento',
          description: 'Apaga a linha da planilha e devolve o equipamento removido.',
          responses: {
            200: {
              description: 'Equipamento removido',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      removido: { type: 'boolean', example: true },
                      equipamento: { $ref: '#/components/schemas/Equipamento' },
                    },
                  },
                  example: { removido: true, equipamento: equipamentoExemplo },
                },
              },
            },
            404: erros.notFound,
            500: erros.internal,
            503: erros.unavailable,
          },
        },
      },
      '/api/health': {
        get: {
          tags: ['Sistema'],
          summary: 'Saúde da API e da conexão com a planilha',
          description: 'Primeira rota a chamar quando algo não funciona: informa variáveis ausentes, aba encontrada e colunas lidas.',
          responses: {
            200: {
              description: 'API e planilha conectadas',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Saude' },
                  example: {
                    status: 'ok',
                    ambiente: 'development',
                    uptimeSegundos: 42,
                    escritasNaFila: 0,
                    sheets: { conectado: true, aba: 'Inventário', equipamentos: 5, colunas: ['ID', 'Modelo', 'Patrimônio', 'Responsável', 'Status'] },
                  },
                },
              },
            },
            503: {
              description: 'Configuração incompleta ou planilha inacessível',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Saude' },
                  example: {
                    status: 'configuracao_incompleta',
                    ambiente: 'development',
                    uptimeSegundos: 3,
                    escritasNaFila: 0,
                    sheets: { conectado: false, variaveisAusentes: ['GOOGLE_SHEET_ID'] },
                  },
                },
              },
            },
          },
        },
      },
    },
    components: {
      schemas: {
        Status: {
          type: 'string',
          enum: [...STATUS_LIST],
          description: 'Valores aceitos na coluna Status. Variações de digitação ("em uso", "Em Manutencao") são normalizadas.',
        },
        Equipamento: {
          type: 'object',
          required: ['id', 'modelo', 'patrimonio', 'responsavel', 'status'],
          properties: {
            id: { type: 'string', example: 'EQ-0001', description: 'Gerado automaticamente' },
            modelo: { type: 'string', example: 'Dell Latitude 3420' },
            patrimonio: { type: 'string', example: 'TI-001' },
            responsavel: { type: 'string', example: 'João Silva', description: 'Vazio quando não há responsável' },
            status: { $ref: '#/components/schemas/Status' },
          },
        },
        EquipamentoEntrada: {
          type: 'object',
          required: ['modelo', 'patrimonio', 'status'],
          properties: {
            modelo: { type: 'string', minLength: 2, maxLength: 80, example: 'Dell Latitude 3420' },
            patrimonio: {
              type: 'string',
              pattern: '^[A-Za-z0-9][A-Za-z0-9_-]{1,19}$',
              example: 'TI-001',
              description: 'Único. 2 a 20 caracteres (letras, números, "-" e "_"); gravado em maiúsculas.',
            },
            responsavel: {
              type: 'string',
              maxLength: 80,
              example: 'João Silva',
              description: 'Obrigatório quando o status é "Em Uso".',
            },
            status: { $ref: '#/components/schemas/Status' },
          },
        },
        EquipamentoAtualizacao: {
          type: 'object',
          minProperties: 1,
          description: 'Qualquer subconjunto dos campos de EquipamentoEntrada.',
          properties: {
            modelo: { type: 'string', minLength: 2, maxLength: 80 },
            patrimonio: { type: 'string', pattern: '^[A-Za-z0-9][A-Za-z0-9_-]{1,19}$' },
            responsavel: { type: 'string', maxLength: 80 },
            status: { $ref: '#/components/schemas/Status' },
          },
        },
        Resumo: {
          type: 'object',
          properties: {
            total: { type: 'integer', example: 5 },
            porStatus: {
              type: 'object',
              properties: Object.fromEntries(STATUS_LIST.map((status) => [status, { type: 'integer' }])),
            },
            outros: { type: 'integer', example: 0 },
          },
        },
        Saude: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['ok', 'configuracao_incompleta', 'sheets_indisponivel'] },
            ambiente: { type: 'string' },
            uptimeSegundos: { type: 'integer' },
            escritasNaFila: { type: 'integer', description: 'Escritas aguardando ou em execução no mutex' },
            sheets: {
              type: 'object',
              properties: {
                conectado: { type: 'boolean' },
                aba: { type: 'string' },
                equipamentos: { type: 'integer' },
                colunas: { type: 'array', items: { type: 'string' } },
                variaveisAusentes: { type: 'array', items: { type: 'string' } },
                erro: { type: 'string' },
              },
            },
          },
        },
        Erro: {
          type: 'object',
          required: ['erro'],
          properties: {
            erro: {
              type: 'object',
              required: ['codigo', 'mensagem'],
              properties: {
                codigo: {
                  type: 'string',
                  enum: ['BAD_REQUEST', 'NOT_FOUND', 'CONFLICT', 'VALIDATION_ERROR', 'INTERNAL_ERROR', 'CONFIG_INCOMPLETE', 'SHEETS_UNAVAILABLE'],
                },
                mensagem: { type: 'string' },
                detalhes: {
                  type: 'object',
                  additionalProperties: { type: 'string' },
                  description: 'Mensagem de erro por campo (validação e conflito)',
                },
              },
            },
          },
        },
      },
    },
  };
}
