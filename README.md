# Rinha de Backend 2025 - Solução Node.js

## Arquitetura

### Componentes Principais
- **Database**: SQLite in-memory para máxima velocidade de acesso
- **API Server**: HTTP Module nativo com comunicação via Unix Socket
- **Message Queue**: ZeroMQ com IPC Unix Socket (overhead mínimo)
- **Load Balancer**: HAProxy distribuindo requisições via Unix Socket

### Stack
- **Runtime**: Node.js
- **HTTP Server**: HTTP Module Nativo
- **Database**: SQLite (in-memory)
- **Message Broker**: ZeroMQ
- **Load Balancer**: HAProxy
- **Transport**: Unix Domain Sockets

## Resultados de Performance

**Melhor resultado obtido**: [Commit c909b7b](https://github.com/zanfranceschi/rinha-de-backend-2025/commit/c909b7bf22dab1d3b9d9181541ac3e90d8db4888)

**Link da pasta**: [Pasta atualizada](https://github.com/zanfranceschi/rinha-de-backend-2025/tree/main/participantes/cristian-s-node-2-http)

### Métricas Principais
- **Lucro Total**: R$ 361.789,76
- **P99 Latência**: 2.93ms (Bônus: 16%)
- **Requests Máximas**: 550
- **Pagamentos Processados**: 16.745/16.745 (0% de perda)

````json
{
  "participante": "cristian-s-node-2-http",
  "total_liquido": 361789.7609999737,
  "total_bruto": 333225.49999997637,
  "total_taxas": 21337.77499999902,
  "descricao": "'total_liquido' é sua pontuação final. Equivale ao seu lucro. Fórmula: total_liquido + (total_liquido * p99.bonus) - (total_liquido * multa.porcentagem)",
  "p99": {
    "valor": "2.93ms",
    "bonus": "16%",
    "max_requests": "550",
    "descricao": "Fórmula para o bônus: max((11 - p99.valor) * 0.02, 0)"
  },
  "multa": {
    "porcentagem": 0,
    "total": 0,
    "composicao": {
      "num_inconsistencias": 0,
      "descricao": "Se 'num_inconsistencias' > 0, há multa de 35%."
    }
  },
  "caixa_dois": {
    "detectado": false,
    "descricao": "Se 'lag' for negativo, significa que seu backend registrou mais pagamentos do que solicitado, automaticamente desclassificando sua submissão!"
  },
  "lag": {
    "num_pagamentos_total": 16745,
    "num_pagamentos_solicitados": 16745,
    "lag": 0,
    "descricao": "Lag é a diferença entre a quantidade de solicitações de pagamentos e o que foi realmente computado pelo backend. Mostra a perda de pagamentos possivelmente por estarem enfileirados."
  },
  "pagamentos_solicitados": {
    "qtd_sucesso": 16745,
    "qtd_falha": 0,
    "descricao": "'qtd_sucesso' foram requests bem sucedidos para 'POST /payments' e 'qtd_falha' os requests com erro."
  },
  "pagamentos_realizados_default": {
    "total_bruto": 286460.49999997433,
    "num_pagamentos": 14395,
    "total_taxas": 14323.024999998717,
    "descricao": "Informações do backend sobre solicitações de pagamento para o Payment Processor Default."
  },
  "pagamentos_realizados_fallback": {
    "total_bruto": 46765.00000000201,
    "num_pagamentos": 2350,
    "total_taxas": 7014.750000000302,
    "descricao": "Informações do backend sobre solicitações de pagamento para o Payment Processor Fallback."
  }
}
````

### Destaques da Performance
-  **Zero inconsistências** - Nenhuma multa aplicada
-  **Zero lag** - Todos os pagamentos processados
-  **P99 excelente** - 2.93ms garantindo bônus de 16%
-  **Alta disponibilidade** - 100% de sucesso nas requisições

## Deployment

**Imagem Docker utilizada API**: `chrisblood777/rinha-de-backend-2025-node:http-module`

**Imagem Docker utilizada MemoryDB**: `chrisblood777/rinha-de-backend-2025-node-memorydb:latest`
