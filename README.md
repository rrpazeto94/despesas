# Contas da Casa

Aplicação local para registrar despesas compartilhadas e definir, no fechamento de cada mês, quanto cada pessoa vai assumir do total acumulado.

## Como abrir no VS Code

1. Extraia o arquivo ZIP.
2. No VS Code, escolha **File > Open Folder** e selecione a pasta `contas-da-casa`.
3. Abra `index.html` no navegador. A aplicação funciona sem instalação de dependências ou conta em serviços externos.
4. Para uma experiência melhor, você também pode instalar a extensão **Live Server** no VS Code e clicar em **Go Live**.

Alternativa sem extensão: abra o terminal na pasta do projeto e execute `python -m http.server 8000`; depois acesse `http://localhost:8000`.

## Como usar

- Durante o mês, cadastre cada conta apenas com nome, categoria, valor, vencimento, situação e observações. Não existe percentual por despesa.
- No fechamento, confira o **Total lançado** e combine quanto cada pessoa vai assumir.
- Informe somente o percentual da Pessoa 1. O percentual e o valor da Pessoa 2 são calculados automaticamente sobre o total de todas as despesas ativas do mês.
- A divisão é independente por mês. É possível alterar ou limpar a divisão quando necessário; os valores são recalculados automaticamente se uma despesa for adicionada, editada ou excluída.
- Os nomes das duas pessoas podem ser alterados no botão **Pessoas**.
- É possível marcar as contas como pagas/pendentes, editar e excluir lançamentos, filtrar por categoria e buscar pelo nome.
- **Exportar mês (CSV)** inclui as despesas e, quando definida, a divisão total do mês.

## Dados importados da planilha original

Foram carregados os valores das abas de janeiro, fevereiro, março e abril. Nenhum percentual individual ou divisão 50/50 foi atribuído aos dados importados: a divisão de cada mês começa como **A definir**, para que vocês decidam no fechamento.

A planilha tinha duas abas de abril com valores diferentes. A aba `Abril` foi mantida como versão ativa inicialmente, e `Abril (2)` foi preservada como versão alternativa arquivada para não duplicar o total. Na visão de abril, use os botões de versão para alternar entre elas.

Os status de pagamento dos dados antigos não existiam na planilha e aparecem como **Não informado**. As novas despesas começam como **Pendente**, mas podem ser cadastradas como pagas.

## Como os dados são armazenados

- Os lançamentos e as divisões mensais ficam salvos no armazenamento local do navegador (`localStorage`). Não há envio de dados para servidor.
- Use **Backup** para baixar um arquivo JSON com todos os lançamentos e configurações.
- Use **Restaurar** para carregar um backup anterior. A restauração substitui a base atual do navegador.
- O armazenamento é específico do navegador e do perfil do computador em que a aplicação foi aberta. Limpar os dados do navegador pode apagar os lançamentos; mantenha backups periódicos.

## Migração da versão anterior

Se você já abriu a versão anterior do sistema neste mesmo navegador, ela será migrada automaticamente: os percentuais que estavam associados a cada despesa serão descartados e nenhuma divisão mensal será presumida. Basta definir a divisão correta no fechamento de cada mês.
