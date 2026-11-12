'use strict';

const STORAGE_KEY = 'contas-da-casa-v2';
const PREVIOUS_DEFAULT_PERSON = ['Nai', 'ara'].join('');
const MONTHS = [
  ['01', 'Janeiro'], ['02', 'Fevereiro'], ['03', 'Março'], ['04', 'Abril'],
  ['05', 'Maio'], ['06', 'Junho'], ['07', 'Julho'], ['08', 'Agosto'],
  ['09', 'Setembro'], ['10', 'Outubro'], ['11', 'Novembro'], ['12', 'Dezembro']
];
const CATEGORIES = ['Moradia', 'Contas e serviços', 'Alimentação', 'Transporte', 'Saúde', 'Lazer', 'Cartão', 'Profissional', 'Impostos e taxas', 'Outros'];
const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const percentFormat = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });

function localMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function initialState() {
  return {
    version: 3,
    people: { one: 'Rafael', two: 'Marbia' },
    expenses: [],
    monthShares: {},
    selectedMonth: localMonth()
  };
}
function normalizePeople(people, defaults) {
  const normalized = { ...defaults, ...(people || {}) };
  if (normalized.two === PREVIOUS_DEFAULT_PERSON) normalized.two = 'Marbia';
  return normalized;
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialState();
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.expenses) || !parsed.people) return initialState();
    const defaults = initialState();
    return {
      ...defaults,
      ...parsed,
      version: 3,
      people: normalizePeople(parsed.people, defaults.people),
      expenses: parsed.expenses.map(({ splitPercent, archived, snapshot, source, ...item }) => item),
      monthShares: parsed.monthShares && typeof parsed.monthShares === 'object' ? parsed.monthShares : {}
    };
  } catch (error) {
    console.warn('Não foi possível ler os dados salvos. Uma base vazia será criada.', error);
    return initialState();
  }
}
let state = loadState();
let toastTimer;

