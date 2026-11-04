# Guia operacional da plataforma ELLENCO

Este guia descreve o fluxo que está implementado hoje no site, da entrada do usuário até os registros de estoque, EPI, ferramentas e relatórios. Use-o como roteiro de demonstração e de operação. Os nomes podem aparecer com pequenas variações no menu conforme o tamanho da tela e o perfil de acesso.

## 1. Fluxo completo recomendado

1. **Entrar na plataforma.** Faça login com e-mail ou CPF e senha. Um funcionário novo pode se cadastrar; o cadastro público cria um perfil de acesso `FUNCIONARIO`.
2. **Preparar a estrutura.** Em **Gerenciamento → Obras e galpões**, cadastre primeiro a obra e depois o galpão vinculado a ela. Selecione responsáveis já cadastrados.
3. **Preparar pessoas e fornecedor.** Em **Gerenciamento → Usuários cadastrados**, cadastre acessos e defina o perfil fixo adequado. O fornecedor pode ser criado durante o recebimento.
4. **Preparar o catálogo.** Em **Estoque → Novo produto**, cadastre código, nome, unidade e mínimo. Para EPI, marque a opção correspondente e informe CA e validade do CA. A busca nos formulários filtra cadastros existentes; ela não cria um novo produto ou funcionário.
5. **Registrar a entrada.** Em **Recebimentos**, selecione nota, fornecedor, galpão e produtos. Informe lote e validade para cada EPI. Faça a conferência e finalize a entrada para atualizar o saldo.
6. **Controlar o saldo e distribuir materiais.** Consulte saldo por galpão, lote e localização em **Estoque**. Registre saídas para obra, transferências ou devoluções em **Movimentações**. Cada operação aceita motivo e gera histórico/comprovante.
7. **Contar e corrigir divergências.** Em **Inventário**, inicie contagem cega para um galpão, conte os itens e justifique diferenças. Envie para aprovação. Uma pessoa autorizada diferente de quem iniciou aprova; só então os saldos são ajustados.
8. **Entregar e acompanhar EPI.** Em **EPI**, selecione um funcionário ativo e um lote elegível com saldo, CA vigente e validade. Registre a data de troca, confirme a entrega e peça ao funcionário que assine o aceite digital. A substituição também deixa uma nova entrega e aguarda assinatura.
9. **Rastrear ferramentas.** Cadastre a ferramenta vinculada ao galpão, imprima ou leia seu QR Code, registre empréstimo com responsável/obra/prazo e registre a devolução com o estado do item.
10. **Conferir alertas e evidências.** Use o sino para a Central de alertas, o Dashboard para indicadores, **Auditoria** para ações registradas e **Gerenciamento → Emitir relatórios** para CSV/Excel ou impressão/PDF.

## 2. Módulos e como usar

### Início

- **Objetivo:** ponto de entrada com atalhos para a operação.
- **Processo:** escolha uma ação rápida, como receber materiais, consultar estoque, abrir EPIs ou acessar o Dashboard.
- **Resultado:** navegação para o módulo escolhido. Alertas pendentes levam à Central de alertas.

### Dashboard

- **Objetivo:** dar uma visão consolidada do estado da operação.
- **Mostra:** indicadores de recebimentos, conferências, EPIs, estoque, ferramentas/inventários e atividade registrada dos últimos 30 dias.
- **Processo:** use os números e o gráfico para localizar o tema que precisa de atenção; abra **Central de alertas** pelo atalho ou pelo sino.
- **Observação:** os indicadores são agregados; para identificar os registros individuais, abra o módulo operacional correspondente.

### Central de alertas

- **Objetivo:** reunir pendências sem ocupar um item da sidebar.
- **Processo:** clique no sino; filtre por urgência e por Estoque, EPIs ou Recebimentos; use **Abrir módulo** para tratar a pendência.
- **Alertas atuais:** recebimentos aguardando conferência, assinaturas de EPI, estoque abaixo do mínimo e lotes/EPIs vencidos ou próximos do vencimento/troca.
- **Observação:** os alertas são calculados a partir dos dados agregados atuais. A prioridade apresentada é classificada pela mensagem do alerta; não é uma fila persistente com atribuição, comentários ou marcação de concluído.

### Recebimentos

- **Objetivo:** registrar notas e só atualizar estoque depois da conferência/finalização.
- **Processo:** crie um recebimento; informe número da nota, fornecedor, galpão e itens do catálogo com quantidade. Para EPI, inclua lote identificado e validade futura. Também é possível importar XML de NF-e, revisar os produtos vinculados e completar os que ainda não existem.
- **Estados:** aguardando conferência → em conferência → entrada finalizada/aprovada.
- **Resultado:** a finalização cria/atualiza os saldos do galpão e os dados passam a aparecer em Estoque e relatórios.

### Estoque

