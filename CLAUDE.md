# Strike Details | Sistema de controle

Contexto para qualquer sessão que trabalhar neste repositório. Leia antes de mudar código.

## O que é

Sistema interno da **Strike Details Estética Automotiva** (matriz em Jaru/RO) para controlar os veículos em serviço: leitura de placa, entrada do veículo com fotos, etapas do serviço, estoque de materiais e acompanhamento pelo cliente.

- Responsáveis: Eduardo (desenvolvedor) e Petherson (dono). Os dois usam o perfil **Controle**.
- Hoje só a loja principal. Sem prazo para outras lojas (não é multiempresa).
- Idioma de tudo: português do Brasil.
- Deploy: Vercel, projeto `strike-system` (ligado a este repositório, branch `main`). Todo push no `main` publica.

## Regras de marca e texto (obrigatórias)

- O nome é sempre **"Strike Details"** (ou "Strike Details Estética Automotiva"). Nunca "Strike" sozinho: é outra empresa.
- Nunca usar travessão longo (em dash) em textos da interface ou documentos.
- Visual: branco, cinza e preto. Fontes: Archivo Black (marca), Barlow Condensed (títulos e placas), Inter (texto).
- Interface pensada para celular primeiro (os funcionários usam Android e iPhone). Por isso é site, não app.

## Arquivos

| Arquivo | Função |
| --- | --- |
| `index.html` | O sistema inteiro: telas, dados, leitor de placa. HTML + CSS + JS num arquivo só, sem build. |
| `api/read-plate.js` | Função da Vercel que chama o Plate Recognizer (Snapshot Cloud, `regions=br`) e esconde a chave. Não mudar sem motivo: está funcionando em produção. |
| `api/dados.js` | Lê e grava os dados da equipe no Supabase (GET tudo, POST lista de operações). |
| `api/foto.js` | Envia uma foto (e a miniatura) para o Storage do Supabase. |
| `api/cliente.js` | Área do cliente: só etapa, andamento e fotos de uma placa. Sem valores, danos, objetos nem nomes. |
| `api/_supabase.js` | Peças comuns das funções acima (não vira endereço). |
| `dev-server.js` | Servidor local sem dependências (`node dev-server.js`, porta 3000). Serve o site e roteia `/api/<nome>` para `api/<nome>.js`. A Vercel ignora. |
| `.env.exemplo` | Modelo de variáveis para rodar local. O `.env` real nunca vai para o Git. |

Variáveis na Vercel: `PLATE_RECOGNIZER_TOKEN` (secreta), `SUPABASE_URL`, `SUPABASE_KEY` (chave publicável), `SD_CHAVE_BANCO` (secreta) e `ACCESS_CODE` (opcional, código da equipe).

## Perfis de acesso

O login é só a escolha do perfil (sem senha, não é segurança).

- **Funcionário**: lê a placa, registra a entrada do veículo com fotos, conclui etapas, registra retiradas do estoque.
- **Controle** (nível máximo): tudo do funcionário + ajustar etapa, valor do serviço, entradas/contagem/mínimo do estoque, histórico, tipos de serviço e equipe.
- **Cliente**: só digita a placa e vê etapa atual, andamento (datas) e fotos. Nunca mostrar valores, danos, objetos pessoais nem nomes da equipe.

## Telas (roteamento por hash)

- `#/` login · `#/entrar/funcionario|controle|cliente`
- `#/inicio` galeria dos veículos em serviço (foto de capa = Frente, placa, etapa atual, barra de progresso)
- `#/placa` "Adicionar veículo": câmera ao vivo com moldura, foto da galeria ou digitar
- `#/novo/PLACA` entrada do veículo: tipo de serviço, descrição, fotos, danos, objetos pessoais (valor só para Controle)
- `#/veiculo/ID` etapas com botão "Concluir: etapa", fotos, estado na entrada, histórico; bloco extra do Controle
- `#/estoque`, `#/historico` (Controle), `#/ajustes` (Controle), `#/cliente/PLACA`
- Menu inferior: Início, Adicionar (botão preto no meio), Estoque; Controle também tem Histórico e Ajustes. A aba aberta tem fundo cinza atrás do ícone.

## Regras de negócio decididas