const $ = (id) => document.getElementById(id);
const dom = {
  monthPicker: $('monthPicker'), expenseForm: $('expenseForm'), editingId: $('editingId'), expenseName: $('expenseName'),
  expenseCategory: $('expenseCategory'), expenseValue: $('expenseValue'), expenseDueDate: $('expenseDueDate'),
  expenseStatus: $('expenseStatus'), expenseNotes: $('expenseNotes'), saveExpenseButton: $('saveExpenseButton'),
  cancelEditButton: $('cancelEditButton'), formTitle: $('formTitle'), expenseTableBody: $('expenseTableBody'),
  emptyState: $('emptyState'), searchExpenses: $('searchExpenses'), filterCategory: $('filterCategory'),
  filterStatus: $('filterStatus'), toast: $('toast'), settingsDialog: $('settingsDialog'), personOneInput: $('personOneInput'),
  personTwoInput: $('personTwoInput'), restoreFile: $('restoreFile'), monthlySplitForm: $('monthlySplitForm'),
  monthPercent: $('monthPercent'), monthlySplitPreview: $('monthlySplitPreview'), clearMonthlySplitButton: $('clearMonthlySplitButton')
};

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    showToast('Não foi possível salvar. Faça um backup e verifique o espaço do navegador.');
    console.error(error);
  }
}
function showToast(message) {
  dom.toast.textContent = message;
  dom.toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => dom.toast.classList.remove('show'), 2600);
}
function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}
function roundMoney(value) { return Math.round((Number(value) + Number.EPSILON) * 100) / 100; }
function currentMonthSplitPercent() {
  const split = state.monthShares?.[state.selectedMonth];
  if (!split || !Number.isFinite(Number(split.onePercent))) return null;
  return Math.min(100, Math.max(0, Number(split.onePercent)));
}
function calculateMonthlyShares(total, onePercent) {
  const first = roundMoney(total * onePercent / 100);
  return { first, second: roundMoney(total - first) };
}
function currentMonthExpenses() {
  return state.expenses.filter((item) => item.month === state.selectedMonth);
}
function activeYearExpenses(year) {
  return state.expenses.filter((item) => item.month.startsWith(`${year}-`));
}
function formatMonth(month) {
  const [year, number] = month.split('-');
  const label = MONTHS.find(([n]) => n === number)?.[1] || month;
  return `${label} de ${year}`;
}
function formatDate(value) {
  if (!value) return '—';
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}
function currentFilterRows() {
  const query = dom.searchExpenses.value.trim().toLocaleLowerCase('pt-BR');
  const category = dom.filterCategory.value;
  const status = dom.filterStatus.value;
  return currentMonthExpenses().filter((item) => {
    const matchesQuery = !query || `${item.name} ${item.category} ${item.notes || ''}`.toLocaleLowerCase('pt-BR').includes(query);
    return matchesQuery && (!category || item.category === category) && (!status || item.status === status);
  }).sort((a, b) => {
    const dateA = a.dueDate || '9999-12-31';
    const dateB = b.dueDate || '9999-12-31';
    return dateA.localeCompare(dateB) || a.name.localeCompare(b.name, 'pt-BR');
  });
}
function updatePeopleLabels() {
  $('personOneLabel').textContent = `${state.people.one} • divisão mensal`;
  $('personTwoLabel').textContent = `${state.people.two} • divisão mensal`;
  $('splitOneName').textContent = state.people.one;
  $('splitTwoName').textContent = state.people.two;
  $('monthlyPercentLabel').textContent = `Qual percentual ficará com ${state.people.one}?`;
  $('personOneInput').value = state.people.one;
  $('personTwoInput').value = state.people.two;
}
function updateSummary() {
  const rows = currentMonthExpenses();
  const total = roundMoney(rows.reduce((sum, item) => sum + item.value, 0));
  const splitPercent = currentMonthSplitPercent();
  const hasSplit = splitPercent !== null;
  const shares = hasSplit ? calculateMonthlyShares(total, splitPercent) : null;
  const pending = rows.filter((item) => item.status === 'pendente');
  const pendingTotal = roundMoney(pending.reduce((sum, item) => sum + item.value, 0));
  const twoPercent = hasSplit ? 100 - splitPercent : null;

  $('totalMonth').textContent = money.format(total);
  $('expenseCount').textContent = `${rows.length} ${rows.length === 1 ? 'lançamento' : 'lançamentos'} no mês`;
  $('personOneTotal').textContent = hasSplit ? money.format(shares.first) : '—';
  $('personTwoTotal').textContent = hasSplit ? money.format(shares.second) : '—';
  $('personOnePercent').textContent = hasSplit ? `${percentFormat.format(splitPercent)}% do total` : 'Aguardando fechamento';
  $('personTwoPercent').textContent = hasSplit ? `${percentFormat.format(twoPercent)}% do total` : 'Aguardando fechamento';
  $('pendingTotal').textContent = money.format(pendingTotal);
  $('pendingCount').textContent = `${pending.length} ${pending.length === 1 ? 'conta pendente' : 'contas pendentes'}`;
  $('splitTotalLabel').textContent = `Total lançado: ${money.format(total)}`;
  $('splitBarOne').style.width = `${hasSplit ? splitPercent : 0}%`;
  $('splitBarTwo').style.width = `${hasSplit ? twoPercent : 0}%`;
  $('splitOneShare').textContent = hasSplit ? `${percentFormat.format(splitPercent)}%` : 'A definir';
  $('splitTwoShare').textContent = hasSplit ? `${percentFormat.format(twoPercent)}%` : 'A definir';
  $('splitStatus').textContent = hasSplit ? 'Divisão mensal definida' : 'Divisão ainda não definida';
  $('splitStatus').classList.toggle('is-defined', hasSplit);
  $('monthPercent').value = hasSplit ? String(splitPercent) : '';
  $('clearMonthlySplitButton').hidden = !hasSplit;
}
function updateCategoryBreakdown() {
  const rows = currentMonthExpenses();
  const values = new Map();
  rows.forEach((item) => values.set(item.category, (values.get(item.category) || 0) + item.value));
  const list = [...values.entries()].sort((a, b) => b[1] - a[1]);
  const total = rows.reduce((sum, item) => sum + item.value, 0);
  if (!list.length) {
    $('categoryBreakdown').innerHTML = '<div class="empty-small">Adicione despesas para visualizar os gastos por categoria.</div>';
  } else {
    $('categoryBreakdown').innerHTML = list.slice(0, 6).map(([category, value]) => {
      const pct = total ? value / total * 100 : 0;
      return `<div class="category-row"><div class="category-meta"><span>${escapeHtml(category)}</span><strong>${money.format(value)}</strong></div><div class="category-track"><div class="category-fill" style="width:${pct.toFixed(2)}%"></div></div></div>`;
    }).join('');
  }
  const largest = [...rows].sort((a, b) => b.value - a.value)[0];
  $('largestExpense').textContent = largest ? largest.name : '—';
  $('largestExpenseValue').textContent = largest ? money.format(largest.value) : 'Nenhum lançamento';
}
function renderTable() {
  const rows = currentFilterRows();
  dom.expenseTableBody.innerHTML = rows.map((item) => {
    const statusLabel = item.status === 'pago' ? 'Pago' : item.status === 'pendente' ? 'Pendente' : 'Não informado';
    const statusClass = item.status === 'pago' ? 'status-pago' : item.status === 'pendente' ? 'status-pendente' : '';
    const due = item.dueDate ? `<span class="expense-note">Vence em ${formatDate(item.dueDate)}</span>` : '';
    const note = item.notes ? `<span class="expense-note">${escapeHtml(item.notes)}</span>` : '';
    const statusCell = item.status === 'nao_informado' ? '<span class="category-pill">Não informado</span>' : `<span class="status-pill ${statusClass}">${statusLabel}</span>`;
    return `<tr>
      <td><span class="expense-name">${escapeHtml(item.name)}</span>${due || note}</td>
      <td><span class="category-pill">${escapeHtml(item.category)}</span></td>
      <td class="money-cell">${money.format(item.value)}</td>
      <td>${statusCell}</td>
      <td><div class="row-actions"><button class="row-action" type="button" data-action="edit" data-id="${escapeHtml(item.id)}" title="Editar" aria-label="Editar ${escapeHtml(item.name)}">✎</button><button class="row-action" type="button" data-action="toggle" data-id="${escapeHtml(item.id)}" title="${item.status === 'pago' ? 'Marcar como pendente' : 'Marcar como pago'}" aria-label="Alternar pagamento">✓</button><button class="row-action delete" type="button" data-action="delete" data-id="${escapeHtml(item.id)}" title="Excluir" aria-label="Excluir ${escapeHtml(item.name)}">×</button></div></td>
    </tr>`;
  }).join('');
  dom.emptyState.hidden = rows.length > 0;
  $('tableCount').textContent = `${rows.length} ${rows.length === 1 ? 'despesa exibida' : 'despesas exibidas'}`;
  $('tableTotal').textContent = `Total: ${money.format(rows.reduce((sum, item) => sum + item.value, 0))}`;
  $('listSubtitle').textContent = `${formatMonth(state.selectedMonth)} • despesas ativas do mês`;
}
function renderAnnual() {
  const year = Number(state.selectedMonth.slice(0, 4));
  const rows = activeYearExpenses(year);
  const annualTotal = rows.reduce((sum, item) => sum + item.value, 0);
  $('annualTotal').textContent = money.format(annualTotal);
  $('monthsGrid').innerHTML = MONTHS.map(([number, label]) => {
    const monthKey = `${year}-${number}`;
    const monthRows = rows.filter((item) => item.month === monthKey);
    const total = monthRows.reduce((sum, item) => sum + item.value, 0);
    return `<button type="button" class="month-tile ${monthKey === state.selectedMonth ? 'active' : ''}" data-month="${monthKey}"><span>${label}</span><strong>${money.format(total)}</strong><small>${monthRows.length} ${monthRows.length === 1 ? 'despesa' : 'despesas'}</small></button>`;
  }).join('');
}
function renderAll() {
  dom.monthPicker.value = state.selectedMonth;
  updatePeopleLabels();
  updateSummary();
  updateCategoryBreakdown();
  renderTable();
  renderAnnual();
  updateMonthlySplitPreview();
}
function updateMonthlySplitPreview() {
  const rows = currentMonthExpenses();
  const total = roundMoney(rows.reduce((sum, item) => sum + item.value, 0));
  const value = dom.monthPercent.value;
  const percent = Number(value);
  $('saveMonthlySplitButton').disabled = rows.length === 0;
  if (!rows.length) {
    dom.monthlySplitPreview.textContent = 'Adicione as despesas do mês. A divisão será feita sobre o total acumulado.';
    return;
  }
  if (value === '' || !Number.isFinite(percent) || percent < 0 || percent > 100) {
    dom.monthlySplitPreview.textContent = `Total atual: ${money.format(total)}. Informe de 0% a 100% para simular a divisão.`;
    return;
  }
  const shares = calculateMonthlyShares(total, percent);
  dom.monthlySplitPreview.innerHTML = `<strong>${escapeHtml(state.people.one)} (${percentFormat.format(percent)}%):</strong> ${money.format(shares.first)} &nbsp;·&nbsp; <strong>${escapeHtml(state.people.two)} (${percentFormat.format(100 - percent)}%):</strong> ${money.format(shares.second)}`;
}
function resetForm() {
  dom.expenseForm.reset();
  dom.editingId.value = '';
  dom.expenseStatus.value = 'pendente';
  $('formTitle').textContent = 'Adicionar despesa';
  dom.saveExpenseButton.textContent = 'Adicionar despesa';
  dom.cancelEditButton.hidden = true;
}
function editExpense(id) {
  const item = state.expenses.find((expense) => expense.id === id);
  if (!item) return;
  dom.editingId.value = item.id;
  dom.expenseName.value = item.name;
  dom.expenseCategory.value = item.category;
  dom.expenseValue.value = item.value.toFixed(2);
  dom.expenseDueDate.value = item.dueDate || '';
  dom.expenseStatus.value = item.status === 'pago' ? 'pago' : 'pendente';
  dom.expenseNotes.value = item.notes || '';
  $('formTitle').textContent = 'Editar despesa';
  dom.saveExpenseButton.textContent = 'Salvar alterações';
  dom.cancelEditButton.hidden = false;
  $('expenseFormPanel').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function changeMonth(month) {
  if (!/^\d{4}-\d{2}$/.test(month)) return;
  state.selectedMonth = month;
  saveState();
  dom.searchExpenses.value = '';
  dom.filterCategory.value = '';
  dom.filterStatus.value = '';
  resetForm();
  renderAll();
}
function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a'); link.href = url; link.download = filename;
  document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
}
function exportBackup() {
  const backup = { ...state, backupCreatedAt: new Date().toISOString(), app: 'Contas da Casa' };
  downloadFile(`backup-contas-da-casa-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(backup, null, 2), 'application/json;charset=utf-8');
  showToast('Backup exportado. Guarde o arquivo em local seguro.');
}
function csvCell(value) { return `"${String(value ?? '').replace(/"/g, '""')}"`; }
function exportMonthCsv() {
  const rows = currentMonthExpenses();
  const total = roundMoney(rows.reduce((sum, item) => sum + item.value, 0));
  const splitPercent = currentMonthSplitPercent();
  const header = ['Tipo', 'Despesa', 'Categoria', 'Valor (R$)', 'Vencimento', 'Situação', 'Observações'];
  const data = rows.map((item) => ['Despesa', item.name, item.category, item.value.toFixed(2), item.dueDate, item.status, item.notes || '']);
  data.push(['TOTAL DO MÊS', '', '', total.toFixed(2), '', '', '']);
  if (splitPercent !== null) {
    const shares = calculateMonthlyShares(total, splitPercent);
    data.push(['DIVISÃO MENSAL', `${state.people.one} (${percentFormat.format(splitPercent)}%)`, '', shares.first.toFixed(2), '', '', '']);
    data.push(['DIVISÃO MENSAL', `${state.people.two} (${percentFormat.format(100 - splitPercent)}%)`, '', shares.second.toFixed(2), '', '', '']);
  } else {
    data.push(['DIVISÃO MENSAL', 'Ainda não definida', '', '', '', '', '']);
  }
  const csv = '\uFEFF' + [header, ...data].map((line) => line.map(csvCell).join(';')).join('\r\n');
  downloadFile(`despesas-${state.selectedMonth}.csv`, csv, 'text/csv;charset=utf-8');
  showToast('CSV do mês exportado.');
}
function validateImportedState(data) {
  return data && Array.isArray(data.expenses) && data.people && typeof data.people.one === 'string' && typeof data.people.two === 'string' && data.expenses.every((item) => item && typeof item.name === 'string' && /^\d{4}-\d{2}$/.test(item.month) && Number.isFinite(Number(item.value)) && Number(item.value) >= 0) && (!data.monthShares || typeof data.monthShares === 'object');
}
function restoreBackup(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      if (!validateImportedState(parsed)) throw new Error('Formato inválido');
      if (!confirm('Restaurar este backup substituirá os dados atuais neste navegador. Deseja continuar?')) return;
      state = {
        ...initialState(), ...parsed,
        version: 3,
        people: normalizePeople(parsed.people, initialState().people),
        expenses: parsed.expenses.map(({ splitPercent, archived, snapshot, source, ...item }) => item),
        monthShares: parsed.monthShares && typeof parsed.monthShares === 'object' ? parsed.monthShares : {}
      };
      saveState(); resetForm(); renderAll(); showToast('Backup restaurado com sucesso.');
    } catch (error) {
      showToast('Arquivo inválido. Selecione um backup JSON deste sistema.');
    } finally { dom.restoreFile.value = ''; }
  };
  reader.readAsText(file);
}