- **Objetivo:** manter o catálogo de produtos e a posição de saldo por obra, galpão, lote e localização.
- **Processo de cadastro:** clique em **Novo produto**, informe código, nome, unidade, saldo mínimo e galpão/saldo inicial. Marque **EPI** para classificar o item no fluxo de EPI; informe número e validade do CA. Lote e validade também devem ser mantidos para rastreabilidade.
- **Consulta:** pesquise por nome/código e revise saldo total, mínimo, classificação, lote/validade, local e situação. A tabela de saldos detalha quantidades disponíveis, reservadas e bloqueadas.
- **Ações:** movimentar, registrar devolução, ler QR Code ou abrir a central de etiquetas.
- **Resultado:** movimentações registradas atualizam o saldo e o histórico operacional.

### Movimentações

- **Objetivo:** registrar o caminho dos materiais entre galpões, obras e consumo.
- **Tipos disponíveis:** saída para obra/consumo, transferência, devolução, reserva/liberação de reserva e bloqueio/desbloqueio de lote.
- **Processo:** escolha a operação, selecione o lote/saldo de origem (ou produto devolvido), destino e quantidade; preencha motivo e dados de aplicação, como EAP/frente de serviço quando aplicável.
- **Resultado:** saldo é validado no servidor e a operação aparece no Kardex com responsável, origem/destino e comprovante. Perfis de gestão autorizados podem estornar com justificativa; o evento original continua no histórico.

### Inventário

- **Objetivo:** comparar a contagem física com o saldo registrado e corrigir divergências com segregação de funções.
- **Processo:** inicie um inventário cego escolhendo o galpão; conte cada produto/lote/localização e justifique divergências; envie a contagem para aprovação.
- **Aprovação:** ADMIN, CEO ou GLOBAL_ADMIN pode aprovar, mas quem iniciou a contagem não pode aprovar o próprio inventário.
- **Resultado:** a aprovação aplica os ajustes ao saldo e conserva o responsável, contagem e histórico. A contagem por câmera auxilia a conferir código, mas não substitui a contagem física.

### Ferramentas e equipamentos

- **Objetivo:** rastrear patrimônio, localização, empréstimo e devolução.
- **Processo:** cadastre patrimônio, nome/categoria e galpão; selecione uma ferramenta disponível para empréstimo; vincule funcionário ativo, obra, frente/prazo e observações; registre a devolução e o estado do item.
- **Acompanhamento:** o painel mostra disponíveis, empréstimos ativos e atrasados. O histórico inclui responsável, obra e comprovante.
- **QR Code:** a etiqueta abre o registro da ferramenta; a operação continua sujeita ao login/perfil.

### EPI

- **Objetivo:** controlar entrega real de EPI ao trabalhador, validade, troca e aceite.
- **Pré-requisitos:** produto marcado como EPI no Estoque; CA e validade do CA vigentes; recebimento de um lote identificado com validade futura; saldo disponível; funcionário ativo cadastrado.
- **Entrega:** clique em **Registrar entrega**; pesquise e selecione o funcionário e o saldo/lote elegível; informe quantidade e próxima troca; confirme. O saldo é baixado e a entrega fica pendente de assinatura.
- **Aceite:** o funcionário acessa seus EPIs e assina digitalmente o recebimento. O registro mantém a situação do aceite e o histórico da entrega.
- **Substituição:** um operador autorizado inicia a troca a partir de uma entrega existente; selecione o novo lote e prazo. A nova entrega aguarda assinatura e a movimentação de saldo fica rastreada.
- **Acompanhamento:** métricas mostram entregas, assinaturas pendentes, trocas em até 30 dias e trocas vencidas; use busca por funcionário, CPF, produto, CA ou situação.

### Auditoria

- **Objetivo:** consultar ações e responsáveis registrados nos logs.
- **Processo:** abra **Auditoria** na navegação ou a opção de auditoria dentro da Central de gerenciamento; revise módulo, ação, usuário, detalhes e data.
- **Uso recomendado:** conferir movimentações, alterações administrativas e operações durante homologação ou investigação.

### Etiquetas QR

- **Objetivo:** imprimir em lote etiquetas para produtos/EPIs e ferramentas.
- **Processo:** abra **Central de QR Codes**, filtre por tipo e pesquise nome/código/patrimônio; selecione itens e clique **Imprimir**. Na janela do navegador, escolha impressora ou **Salvar como PDF**.
- **Leitura:** o QR identifica o registro pelo ID do banco; abrir/operar exige autenticação e respeita permissões.

### Sincronização

- **Objetivo:** mostrar o estado da conexão e operações locais que precisam de conferência.
- **Processo:** em caso de queda de rede, consulte a fila; confira o histórico do servidor antes de tentar registrar novamente ou remover a anotação local.
- **Importante:** operações pendentes não são reenviadas automaticamente. Essa regra evita duplicar entrega, transferência ou consumo quando a resposta da API se perde.

### Minha conta

