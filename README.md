# Auction Service

Serviço de leilões serverless na AWS, com API REST protegida por JWT e persistência em MongoDB.

## Tecnologias

- **Runtime:** Node.js 20.x (AWS Lambda)
- **Framework:** Serverless Framework
- **Linguagem:** TypeScript
- **Banco de dados:** MongoDB
- **Validação:** Zod
- **Autenticação:** JWT (API Gateway Request Authorizer)
- **Logs:** AWS Lambda Powertools (Logger)
- **Testes:** Jest

## Arquitetura

- **domain:** entidades e regras de negócio (leilão, status, lances)
- **infra:** conexão MongoDB, repositórios e modelos de persistência
- **presentation:** handlers Lambda, authorizer, schemas e utilitários HTTP

## API

Todas as rotas (exceto o job agendado) exigem o header `Authorization: Bearer <token>` com JWT válido.

| Método | Caminho            | Descrição                    |
|--------|--------------------|------------------------------|
| POST   | `/auction`         | Criar leilão                 |
| GET    | `/auction/{id}`    | Buscar leilão por ID         |
| GET    | `/auctions`        | Listar leilões               |
| POST   | `/auction/{id}/bid`| Dar lance em um leilão       |

O job **process-auctions** roda a cada 1 minuto (schedule) para processar leilões encerrados.

## Pré-requisitos

- Node.js 20.x
- npm
- Conta AWS (para deploy)
- MongoDB (local com Docker ou Atlas)

## Instalação

```bash
npm install
```

## Variáveis de ambiente

| Variável        | Uso                          |
|-----------------|------------------------------|
| `MONGODB_URI_TEST` | URI do MongoDB (desenvolvimento/testes) |
| `JWT_SECRET`    | Chave para validar tokens JWT (deploy)  |

Para desenvolvimento local e testes, crie um `.env` na raiz:

```env
MONGODB_URI_TEST=mongodb://localhost:27017
JWT_SECRET=sua-chave-secreta
```

## Executando localmente

### MongoDB com Docker

```bash
docker-compose up -d
```

Isso sobe o MongoDB na porta `27017`.

### Testes

```bash
npm test
```

### Formatação

```bash
# Verificar formatação
npm run format:check

# Aplicar formatação
npm run format
```

## Deploy (AWS)

1. Configure as variáveis de ambiente (por exemplo no `.env` ou no CI):
   - `JWT_SECRET` – obrigatório para o authorizer
   - URI do MongoDB acessível pela Lambda (ex.: MongoDB Atlas ou VPC)

2. Faça o deploy:

```bash
npm run deploy
```

Para um stage específico:

```bash
npx serverless deploy --stage staging
```

O Serverless usará a região `us-east-1` por padrão (ajustável em `serverless.yml`).

## Exemplo de uso da API

### Criar leilão (POST /auction)

```json
{
  "title": "Notebook Gamer",
  "status": "OPEN"
}
```

### Dar lance (POST /auction/{id}/bid)

```json
{
  "amount": 1500.00
}
```

### Autenticação

Inclua o token JWT no header:

```
Authorization: Bearer <seu-jwt>
```

O JWT deve conter pelo menos `sub` ou `userId` para identificar o usuário (conforme implementação do authorizer).

## Estrutura do projeto

```
src/
├── domain/
│   └── entities/          # Entidades e regras de negócio
├── infra/
│   ├── db/                # Conexão e modelos MongoDB
│   └── repository/        # Repositórios
└── presentation/
    ├── authorizer/        # Lambda authorizer (JWT)
    ├── handlers/          # Handlers das rotas e do job
    ├── schemas/           # Schemas Zod
    └── utils/             # Logger, erros HTTP, etc.
```

## Licença

Projeto de uso interno/estudo.