// Eventos do formulário e dos controles.
dom.expenseForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const name = dom.expenseName.value.trim();
  const value = roundMoney(Number(dom.expenseValue.value));
  if (!name || !Number.isFinite(value) || value <= 0) {
    showToast('Confira o nome e o valor da despesa.'); return;
  }
  const payload = {
    name, category: dom.expenseCategory.value, value,
    month: state.selectedMonth, dueDate: dom.expenseDueDate.value, status: dom.expenseStatus.value,
    notes: dom.expenseNotes.value.trim()
  };
  const editingId = dom.editingId.value;
  if (editingId) {
    const index = state.expenses.findIndex((item) => item.id === editingId);
    if (index >= 0) state.expenses[index] = { ...state.expenses[index], ...payload };
    showToast('Despesa atualizada.');
  } else {
    state.expenses.push({ ...payload, id: `exp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, createdAt: new Date().toISOString() });
    showToast('Despesa adicionada.');
  }
  saveState(); resetForm(); renderAll();
});
dom.cancelEditButton.addEventListener('click', resetForm);
dom.monthlySplitForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const rows = currentMonthExpenses();
  const rawPercent = dom.monthPercent.value;
  const percent = Number(rawPercent);
  if (!rows.length) { showToast('Adicione as despesas antes de definir a divisão.'); return; }
  if (rawPercent === '' || !Number.isFinite(percent) || percent < 0 || percent > 100) {
    showToast('Informe um percentual entre 0% e 100%.'); return;
  }
  state.monthShares = state.monthShares || {};
  state.monthShares[state.selectedMonth] = { onePercent: Math.round(percent * 100) / 100, updatedAt: new Date().toISOString() };
  saveState(); renderAll(); showToast('Divisão do mês salva.');
});
dom.monthPercent.addEventListener('input', updateMonthlySplitPreview);
dom.clearMonthlySplitButton.addEventListener('click', () => {
  if (!state.monthShares?.[state.selectedMonth]) return;
  if (!confirm('Limpar a divisão deste mês? Os lançamentos e seus valores serão mantidos.')) return;
  delete state.monthShares[state.selectedMonth];
  saveState(); renderAll(); showToast('Divisão mensal removida.');
});
dom.monthPicker.addEventListener('change', () => changeMonth(dom.monthPicker.value));
$('previousMonth').addEventListener('click', () => {
  const date = new Date(`${state.selectedMonth}-01T12:00:00`); date.setMonth(date.getMonth() - 1);
  changeMonth(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
});
$('nextMonth').addEventListener('click', () => {
  const date = new Date(`${state.selectedMonth}-01T12:00:00`); date.setMonth(date.getMonth() + 1);
  changeMonth(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
});
[dom.searchExpenses, dom.filterCategory, dom.filterStatus].forEach((el) => el.addEventListener('input', renderTable));
dom.expenseTableBody.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const { action, id } = button.dataset;
  const item = state.expenses.find((expense) => expense.id === id);
  if (!item) return;
  if (action === 'edit') editExpense(id);
  if (action === 'toggle') {
    if (item.status === 'nao_informado') item.status = 'pago';
    else item.status = item.status === 'pago' ? 'pendente' : 'pago';
    saveState(); renderAll(); showToast(item.status === 'pago' ? 'Conta marcada como paga.' : 'Conta marcada como pendente.');
  }
  if (action === 'delete' && confirm(`Excluir a despesa "${item.name}"?`)) {
    state.expenses = state.expenses.filter((expense) => expense.id !== id);
    saveState(); renderAll(); showToast('Despesa excluída.');
  }
});
$('monthsGrid').addEventListener('click', (event) => {
  const button = event.target.closest('button[data-month]');
  if (button) changeMonth(button.dataset.month);
});
$('settingsButton').addEventListener('click', () => { updatePeopleLabels(); dom.settingsDialog.showModal(); });
$('saveSettingsButton').addEventListener('click', (event) => {
  event.preventDefault();
  const one = dom.personOneInput.value.trim(); const two = dom.personTwoInput.value.trim();
  if (!one || !two || one.toLocaleLowerCase('pt-BR') === two.toLocaleLowerCase('pt-BR')) { showToast('Informe dois nomes diferentes.'); return; }
  state.people = { one, two }; saveState(); updatePeopleLabels(); dom.settingsDialog.close(); renderAll(); showToast('Nomes atualizados.');
});
document.querySelectorAll('.close-dialog').forEach((button) => button.addEventListener('click', () => dom.settingsDialog.close()));
$('backupButton').addEventListener('click', exportBackup);
$('restoreButton').addEventListener('click', () => dom.restoreFile.click());
dom.restoreFile.addEventListener('change', () => { if (dom.restoreFile.files[0]) restoreBackup(dom.restoreFile.files[0]); });
$('exportCsvButton').addEventListener('click', exportMonthCsv);

// Inicialização: o sistema começa vazio na primeira abertura desta versão.
if (!localStorage.getItem(STORAGE_KEY)) saveState();
const categoryOptions = CATEGORIES.map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`).join('');
dom.filterCategory.insertAdjacentHTML('beforeend', categoryOptions);
renderAll();
