# Rinha de Backend 2025 - Solução com Node.js

## Arquitetura

### Componentes Principais
- **Database**: SQLite in-memory para máxima velocidade de acesso
- **API Server**: uWebSockets com comunicação via Unix Socket
- **Message Queue**: ZeroMQ com IPC Unix Socket (overhead mínimo)
- **Load Balancer**: HAProxy distribuindo requisições via Unix Socket

### Stack
- **Runtime**: Node.js
- **HTTP Server**: uWebSockets
- **Database**: SQLite (in-memory)
- **Message Broker**: ZeroMQ
- **Load Balancer**: HAProxy
- **Transport**: Unix Domain Sockets

## Resultados de Performance (#2 Posição)

**Melhor resultado obtido**: [Resultado rinha](https://github.com/zanfranceschi/rinha-de-backend-2025/blob/main/participantes/cristian-s-node-1/final-results.json)

**Link da pasta**: [Link](https://github.com/zanfranceschi/rinha-de-backend-2025/blob/main/participantes/cristian-s-node-1)

**Link do Ranking**: [Link](https://github.com/zanfranceschi/rinha-de-backend-2025/blob/main/RESULTADOS_FINAIS.md)

### Métricas Principais
- **Lucro Total**: R$ 784.532,58
- **P99 Latência**: 3.15ms (Bônus: 16%)
- **Requests Máximas**: 603
- **Pagamentos Processados**: 36.788/90.577 (59% de lag)

````json
{
  "timestamp": "2025-08-18T11:19:57.609Z",
  "participante": "cristian-s-node-1",
  "total_liquido": 784532.57634,
  "total_bruto": 737599.4,
  "total_taxas": 61278.2135,
  "descricao": "'total_liquido' é sua pontuação final. Equivale ao seu lucro. Fórmula: total_liquido + (total_liquido * p99.bonus) - (total_liquido * multa.porcentagem)",
  "p99": {
    "valor": "3.15ms",
    "bonus": "16%",
    "max_requests": "603",
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
    "num_pagamentos_total": 36788,
    "num_pagamentos_solicitados": 90577,
    "lag": 53789,
    "descricao": "Lag é a diferença entre a quantidade de solicitações de pagamentos e o que foi realmente computado pelo backend. Mostra a perda de pagamentos possivelmente por estarem enfileirados."
  },
  "pagamentos_solicitados": {
    "qtd_sucesso": 90577,
    "qtd_falha": 0,
    "descricao": "'qtd_sucesso' foram requests bem sucedidos para 'POST /payments' e 'qtd_falha' os requests com erro."
  },
  "pagamentos_realizados_default": {
    "total_bruto": 416057.55,
    "num_pagamentos": 20751,
    "total_taxas": 29124.0285,
    "descricao": "Informações do backend sobre solicitações de pagamento para o Payment Processor Default."
  },
  "pagamentos_realizados_fallback": {
    "total_bruto": 321541.85,
    "num_pagamentos": 16037,
    "total_taxas": 32154.185,
    "descricao": "Informações do backend sobre solicitações de pagamento para o Payment Processor Fallback."
  }
}
````

### Destaques da Performance
-  **Zero inconsistências** - Nenhuma multa aplicada
-  **Lag significativo** - 53.789 pagamentos não processados a tempo (59% de lag)
-  **P99 excelente** - 3.15ms garantindo bônus de 16%
-  **Alto volume** - 90.577 requisições recebidas

## Deployment do melhor resultado obtido

**IMG Docker utilizada API**: `chrisblood777/rinha-de-backend-2025-node:latest`

**IMG Docker utilizada MemoryDB**: `chrisblood777/rinha-de-backend-2025-node-memorydb:latest`
