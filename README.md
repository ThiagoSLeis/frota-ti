# Gestão de Frota de TI

Sistema para controlar os notebooks da empresa: quem está com cada equipamento, o que está disponível e o que está em manutenção. O frontend é um dashboard em **React**. A API é **Node.js/Express** e usa uma planilha do **Google Sheets** como banco de dados. Assim, a equipe não técnica pode continuar abrindo a planilha, enquanto o sistema garante validação, IDs únicos e escritas sem conflito.

> **Teste Prático — React + Node.js + Google Sheets.** Para rodar, use **as suas próprias** credenciais do Google. Se você nunca configurou uma service account, o passo a passo abaixo leva uns 10 minutos.

**Atalhos:** [rodar em 5 passos](#rodando-localmente) · [configurar o Google](#configurando-o-google-sheets) · [Swagger UI](http://localhost:3333/api/docs) (com a API rodando) · [problemas comuns](#solução-de-problemas)

---

## Sumário

1. [Visão geral](#visão-geral)
2. [Stack](#stack)
3. [Estrutura do monorepo](#estrutura-do-monorepo)
4. [Pré-requisitos](#pré-requisitos)
5. [Configurando o Google Sheets](#configurando-o-google-sheets)
6. [Variáveis de ambiente](#variáveis-de-ambiente)
7. [Rodando localmente](#rodando-localmente)
8. [Scripts](#scripts)
9. [API](#api)
10. [Regras de negócio](#regras-de-negócio)
11. [Arquitetura](#arquitetura)
12. [Bônus: controle de concorrência](#bônus-controle-de-concorrência)
13. [Frontend](#frontend)
14. [Decisões técnicas](#decisões-técnicas)
15. [Qualidade: testes, lint e CI](#qualidade-testes-lint-e-ci)
16. [Solução de problemas](#solução-de-problemas)
17. [Segurança](#segurança)
18. [Notas para deploy](#notas-para-deploy)
19. [Próximos passos](#próximos-passos)

---

## Visão geral

| Requisito do teste | Onde está |
| --- | --- |
| Google Sheets como banco (ID, Modelo, Patrimônio, Responsável, Status) | `apps/backend/src/lib/sheetsClient.js`, `apps/backend/src/repositories/` |
| API REST com CRUD completo | `apps/backend/src/routes/` → `controllers/` → `services/` (Swagger em `/api/docs`) |
| Cards de resumo (total + por status) | `apps/frontend/src/components/equipamentos/SummaryCards.jsx` |
| Tabela de equipamentos | `apps/frontend/src/components/equipamentos/EquipamentosTable.jsx` |
| Formulário de cadastro/edição (modal) | `apps/frontend/src/components/equipamentos/EquipamentoFormModal.jsx` |
| Busca por Responsável ou Patrimônio | `SearchField.jsx` + `StatusFilter.jsx` + `hooks/useDebounce.js` |
| **Bônus:** escritas simultâneas sem conflito | `apps/backend/src/lib/mutex.js` + `apps/backend/src/services/equipamentos.service.js` |

Além do que o teste pede, o projeto traz:

- validação idêntica no front e no back, com erro exibido por campo;
- patrimônio único;
- IDs legíveis (`EQ-0001`);
- health check que diagnostica a configuração;
- tema claro e escuro, layout responsivo e acessibilidade;
- testes automatizados e CI.

## Stack

| Camada | Tecnologias |
| --- | --- |
| Frontend | React 18, Vite 6, Tailwind CSS v4 (tokens em CSS, sem biblioteca de UI) |
| Backend | Node.js ≥ 20.11, Express 4, `google-spreadsheet` v4, `google-auth-library` (JWT de service account), `swagger-ui-express`, helmet, cors, compression, morgan |
| Compartilhado | `@frota/shared`: status, nomes das colunas e validação, usados **pelos dois lados** |
| Banco de dados | Google Sheets (aba `Inventário`) |
| Qualidade | `node:test` (sem dependências extras), ESLint 9 (flat config), GitHub Actions |

## Estrutura do monorepo

```text
.
├── .github/workflows/ci.yml     # lint + testes + build (Node 20 e 22)
├── apps/
│   ├── backend/                 # API REST (Express)
│   │   ├── scripts/init-sheet.js    # npm run sheets:init
│   │   ├── src/
│   │   │   ├── config/env.js        # leitura/validação do .env
│   │   │   ├── docs/openapi.js      # especificação OpenAPI 3 (Swagger UI em /api/docs)
│   │   │   ├── lib/                 # sheetsClient (Google), mutex (fila de escrita), logger
│   │   │   ├── domain/              # linha da planilha <-> objeto da API
│   │   │   ├── repositories/        # acesso à aba "Inventário"
│   │   │   ├── services/            # regras de negócio + controle de concorrência
│   │   │   ├── controllers/         # HTTP fino (status code, Location)
│   │   │   ├── routes/              # /api, /api/health, /api/equipamentos
│   │   │   ├── middlewares/         # 404 e formato único de erro
│   │   │   └── utils/               # ApiError, asyncHandler
│   │   └── .env.example
│   └── frontend/                # Dashboard (React + Vite + Tailwind v4)
│       ├── src/
│       │   ├── api/                 # http.js (ApiRequestError) e equipamentos.js
│       │   ├── hooks/               # useEquipamentos, useDebounce, useTheme, useToast
│       │   ├── components/
│       │   │   ├── ui/              # Button, Field, Modal/ConfirmDialog, Badge, Toast, Skeleton, States, Spinner
│       │   │   ├── layout/          # AppShell, Sidebar, Topbar
│       │   │   └── equipamentos/    # SummaryCards, SearchField, StatusFilter, EquipamentosTable, EquipamentoFormModal
│       │   ├── lib/                 # cn, constants, format
│       │   └── styles/index.css     # design tokens (claro/escuro)
│       ├── vite.config.js           # proxy /api -> http://localhost:3333
│       └── .env.example
├── packages/
│   └── shared/                  # @frota/shared: status, colunas, validação (+ testes)
├── eslint.config.js
└── package.json                 # npm workspaces + scripts da raiz
```

## Pré-requisitos

- **Node.js 20.11+** (há um `.nvmrc`, então basta `nvm use`) e **npm 7+** (o Node 20 já traz o npm 10).
- Uma **conta Google**, para criar um projeto no Google Cloud e uma planilha.
- Portas livres: **3333** (API) e **5173** (frontend).

---

## Configurando o Google Sheets

A API se autentica como uma **service account**, uma "conta robô" do Google, usando um JWT assinado pela chave privada dela. Não há login interativo. A service account só enxerga as planilhas que forem **compartilhadas** com o e-mail dela.

```mermaid
flowchart LR
    A["1 · Projeto no<br/>Google Cloud"] --> B["2 · Ativar<br/>Sheets API"]
    B --> C["3 · Service<br/>Account"]
    C --> D["4 · Chave<br/>JSON"]
    D --> E["5 · Planilha<br/>+ ID"]
    E --> F["6 · COMPARTILHAR<br/>como Editor"]
    F --> G["7 · .env"]
    G --> H["8 · npm run<br/>sheets:init"]
```

> Os nomes de menus do Google Cloud Console mudam de tempos em tempos. Se algum rótulo estiver um pouco diferente, procure o equivalente mais próximo. O fluxo é o mesmo.

### 1. Criar um projeto

Acesse <https://console.cloud.google.com/>. No seletor de projetos (barra superior), clique em **Novo projeto**, dê um nome (ex.: `frota-ti`) e depois selecione o projeto criado.

### 2. Ativar a Google Sheets API

Vá em **APIs e serviços → Biblioteca**, pesquise **Google Sheets API** e clique em **Ativar**. A Google Drive API **não** é necessária, porque o único escopo usado é `https://www.googleapis.com/auth/spreadsheets`.

### 3. Criar a Service Account

1. Vá em **IAM e administrador → Contas de serviço → Criar conta de serviço**.
2. Dê um nome (ex.: `frota-ti-bot`) e clique em **Criar e continuar**.
3. As etapas de papéis do projeto são **opcionais** e podem ser puladas com **Concluir**. O acesso vem do compartilhamento da planilha, não de papéis.

### 4. Gerar a chave JSON

Clique na conta criada, vá em **Chaves → Adicionar chave → Criar nova chave → JSON** e o arquivo será baixado. **Guarde-o fora do repositório.** Você só vai usar dois campos dele:

```json
{
  "type": "service_account",
  "project_id": "seu-projeto",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASC...FAKE...\n-----END PRIVATE KEY-----\n",
  "client_email": "frota-ti-bot@seu-projeto.iam.gserviceaccount.com"
}
```

### 5. Criar a planilha e copiar o ID

Crie uma planilha em branco em <https://sheets.google.com>. O ID é o trecho da URL entre `/d/` e `/edit`:

```text
https://docs.google.com/spreadsheets/d/1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789_exemplo/edit#gid=0
                                      └──────────────── GOOGLE_SHEET_ID ────────────────┘
```

### 6. Compartilhar a planilha com a service account (importante)

> **Esse é o erro mais comum.** Sem esse passo, o Google responde 403 e a API mostra:
> `Acesso negado à planilha. Compartilhe a planilha com o e-mail da service account (...) como Editor.`

Na planilha, clique em **Compartilhar**, cole o `client_email` (`frota-ti-bot@seu-projeto.iam.gserviceaccount.com`) e escolha a permissão **Editor** (**Leitor** não basta, porque a API grava). Desmarque "Notificar pessoas" e confirme.

### 7. Preencher o `.env` do backend

```bash
cp apps/backend/.env.example apps/backend/.env
```

```dotenv
PORT=3333
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173

GOOGLE_SHEET_ID=1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789_exemplo
GOOGLE_SERVICE_ACCOUNT_EMAIL=frota-ti-bot@seu-projeto.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASC...FAKE...\n-----END PRIVATE KEY-----\n"
SHEET_TAB_NAME=Inventário
SEED_SAMPLE_DATA=true
```

**Regras de ouro para a `GOOGLE_PRIVATE_KEY`:**

- copie o `private_key` do JSON **como está**, em **uma linha**;
- mantenha **entre aspas duplas**;
- mantenha os **`\n` literais** (não troque por quebras de linha reais);
- inclua as linhas `BEGIN` e `END`.

O backend converte os `\n` em quebras de linha reais (`src/config/env.js`).

### 8. Criar a aba e o cabeçalho

```bash
npm run sheets:init
```

O script `apps/backend/scripts/init-sheet.js`:

- **cria a aba** `Inventário` (ou o nome definido em `SHEET_TAB_NAME`) com o cabeçalho `ID | Modelo | Patrimônio | Responsável | Status`;
- **aba já existente:** se a linha 1 estiver vazia, grava o cabeçalho. Se ela tiver **outro** cabeçalho, para com erro e não sobrescreve nada;
- **formata a linha 1** em negrito com fundo azul claro e a **congela**;
- **seed opcional:** com `SEED_SAMPLE_DATA=true`, insere **5 notebooks de exemplo** (`EQ-0001` a `EQ-0005`), mas **só se a aba não tiver dados**;
- é **idempotente**: rodar de novo não duplica nada.

<details>
<summary><strong>Alternativa: criar a aba manualmente</strong></summary>

1. Renomeie (ou crie) a aba para exatamente **`Inventário`**, com acento, ou ajuste `SHEET_TAB_NAME`.
2. Na **linha 1**, coloque um cabeçalho por célula:

   | A | B | C | D | E |
   | --- | --- | --- | --- | --- |
   | `ID` | `Modelo` | `Patrimônio` | `Responsável` | `Status` |

3. Os nomes precisam ser **exatos**, com acentos. A **ordem é livre**, porque a API lê pelo nome da coluna, e colunas extras são ignoradas.
4. Dados digitados à mão devem usar IDs `EQ-0001` e os status `Disponível`, `Em Uso` ou `Em Manutenção`. Variações como `em uso` são normalizadas.

</details>

---

## Variáveis de ambiente

### Backend (`apps/backend/.env`)

| Variável | Obrigatória | Padrão | Descrição |
| --- | --- | --- | --- |
| `GOOGLE_SHEET_ID` | **sim** | — | ID da planilha (trecho da URL entre `/d/` e `/edit`) |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | **sim** | — | Campo `client_email` do JSON |
| `GOOGLE_PRIVATE_KEY` | **sim** | — | Campo `private_key` do JSON, entre aspas e com `\n` literais |
| `PORT` | não | `3333` | Porta da API |
| `NODE_ENV` | não | `development` | `development`, `production` ou `test`. Em `production`, erros 5xx não expõem `stack` |
| `CORS_ORIGIN` | não | `*` se vazia | Origens liberadas, separadas por vírgula (o `.env.example` usa `http://localhost:5173`) |
| `SHEET_TAB_NAME` | não | `Inventário` | Nome da aba usada como tabela |
| `SEED_SAMPLE_DATA` | não | desligado | `true`/`1`/`yes` faz o `sheets:init` inserir 5 exemplos numa aba vazia |

### Frontend (`apps/frontend/.env`, opcional)

| Variável | Padrão | Descrição |
| --- | --- | --- |
| `VITE_API_URL` | vazio | Origem da API **sem** `/api` no final (ex.: `https://api.exemplo.com`). Em desenvolvimento fica vazia, porque o proxy do Vite encaminha `/api` |
| `VITE_PORT` | `5173` | Porta do dev server |
| `VITE_PROXY_TARGET` | `http://localhost:3333` | Destino do proxy `/api` em desenvolvimento |

---

## Rodando localmente

```bash
# 1. Clonar e instalar (na RAIZ: instala backend, frontend e shared de uma vez)
git clone https://github.com/Carlosvpm/gestao-frota-ti.git
cd gestao-frota-ti
npm install

# 2. Credenciais: siga "Configurando o Google Sheets" acima e depois:
cp apps/backend/.env.example apps/backend/.env      # preencha as 3 variáveis GOOGLE_*
cp apps/frontend/.env.example apps/frontend/.env    # opcional

# 3. Preparar a planilha (aba + cabeçalho + 5 exemplos)
npm run sheets:init

# 4. Subir backend (3333) e frontend (5173) juntos
npm run dev
```

**5. Conferir:**

| O quê | URL |
| --- | --- |
| Aplicação | <http://localhost:5173> |
| Health check (diagnóstico da integração) | <http://localhost:3333/api/health> |
| Documentação interativa da API (Swagger UI) | <http://localhost:3333/api/docs> |

Resposta esperada do health check:

```json
{
  "status": "ok",
  "ambiente": "development",
  "uptimeSegundos": 12,
  "escritasNaFila": 0,
  "sheets": {
    "conectado": true,
    "aba": "Inventário",
    "equipamentos": 5,
    "colunas": ["ID", "Modelo", "Patrimônio", "Responsável", "Status"]
  }
}
```

> `sheets.equipamentos` é a quantidade de linhas de dados da aba. Pode rodar o `sheets:init` com a API no ar: se a aba não existir, a API recarrega os dados da planilha uma vez antes de falhar, então não é preciso reiniciar.

## Scripts

Todos rodam na **raiz** do repositório.

| Script | O que faz |
| --- | --- |
| `npm run dev` | Backend (`node --watch`) e frontend (Vite) em paralelo, via `concurrently` |
| `npm run dev:backend` / `npm run dev:frontend` | Sobe só um dos lados |
| `npm run sheets:init` | Cria ou valida a aba `Inventário`, formata o cabeçalho e aplica o seed opcional |
| `npm test` | Testes `node:test` de `packages/shared` e `apps/backend`. **Não acessa o Google** |
| `npm run lint` / `npm run lint:fix` | ESLint 9 no monorepo inteiro |
| `npm run build` | Build de produção do frontend (`apps/frontend/dist`) |
| `npm run preview` | Serve o build em <http://localhost:4173> |
| `npm start` | API sem watch (modo produção) |

---

## API

> **Referência completa e interativa:** Swagger UI em **<http://localhost:3333/api/docs>**, com esquemas, exemplos e botão "Try it out". A especificação OpenAPI 3 em JSON fica em **`/api/docs.json`** e pode ser importada no Postman ou no Insomnia.

Base: `http://localhost:3333/api`. JSON, com corpo de até 100 kB.

| Método | Rota | Descrição | Sucesso |
| --- | --- | --- | --- |
| GET | `/api/health` | Diagnóstico do `.env` e da conexão com a planilha | 200, ou 503 com o motivo |
| GET | `/api` | Índice: rotas (incluindo PATCH), status aceitos e link para `/api/docs` | 200 |
| GET | `/api/equipamentos?busca=` | Lista. `busca` (alias `q`) filtra por Responsável ou Patrimônio, sem diferenciar acento nem maiúsculas | 200 |
| GET | `/api/equipamentos/resumo` | `{ total, porStatus, outros }` | 200 |
| GET | `/api/equipamentos/:id` | Detalhe (o ID não diferencia maiúsculas) | 200 |
| POST | `/api/equipamentos` | Cria. O ID é gerado pelo backend | **201** + header `Location` |
| PUT / PATCH | `/api/equipamentos/:id` | Atualização **parcial**, mesclada com o registro atual e revalidada por inteiro | 200 |
| DELETE | `/api/equipamentos/:id` | Remove a linha | 200 `{ removido: true, equipamento }` |

**Recurso.** As chaves são ASCII e o backend as mapeia para os cabeçalhos acentuados da planilha:

```json
{ "id": "EQ-0001", "modelo": "Dell Latitude 3420", "patrimonio": "TI-001", "responsavel": "João Silva", "status": "Em Uso" }
```

**Exemplo rápido:**

```bash
curl -s -X POST http://localhost:3333/api/equipamentos \
  -H "Content-Type: application/json" \
  -d '{"modelo":"Lenovo ThinkPad E14","patrimonio":"ti-006","responsavel":"Ana Lima","status":"em uso"}'
# -> 201 { "id": "EQ-0006", ..., "patrimonio": "TI-006", "status": "Em Uso" }
```

### Formato e códigos de erro

Todas as rotas de dados respondem erros neste formato:

```json
{
  "erro": {
    "codigo": "VALIDATION_ERROR",
    "mensagem": "Dados inválidos",
    "detalhes": { "responsavel": "Informe o responsável para equipamentos \"Em Uso\"" }
  }
}
```

- `detalhes` é um mapa `campo -> mensagem`, presente em 422 e 409. O formulário usa esse mapa para marcar cada campo.
- Fora de produção, erros 5xx também trazem `erro.stack`.

| `codigo` | HTTP | Quando |
| --- | --- | --- |
| `BAD_REQUEST` | 400 | JSON malformado, corpo acima de 100 kB, PUT/PATCH sem nenhum campo conhecido (ex.: `{}` ou `{"foo":1}`) |
| `NOT_FOUND` | 404 | ID inexistente ou rota desconhecida |
| `CONFLICT` | 409 | Patrimônio já cadastrado em outro equipamento |
| `VALIDATION_ERROR` | 422 | Alguma [regra de negócio](#regras-de-negócio) foi violada |
| `INTERNAL_ERROR` | 500 | Planilha não compartilhada ou inexistente, credencial inválida, aba ou colunas ausentes, erro inesperado. A `mensagem` diz o que corrigir |
| `CONFIG_INCOMPLETE` | 503 | Faltam variáveis `GOOGLE_*` no `.env` |
| `SHEETS_UNAVAILABLE` | 503 | O Google respondeu 429 (cota excedida) ou 503 (instabilidade) |

O `/api/health` usa um formato próprio, pensado para diagnóstico: `status` = `ok`, `configuracao_incompleta` ou `sheets_indisponivel`, com detalhes em `sheets.variaveisAusentes` ou `sheets.erro`.

---

## Regras de negócio

As regras ficam em `packages/shared/src/validation.js` e são usadas pelo frontend (antes de enviar) e pelo backend (antes de gravar).

| Campo | Regra | Normalização |
| --- | --- | --- |
| `id` | Gerado pelo backend: `EQ-0001`, `EQ-0002`... Somente leitura | — |
| `modelo` | Obrigatório, de 2 a 80 caracteres | Espaços repetidos viram um só e as pontas são removidas |
| `patrimonio` | Obrigatório, de 2 a 20 caracteres: letras, números, `-` e `_`, começando por letra ou número. **Único** (409 se repetido) | MAIÚSCULAS (`ti-001` vira `TI-001`) |
| `responsavel` | Opcional, até 80 caracteres. **Obrigatório quando o status é `Em Uso`** | Espaços colapsados |
| `status` | Um de `Disponível`, `Em Uso` ou `Em Manutenção` | Aceita variações (`em uso`, `EM MANUTENCAO`) e grava o valor canônico |

- **PUT parcial:** o corpo é mesclado com o registro atual e o resultado é validado **por inteiro**. Mudar só o status para `Em Uso` num equipamento sem responsável retorna 422.
- **Chaves desconhecidas** no corpo, e um `id` enviado pelo cliente, são ignorados.
- **Status digitado errado na planilha** (ex.: `Perdido`) é devolvido como está e contado em `resumo.outros`.

---

## Arquitetura

```mermaid
flowchart LR
    B["Navegador"] --> F["React (Vite)<br/>useEquipamentos · api/http.js"]
    F -- "fetch /api/..." --> P{"Dev: proxy do Vite<br/>Prod: VITE_API_URL"}
    P --> R["Express · routes/"]
    R --> C["controllers/<br/>HTTP fino"]
    C --> S["services/<br/>validação @frota/shared<br/>+ mutex de escrita"]
    S --> RP["repositories/<br/>linha ⇄ objeto"]
    RP --> GS["google-spreadsheet v4<br/>JWT service account"]
    GS --> SH[("Google Sheets<br/>aba Inventário")]
    S -. "ApiError" .-> EH["errorHandler<br/>{ erro: { codigo, mensagem, detalhes? } }"]
    EH -. JSON .-> F
```

| Camada | Arquivo(s) | Responsabilidade |
| --- | --- | --- |
| Configuração | `config/env.js` | Lê o `.env`, converte os `\n` da chave e lista as variáveis `GOOGLE_*` que faltam |
| App | `app.js`, `index.js` | helmet, CORS, compression, JSON até 100 kB, morgan, Swagger UI e encerramento limpo (SIGINT/SIGTERM) |
| Rotas e controllers | `routes/`, `controllers/` | Mapeiam HTTP para o service e escolhem status e headers. **Sem regra de negócio** |
| Services | `services/equipamentos.service.js` | Validação, unicidade do patrimônio, mesclagem do PUT, resumo e **serialização das escritas**. Recebem o repositório e o mutex por injeção, o que permite testar sem o Google |
| Repositório e domínio | `repositories/`, `domain/` | Lê e grava linhas **pelo nome da coluna**, gera o próximo `EQ-####` e normaliza o status |
| Cliente Sheets | `lib/sheetsClient.js` | Autenticação JWT e documento memorizado (com nova tentativa se falhar). Se a aba não for encontrada, recarrega os dados da planilha uma vez. Valida aba e cabeçalho a cada acesso (uma leitura extra por requisição) e traduz erros do Google em mensagens acionáveis |
| Erros | `utils/ApiError.js`, `middlewares/` | Um único formato de erro e 404 para rotas desconhecidas. `asyncHandler` encaminha promises rejeitadas (Express 4) |

**Leitura e escrita pelo nome da coluna.** A cada acesso, a API carrega a linha 1 da aba e confere se as 5 colunas existem. Depois lê e grava `row.get('Patrimônio')` pelo nome, não pela posição. Na prática:

- reordenar colunas ou inserir colunas extras (ex.: "Observações") **não corrompe dados**;
- a API **não apaga as colunas extras**;
- renomear uma coluna obrigatória gera um erro claro ("Colunas ausentes...").

**Pacote compartilhado (`@frota/shared`).** É a única fonte de verdade do domínio:

- `STATUS`, `STATUS_META` (rótulo, tom de cor, descrição), `SHEET_HEADERS`, `FIELD_TO_HEADER`, `normalizeStatus` e `validateEquipamento`;
- é JavaScript puro (ESM), sem build, ligado por symlink pelo npm workspaces;
- uma regra como "Em Uso exige responsável" existe em um só lugar: o frontend mostra o mesmo erro que o backend mostraria, sem esperar a rede, e o backend continua validando porque o cliente não é confiável.

---

## Bônus: controle de concorrência

**O problema.** O Google Sheets **não tem transações**. Sem coordenação, duas requisições simultâneas podem:

- **gerar o mesmo ID**, porque as duas leem `EQ-0005` como maior ID e gravam `EQ-0006`;
- **duplicar um patrimônio**, porque as duas verificam que ele está livre antes de qualquer uma gravar;
- **editar ou apagar a linha errada**, porque um DELETE desloca as linhas de baixo e muda o `rowNumber` que a outra requisição acabou de ler.

**A solução** (`apps/backend/src/lib/mutex.js`) é um **mutex FIFO baseado em cadeia de promises**, com cerca de 40 linhas, sem dependências e sem busy-wait:

```js
runExclusive(task) {
  const result = tail.then(() => task());   // espera a anterior terminar
  tail = result.then(noop, noop);           // a fila nunca rejeita: um erro não trava as próximas
  return result;
}
```

- **Toda escrita** (POST, PUT/PATCH, DELETE) roda dentro de `runExclusive`, e o ciclo **ler → validar → gravar** acontece inteiro na seção crítica. A verificação de patrimônio único e o cálculo do próximo ID também ficam dentro do lock.
- **Leituras (GET) não entram na fila** e seguem em paralelo.
- As escritas são atendidas **na ordem de chegada**, e uma tarefa que falha não bloqueia a fila.
- O `GET /api/health` expõe `escritasNaFila`.
- Coberto por testes: exclusão mútua, ordem FIFO, recuperação após erro e um teste que dispara **criações concorrentes** e verifica IDs e patrimônios únicos (`equipamentos.service.test.js`).

**Limites (conscientes):**

- O lock vale **dentro de um processo Node**. Com várias instâncias da API (cluster, autoscaling), cada uma teria a sua fila. Seria preciso um **lock distribuído** (ex.: Redis) ou manter **uma única instância**.
- Edições feitas **à mão na planilha** durante uma escrita da API não passam pelo lock. O controle otimista, citado em [próximos passos](#próximos-passos), cobriria esse caso.
- A Google Sheets API tem **cotas de requisições por minuto**; consulte os limites atuais em *Google Cloud Console → APIs e serviços → Google Sheets API → Cotas*. Cada requisição da API faz algumas chamadas ao Google. Ao estourar a cota, a API responde `503 SHEETS_UNAVAILABLE`, e o mutex não resolve cota.

---

## Frontend

### Funcionalidades

- **Cards de resumo:** o total e um card por status, com contagem, barra de proporção e descrição. Os cards de status são **clicáveis e filtram a tabela**; o card Total limpa o filtro.
- **Busca** por Responsável ou Patrimônio, com debounce de 300 ms, **sem diferenciar acentos nem maiúsculas** (`joao` encontra `João`), e contagem de resultados.
- **Chips de filtro** por status, que combinam com a busca.
- **Barra de ferramentas:** busca e botão **Novo equipamento** na mesma linha, com os chips de status logo abaixo.
- **Tabela** no desktop e **lista de cards** no mobile. Cada linha tem as ações de editar e excluir; excluir é um botão de ícone vermelho, sem fundo.
- **Modal de cadastro e edição**, com validação no cliente (mesma função do backend) e erros do servidor (409/422) exibidos **no campo** correspondente.
- **Confirmação antes de excluir.**
- **Toasts** de sucesso e erro, **skeletons** no primeiro carregamento, **spinner inline** nas recargas, **estados vazio e de erro** (com "Tentar novamente") e aviso quando a API está fora do ar.
- **Tema claro e escuro** e **sidebar** com o resumo do inventário.

### Estado e dados

- O hook `useEquipamentos` é o **único dono do estado de servidor**: lista, carregando/atualizando, salvando e erro.
- Depois de criar, editar ou excluir, a lista local é atualizada com a **resposta da API**, sem ler a planilha de novo. Isso economiza cota.
- Recargas concorrentes são canceladas com `AbortController`.
- O **resumo é derivado** da mesma lista com `useMemo`, no mesmo formato de `/resumo`. Cards e tabela nunca divergem.
- **A busca é feita no cliente, e de propósito.** Uma frota tem de dezenas a poucas centenas de linhas, e o Sheets não tem índice: uma busca no servidor leria a aba inteira do mesmo jeito e gastaria cota a cada tecla. A API também aceita `?busca=` para outros clientes. Com milhares de linhas, o caminho seria paginação e busca no servidor.
- `api/http.js` transforma qualquer falha em `ApiRequestError { status, codigo, mensagem, detalhes }`. Falha de rede, ou o 502/504 do proxy com o backend parado, vira `status: 0` com a mensagem "Não foi possível conectar à API...".

### Design system (resumo)

- **Tokens semânticos** em `src/styles/index.css`, com Tailwind v4 CSS-first (`@theme`):
  - `canvas`, `surface`, `surface-muted`, `surface-raised` (superfícies);
  - `fg`, `fg-muted`, `fg-subtle` (texto);
  - `line`, `line-strong` (bordas);
  - escala de marca índigo `brand-50…950`;
  - pares `*-soft` (fundo) e `*-strong` (texto) para `success`, `info`, `warning` e `danger`.
  
  Os componentes usam apenas tokens, nunca cores cruas.
- **Cores de status**, definidas em `STATUS_META` no `@frota/shared`:

  | Status | Tom | Cor |
  | --- | --- | --- |
  | Disponível | success | esmeralda |
  | Em Uso | info | azul |
  | Em Manutenção | warning | âmbar |

  O vermelho fica reservado para erro e exclusão. O badge sempre tem texto além da cor.
- **Tipografia:** Inter, com **números tabulares** em IDs, patrimônios e contagens, para alinhar em coluna. Espaçamento em grid de 4 px.
- **Modo escuro:**
  - `data-theme` no `<html>`, com `@custom-variant dark`;
  - um script inline no `index.html` aplica o tema salvo, ou o do sistema, **antes** do React montar, sem flash;
  - a preferência fica em `localStorage` e é sincronizada entre abas;
  - no escuro, a elevação é feita por superfícies mais claras, não por sombra.
- **Responsivo:**

  | Faixa | Comportamento |
  | --- | --- |
  | < `md` | Tabela vira cards |
  | < `lg` | Sidebar vira drawer (overlay, Esc, trava de scroll) |
  | < `sm` | Modal vira bottom sheet |
  | Mobile / `xl` | Cards de resumo em 2 / 4 colunas |
- **Acessibilidade:**
  - `lang="pt-BR"` e link "Pular para o conteúdo";
  - foco visível, navegação completa por teclado;
  - modais com `role="dialog"`, focus trap, Esc e **retorno do foco** ao elemento que abriu. A confirmação de exclusão foca "Cancelar";
  - campos com `aria-invalid`, `aria-required` e erro ligado por `aria-describedby`;
  - `aria-pressed` em chips e cards;
  - `aria-live` na busca e nos toasts, e `aria-busy` nos carregamentos;
  - `prefers-reduced-motion` respeitado;
  - **sem biblioteca de UI**: todos os componentes são próprios.

---

## Decisões técnicas

- **Monorepo com npm workspaces.** Um `npm install` e um `npm run dev`, sem ferramenta extra (Turborepo, Nx, pnpm).
- **`@frota/shared`** com status, colunas e validação. Front e back não divergem.
- **Service account + `google-spreadsheet` v4.** Não há login de usuário, o escopo é mínimo (`spreadsheets`) e as linhas são tratadas como objetos indexados pelo cabeçalho.
- **Mapeamento pelo nome da coluna.** A planilha é editada por pessoas, e a posição das colunas não é confiável.
- **IDs sequenciais `EQ-0001`** em vez de UUID. São legíveis na planilha e ditos em voz alta ("o EQ-0007 voltou da manutenção"). O próximo ID é calculado como *maior ID + 1*, dentro do lock.
- **Mutex de escrita em processo.** Resolve a falta de transação com zero dependências (limites [acima](#bônus-controle-de-concorrência)).
- **PUT parcial com revalidação completa.** O cliente envia só o que muda, e a linha nunca fica inválida. `PATCH` é um alias.
- **Patrimônio único**, verificado dentro do lock, com 409 e erro no campo.
- **Busca no cliente.** Resposta instantânea e sem gasto de cota (ver [Estado e dados](#estado-e-dados)).
- **Tailwind v4 CSS-first e sem biblioteca de UI.** O tema troca só variáveis CSS, o bundle é pequeno (React é a única dependência de runtime do front) e a acessibilidade é implementada à mão.
- **Express 4 + `asyncHandler`.** Stack conhecida, com um único formato de erro do qual o frontend depende.
- **`node:test` em vez de Jest.** Zero dependências, ESM nativo, testes do service com repositório em memória.
- **OpenAPI 3 + Swagger UI servidos pela própria API.** A documentação da API fica versionada junto do código e pode ser testada no navegador.

**Limitações conhecidas (aceitas neste escopo):**

- **IDs podem ser reutilizados.** O próximo ID é *maior ID + 1*, então, se o registro de maior ID for excluído, o próximo cadastro reutiliza esse número.
- **Erros de acesso do Google viram 500.** Quando o Google responde 401, 403 ou 404 (credencial inválida, planilha não compartilhada ou inexistente), a API devolve `500 INTERNAL_ERROR`, com uma mensagem que diz o que corrigir. Apenas 429 e 503 viram `503 SHEETS_UNAVAILABLE`.
- **O cabeçalho é relido a cada requisição.** Isso custa uma chamada extra ao Google por requisição, em troca de sempre mapear as colunas pelo nome.

---

## Qualidade: testes, lint e CI

```bash
npm test        # node:test em packages/shared e apps/backend
npm run lint    # ESLint 9 (flat config) em todo o monorepo
npm run build   # build de produção do frontend
```

Os testes **não precisam de credenciais do Google**: o service é testado com um repositório em memória injetado. O que eles cobrem:

| Arquivo | O que testa |
| --- | --- |
| `packages/shared/src/validation.test.js` | Normalização, erros por campo, "Em Uso" exige responsável, modo parcial, variações de status |
| `apps/backend/src/lib/mutex.test.js` | Exclusão mútua, ordem FIFO, fila sobrevive a erros, contador `queued` |
| `apps/backend/src/repositories/nextId.test.js` | Próximo ID pelo maior valor, IDs fora do padrão ignorados, ID acima de `EQ-9999` |
| `apps/backend/src/services/equipamentos.service.test.js` | CRUD, 404/400/409/422, PUT parcial com revalidação, **escritas concorrentes**, resumo, busca sem acento |

**CI:** o workflow `.github/workflows/ci.yml` roda `npm ci`, `npm run lint`, `npm test` e `npm run build` em **Node 20 e 22** a cada push na `main` e em pull requests.

---

## Solução de problemas

Comece sempre por **<http://localhost:3333/api/health>**: a resposta diz o que está faltando.

| Sintoma / mensagem | Causa provável | Solução |
| --- | --- | --- |
| `503 CONFIG_INCOMPLETE` nas rotas, ou `/api/health` com `"status": "configuracao_incompleta"` | `apps/backend/.env` ausente ou sem as variáveis `GOOGLE_*` | `cp apps/backend/.env.example apps/backend/.env` e preencha as 3 variáveis. `sheets.variaveisAusentes` lista quais faltam |
| `Acesso negado à planilha...` (Google 403) | Planilha **não compartilhada** com a service account, ou Sheets API desativada | [Passo 6](#6-compartilhar-a-planilha-com-a-service-account-importante): compartilhe com o `client_email` como **Editor**. Confira o [passo 2](#2-ativar-a-google-sheets-api) |
| `Planilha não encontrada (GOOGLE_SHEET_ID inválido)` (Google 404) | ID copiado errado | Use só o trecho entre `/d/` e `/edit` |
| `Credenciais inválidas...`, `invalid_grant` ou `error:1E08010C:DECODER routines::unsupported` | `GOOGLE_PRIVATE_KEY` sem aspas, com quebras de linha reais, cortada ou de outra conta | Uma linha, entre aspas duplas, com `\n` literais. `client_email` e `private_key` do **mesmo** JSON |
| `Aba "Inventário" não existe na planilha` | Aba não criada ou com outro nome | `npm run sheets:init` (não precisa reiniciar a API), ou ajuste `SHEET_TAB_NAME` |
| `Colunas ausentes na aba...` | Cabeçalho renomeado ou sem acento | Linha 1 exatamente `ID \| Modelo \| Patrimônio \| Responsável \| Status` (a ordem é livre) |
| `sheets:init`: `A aba já tem um cabeçalho diferente...` | Aba existente com outro cabeçalho | Corrija a linha 1 à mão, ou apague a aba e rode de novo |
| `503 SHEETS_UNAVAILABLE` | Cota por minuto excedida (429) ou instabilidade do Google | Aguarde alguns segundos e tente de novo |
| `EADDRINUSE :::3333` (ou `:5173`) | Porta ocupada | Mude `PORT` no backend. No front, use `VITE_PORT` e aponte `VITE_PROXY_TARGET` para a nova porta da API |
| Aviso no frontend "Não foi possível conectar à API..." | Backend parado ou em outra porta | `npm run dev` (ou `npm run dev:backend`). Confira se `VITE_PROXY_TARGET` bate com `PORT` |
| Erro de CORS no navegador (só com `VITE_API_URL` preenchida) | A origem do front não está em `CORS_ORIGIN` | Adicione a URL do front em `CORS_ORIGIN`, ou deixe `VITE_API_URL` vazia em desenvolvimento |

---

## Segurança

- **Nenhuma credencial real está versionada.** Os `.env.example` têm apenas valores fictícios.
- O `.gitignore` bloqueia `.env`, `.env.*` (exceto `.env.example`), `*.pem`, `service-account*.json`, `credentials*.json` e `client_secret*.json`.
- Guarde o JSON da service account **fora do repositório** e dê a ela acesso **somente** à planilha do projeto.
- Se uma chave vazar, exclua-a em *IAM e administrador → Contas de serviço → Chaves* e gere outra.
- A API usa `helmet`, CORS restrito por `CORS_ORIGIN` e limite de 100 kB no corpo. Em `NODE_ENV=production`, os erros não expõem o stack trace.
- Não há autenticação de usuários, porque ela ficou fora do escopo do teste (ver [próximos passos](#próximos-passos)).

## Notas para deploy

O deploy não faz parte deste repositório. Funciona em qualquer provedor que rode Node.js e sirva arquivos estáticos.

- **API:**
  - instalar com `npm ci` (ou `npm install`) na raiz;
  - iniciar com `npm start`;
  - variáveis: `NODE_ENV=production`, `PORT` (se o provedor exigir), `GOOGLE_SHEET_ID`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY` (com `\n` literais), `SHEET_TAB_NAME` (opcional) e `CORS_ORIGIN=<URL pública do frontend>`.
- **Frontend:**
  - build com `npm run build`, que gera os estáticos em `apps/frontend/dist`;
  - defina `VITE_API_URL=<URL pública da API, sem /api>` **no momento do build**, porque as variáveis do Vite são embutidas no bundle.
- **Um aponta para o outro:** `CORS_ORIGIN` (API) aponta para o frontend e `VITE_API_URL` (front) aponta para a API.
- Rode **uma única instância** da API, porque o mutex de escrita vive em memória (ver [limites](#bônus-controle-de-concorrência)).

## Próximos passos

O que eu faria com mais tempo:

- **Controle otimista:** uma coluna `Atualizado em` (ou versão) com `If-Match` e 409, para detectar edições concorrentes, inclusive as manuais na planilha.
- **Autenticação** (ex.: SSO do Google Workspace) e **trilha de auditoria** (quem alterou o quê e quando).
- **Cache de leitura com TTL curto**, invalidado a cada escrita, para poupar a cota do Google.
- **Paginação e busca no servidor** quando o inventário passar de alguns milhares de linhas.
- **Testes E2E com Playwright** (criar → editar → filtrar → excluir) e testes de componentes React.
- **Rate limiting** na API e **lock distribuído** (Redis) caso haja mais de uma instância.
- **Contador de ID persistente**, para não reutilizar o ID do último registro excluído, e **histórico de movimentações** por equipamento.