- **Status do serviço = a etapa atual** (não existe campo de status separado).
- Cada tipo de serviço tem sua lista de etapas, editável em Ajustes. Padrão (Cabine Blindada): Inspeção, Desmontagem, Limpeza externa, Limpeza interna, Limpeza de peças desmontadas, Montagem. O atendimento guarda uma cópia das etapas de quando começou.
- Uma placa só pode ter um atendimento em andamento. Ler a placa de um veículo em serviço abre o veículo direto.
- Fotos de entrada com espaços fixos: Frente, Traseira, Lateral esquerda, Lateral direita, Placa, Acessórios (+ extras: Danos, Interior, Objetos pessoais, Outra). A foto usada na leitura da placa entra como "Placa".
- Fotos abrem **direto a câmera** do aparelho (`capture="environment"`); "Galeria" é opção secundária.
- **Estoque**: Controle registra entradas, contagens e mínimo; funcionário registra retiradas (sem ligar a um serviço). O saldo é sempre a soma dos movimentos. Retirada acima do saldo é aceita e aparece como "Saldo negativo" para o Controle. Avisos: Sem estoque, Acabando (chegou no mínimo). Materiais iniciais: Espuma expansiva (lata) e Manta asfáltica (rolo).
- Financeiro: só valores lançados no próprio sistema.
- Fora do escopo por enquanto: agenda (já existe um projeto pronto, será anexado depois), cadastro de clientes (já existe no Supabase), site de registro de autorizados (outro projeto).

## Leitor de placa

- Principal: Plate Recognizer via `api/read-plate` (retorna `{plate, score, alternatives}`). Reserva: Tesseract.js no navegador (bem menos preciso), usado quando a API não responde.
- Câmera ao vivo: usa a câmera traseira padrão do navegador (sem troca de câmera; foi testado e removido a pedido). Tem **zoom** (salvo em `localStorage` `sd:zoom`) quando o aparelho suporta.
- Quadro da câmera fixo em **3:4**, altura limitada para o botão "Capturar placa" caber na tela sem rolar. A imagem enviada à API é só a área visível do quadro.
- Aparelho de teste do Eduardo: Galaxy A54.

## Dados: Supabase

- Projeto **"Strike Details DATABASE"** (`afngfcclipuuptskoowh`). As tabelas `leads`, `historico` e `autorizados` são de outro sistema: **não alterar**.
- **Regra do dono: nunca apagar nada do banco.** As tabelas do controle não têm permissão de DELETE. "Excluir" no sistema só marca: `excluido_em` (atendimentos), `ativo = false` (funcionários, tipos, materiais), `removida_em` (fotos). Arquivos do Storage também não são apagados nem sobrescritos.
- Tabelas do controle (prefixo `sd_`, com RLS): `sd_funcionarios`, `sd_tipos_servico`, `sd_veiculos`, `sd_atendimentos`, `sd_fotos`, `sd_estoque_itens`, `sd_estoque_movimentos`. Etapas, datas das etapas (`feitas`) e histórico do atendimento ficam em `jsonb` no próprio atendimento.
- Uma placa só tem um atendimento em andamento (índice único `sd_atendimentos_placa_em_andamento`).
- Acesso: só as funções da Vercel falam com o banco. Elas mandam o cabeçalho `x-sd-chave` (variável `SD_CHAVE_BANCO`), que as políticas conferem com `privado.sd_config` pela função `privado.sd_acesso_ok()`. O navegador nunca vê essa chave.
- Atendimentos têm `versao`: se outro aparelho mudou antes, a gravação é recusada e o site recarrega e avisa.
- O site guarda os dados em memória no mesmo formato de antes; cada `commit()` compara antes e depois e manda as operações para `api/dados`. Recarrega do banco a cada 30 s (ou ao voltar para a aba), só quando a tela pode ser redesenhada.
- Fotos no bucket público `sd-fotos` com nomes aleatórios: `fotos/<id>.jpg` (até 1600 px, JPEG 0,82) e `miniaturas/<id>.jpg` (480 px, usada nas listas). Plano grátis: 1 GB de arquivos, 5 GB/mês de tráfego, projeto pausa após 1 semana sem uso.
- Dados antigos do aparelho (`localStorage` `sd:dados:v1` e fotos no IndexedDB `sd-fotos`) continuam guardados no navegador. Em Ajustes, o Controle pode enviá-los ao banco (funcionários, tipos e materiais são ligados pelo nome).
- Pendente de decisão: limpeza automática das fotos antigas (conflita com a regra de nunca apagar; não foi feita).
- Depois: login de verdade no lugar da escolha de perfil.

## Como trabalhar neste repositório

- Mudanças pontuais, sem reestruturar o que já funciona. Respostas curtas e diretas.
- Testar antes de publicar: rodar `node dev-server.js` e conferir os fluxos (login, adicionar veículo, etapas, fotos, estoque, cliente) no tamanho de celular.
- Nunca rodar DELETE, TRUNCATE ou DROP no banco. Mudança de estrutura só com migração nova, sem apagar dados.
- Não commitar `.env` nem chaves.
