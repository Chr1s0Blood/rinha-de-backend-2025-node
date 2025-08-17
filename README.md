Solução para a Rinha de Backend 2025 (com NodeJS)

- Foi usado uma instancia como memorydb (sqlite in-memory);
- API usando uWebSockets com Unix Socket; 
- Pub/Sub com zeromq via ipc unix socket (baixo overhead); 
- HAProxy como lb se comunicando via unix socket com os dois backend;

Melhor resultado do teste prévio: https://github.com/zanfranceschi/rinha-de-backend-2025/commit/c909b7bf22dab1d3b9d9181541ac3e90d8db4888

```json
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
```

Foi usado a imagem "chrisblood777/rinha-de-backend-2025-node:http-module" nas APIs para esse resultado.
