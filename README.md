Solução para a Rinha de Backend 2025 (com NodeJS)

- Foi usado uma instancia como memorydb (sqlite in-memory);
- API usando uWebSockets com Unix Socket; 
- Pub/Sub com zeromq via ipc unix socket (baixo overhead); 
- HAProxy como lb se comunicando via unix socket com os dois backend;

essa versão que ficou em segundo lugar, eu edito README.md quando der (to no celular)