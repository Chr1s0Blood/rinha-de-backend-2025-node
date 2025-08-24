# Rinha de Backend 2025 - Solução com Node.js

## Arquitetura

### Componentes Principais
- **Database**: SQLite in-memory para máxima velocidade de acesso
- **API Server**: uWebSockets com comunicação via Unix Socket
- **Messaging**: ZeroMQ com IPC Unix Socket (overhead mínimo)
- **Load Balancer**: HAProxy distribuindo requisições via Unix Socket

### Stack
- **Runtime**: Node.js
- **HTTP Server**: uWebSockets
- **Database**: SQLite (in-memory)
- **Messaging**: ZeroMQ
- **Load Balancer**: HAProxy
- **Transport**: Unix Domain Sockets

## Resultados de Performance (#7/8 Posição)

**Melhor resultado obtido**: [Resultado rinha](https://github.com/zanfranceschi/rinha-de-backend-2025/blob/main/participantes/cristian-s-node-1/final-results.json)

**Link da pasta**: [Link](https://github.com/zanfranceschi/rinha-de-backend-2025/blob/main/participantes/cristian-s-node-1)

**Link do Ranking**: [Link](https://github.com/zanfranceschi/rinha-de-backend-2025/blob/main/RESULTADOS_FINAIS.md)

### Métricas Principais
- **Lucro Total**: R$ 1.918.576,76
- **P99 Latência**: 3.46ms (Bônus: 15%)
- **Requests Máximas**: 603
- **Pagamentos Processados**: 90.585/90.585 (0% de lag)

```json
{
  "timestamp": "2025-08-21T01:37:47.360Z",
  "participante": "cristian-s-node-1",
  "total_liquido": 1918576.7607,
  "total_bruto": 1816229.25,
  "total_taxas": 147901.632,
  "descricao": "'total_liquido' é sua pontuação final. Equivale ao seu lucro. Fórmula: total_liquido + (total_liquido * p99.bonus) - (total_liquido * multa.porcentagem)",
  "p99": {
    "valor": "3.46ms",
    "bonus": "15%",
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
    "num_pagamentos_total": 90585,
    "num_pagamentos_solicitados": 90585,
    "lag": 0,
    "descricao": "Lag é a diferença entre a quantidade de solicitações de pagamentos e o que foi realmente computado pelo backend. Mostra a perda de pagamentos possivelmente por estarem enfileirados."
  },
  "pagamentos_solicitados": {
    "qtd_sucesso": 90585,
    "qtd_falha": 0,
    "descricao": "'qtd_sucesso' foram requests bem sucedidos para 'POST /payments' e 'qtd_falha' os requests com erro."
  },
  "pagamentos_realizados_default": {
    "total_bruto": 1124043.1,
    "num_pagamentos": 56062,
    "total_taxas": 78683.017,
    "descricao": "Informações do backend sobre solicitações de pagamento para o Payment Processor Default."
  },
  "pagamentos_realizados_fallback": {
    "total_bruto": 692186.15,
    "num_pagamentos": 34523,
    "total_taxas": 69218.615,
    "descricao": "Informações do backend sobre solicitações de pagamento para o Payment Processor Fallback."
  }
}
```

### Destaques da Performance
-  **Zero inconsistências** - Nenhuma multa aplicada
-  **Zero lag** - 100% dos pagamentos processados com sucesso
-  **P99 excelente** - 3.46ms garantindo bônus de 15%
-  **Performance perfeita** - Todos os 90.585 pagamentos processados
-  **Máxima eficiência** - 603 requests máximas por segundo

## Deployment do melhor resultado obtido

**IMG Docker utilizada API**: `chrisblood777/rinha-de-backend-2025-node:latest`

**IMG Docker utilizada MemoryDB**: `chrisblood777/rinha-de-backend-2025