- **Objetivo:** atualizar nome, telefone, unidade/obra e foto do perfil; consultar e-mail e perfil de autorização.
- **Processo:** escolha uma imagem de até 2 MB para pré-visualizar; salve para atualizar o perfil e o avatar do cabeçalho. Alterar foto não muda permissões nem credenciais.

## 3. Central de gerenciamento

A Central de gerenciamento é acessível a ADMIN, CEO e GLOBAL_ADMIN e reúne quatro áreas:

### Usuários cadastrados

- Pesquise por nome, CPF, e-mail ou obra e filtre por perfil.
- Cadastre usuário com nome, e-mail, senha inicial, CPF, telefone, lotação, função/cargo e perfil de acesso.
- Altere perfil ou ative/desative uma conta conforme sua autorização.
- O cadastro público só cria `FUNCIONARIO`; a gestão administrativa pode cadastrar perfis mais altos, sujeitos às regras do criador.
- **Perfis fixos existentes:** `FUNCIONARIO`, `SUPERVISOR`, `ADMIN`, `CEO` e `GLOBAL_ADMIN`.

### Obras e galpões

- Cadastre a obra com código, nome, endereço e responsável ativo já cadastrado.
- Depois cadastre o galpão vinculado à obra, código, nome, localização, responsável e capacidade estimada.
- Mantenha essa estrutura antes de receber ou movimentar materiais para que o destino possa ser pré-selecionado.

### Emitir relatórios

- **Entregas de EPI:** trabalhador, CPF, EPI/CA, quantidade, entrega, próxima troca, aceite, responsável e situação.
- **Recebimentos:** nota, fornecedor, produto, quantidade/unidade, lote, validade, galpão, responsável pelo registro/conferência e situação.
- **Posição de estoque:** código, produto, categoria, obra, galpão, lote, validade, saldo, mínimo e situação.
- Use filtros de data; **Exportar Excel (CSV)** produz arquivo CSV aberto pelo Excel. **Imprimir/PDF** abre uma página de impressão do navegador.
- **Limite atual:** os relatórios disponíveis são esses três. Um relatório independente de trabalhadores ativos com status consolidado de EPI não está presente nesta versão.

### Auditoria e logs

- Abra a atividade recente para revisar os últimos eventos com módulo, ação, usuário, data e detalhes.
- Use junto ao Kardex e ao histórico do EPI para reconstruir uma operação ponta a ponta.

## 4. Perfis de acesso: o que aparece e o que pode operar

| Perfil | Acesso principal na interface | Limites principais |
|---|---|---|
| Funcionário | Início, EPI, Sincronização, Minha conta e Central de alertas pelo sino | Consulta EPIs vinculados e pode confirmar aceite; não vê gestão operacional/administrativa |
| Supervisor | Dashboard, recebimentos, estoque, movimentações, inventário, ferramentas, EPI, sincronização e auditoria | Pode operar e enviar inventário para aprovação; não aprova a própria contagem; não administra usuários |
| Administrador | Operação + Central de gerenciamento + etiquetas QR | Pode gerir usuários/estrutura/relatórios; não concede CEO ou GLOBAL_ADMIN |
| CEO | Operação + Central de gerenciamento + etiquetas QR | Mesmas restrições de conceder CEO/GLOBAL_ADMIN aplicadas pelo backend |
| Administrador Global | Acesso administrativo mais amplo | Pode conceder/gerir perfis CEO e GLOBAL_ADMIN |

**Importante:** os perfis e autorizações são fixos no código. Não existe ainda criação de roles personalizados nem uma matriz configurável para escolher permissão de visualização/ação por módulo. Ocultar um botão não substitui autorização; as operações também são protegidas pelo backend.

## 5. Funções existentes fora do menu principal

- **Cadastro público:** cria conta de Funcionário vinculada ao CPF e ao cadastro de pessoa quando necessário.
- **Recuperar senha:** depende da configuração do provedor de e-mail e do endereço público da aplicação; se o serviço de e-mail não estiver configurado, o envio não funciona.
- **Integrações:** existe API administrativa para consultar estado/testar conectores configurados no ambiente, mas ainda não há um módulo de integração dedicado na sidebar para configurar ERP, RH/SESMT ou eSocial.
- **Relatórios e alertas:** não são uma camada de lançamento de dados; usam registros já persistidos nos módulos operacionais.

## 6. Regras práticas para homologação

- Use primeiro dados de demonstração e valide cada fluxo com um usuário de cada perfil.
- Antes de entregar EPI, confirme produto marcado como EPI, lote/validade, CA vigente e saldo disponível.
- Depois de recebimento, finalize a conferência antes de usar o saldo em uma saída/transferência.
- Para testar divergência, faça contagem e aprovação com usuários diferentes; verifique saldo e auditoria depois.
- Após uma resposta de rede incerta, procure comprovante/Kardex antes de repetir a operação.
- Para uma demonstração segura, não exponha CPF, hash de senha, token ou segredo nas capturas de tela.

