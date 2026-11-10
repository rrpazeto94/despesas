# Contas da Casa

Aplicação local para registrar as despesas da casa e definir, no fechamento de cada mês, quanto cada pessoa vai assumir do total acumulado.

## Como abrir no VS Code

1. Extraia o arquivo ZIP.
2. No VS Code, escolha **File > Open Folder** e selecione a pasta `contas-da-casa`.
3. Abra `index.html` no navegador. A aplicação funciona sem instalação de dependências ou conta em serviços externos.
4. Para uma experiência melhor, instale a extensão **Live Server** no VS Code e clique em **Go Live**.

Alternativa sem extensão: abra o terminal na pasta do projeto e execute `python -m http.server 8000`; depois acesse `http://localhost:8000`.

## Comece do zero

Esta versão começa **sem nenhuma despesa, sem histórico importado e sem divisão mensal cadastrada**. O mês atual fica selecionado, pronto para receber os primeiros lançamentos.

Os dados de versões anteriores não são carregados automaticamente: esta versão usa um armazenamento local novo (`contas-da-casa-v2`). Assim, a tela começa vazia mesmo que uma versão anterior tenha sido aberta neste navegador.

## Como usar

- Durante o mês, cadastre cada conta com nome, categoria, valor, vencimento, situação e observações. Não existe percentual por despesa.
- No fechamento, confira o **Total lançado** e combine quanto cada pessoa vai assumir.
- Informe somente o percentual da Pessoa 1. O percentual e o valor da Pessoa 2 são calculados automaticamente sobre o total de todas as despesas do mês.
- A divisão é independente por mês. É possível alterar ou limpar a divisão quando necessário; os valores são recalculados automaticamente se uma despesa for adicionada, editada ou excluída.
- Os nomes das duas pessoas podem ser alterados no botão **Pessoas**.
- É possível marcar as contas como pagas/pendentes, editar e excluir lançamentos, filtrar por categoria e buscar pelo nome.
- **Exportar mês (CSV)** inclui as despesas e, quando definida, a divisão total do mês.

## Como os dados são armazenados

- Os lançamentos e as divisões mensais ficam salvos no armazenamento local do navegador (`localStorage`). Não há envio de dados para servidor.
- Use **Backup** para baixar um arquivo JSON com todos os lançamentos e configurações.
- Use **Restaurar** para carregar um backup anterior. A restauração substitui a base atual do navegador.
- O armazenamento é específico do navegador e do perfil do computador em que a aplicação foi aberta. Limpar os dados do navegador pode apagar os lançamentos; mantenha backups periódicos.
- Para usar os mesmos dados em mais de um aparelho, será necessário conectar a aplicação a um banco de dados e autenticação; o GitHub Pages sozinho publica apenas os arquivos do site.
