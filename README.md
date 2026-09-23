# Strike Details | Sistema de controle

Controle interno dos veículos em serviço: leitura de placa, etapas, fotos de entrada, estoque e área do cliente.

## Arquivos

| Arquivo | Para que serve |
| --- | --- |
| `index.html` | O sistema inteiro (telas, dados e leitor de placa) |
| `api/read-plate.js` | Função que chama o Plate Recognizer e esconde a chave (a mesma usada na Vercel) |
| `dev-server.js` | Servidor para rodar no computador. A Vercel ignora este arquivo |
| `.env.exemplo` | Modelo das chaves para rodar localmente |

## Rodar no computador

1. Instale o [Node.js](https://nodejs.org) 18 ou mais novo.
2. Copie `.env.exemplo` para `.env` e cole o token do Plate Recognizer em `PLATE_RECOGNIZER_TOKEN`.
3. Na pasta do projeto, rode `node dev-server.js`.
4. Abra `http://localhost:3000`.

No computador a câmera ao vivo funciona em `localhost`. No celular pelo IP da rede (o endereço aparece no terminal), o navegador bloqueia a câmera ao vivo porque não é HTTPS. Use "Usar foto do aparelho", que abre a câmera do celular do mesmo jeito.

Sem o token, o leitor usa a leitura do próprio aparelho, que é bem menos precisa.

## Publicar na Vercel

Suba `index.html` e a pasta `api/` como já está hoje. As variáveis `PLATE_RECOGNIZER_TOKEN` e `ACCESS_CODE` continuam as mesmas.

## Perfis de acesso

| Perfil | O que faz |
| --- | --- |
| Funcionário | Lê a placa, registra entrada do veículo com fotos, conclui etapas e registra retiradas do estoque |
| Controle | Tudo do funcionário, mais: ajustar etapas, valores, entradas e contagem de estoque, histórico, tipos de serviço e equipe |
| Cliente | Digita a placa e vê o andamento e as fotos. Não vê valores, danos, objetos nem nomes da equipe |

O login é só a escolha do perfil, sem senha. Serve para organizar as telas, não protege os dados.

## Onde ficam os dados

Tudo fica no navegador do aparelho: textos no `localStorage` e fotos no `IndexedDB`. Cada aparelho tem os seus dados, e limpar os dados do navegador apaga tudo. Em Ajustes dá para baixar um backup em JSON (sem as fotos). O próximo passo para uso real é um banco compartilhado.
