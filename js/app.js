/* ════════════════════════════════════════════
   Expense & Budget Visualizer — app.js
   Vanilla JS · LocalStorage · Chart.js
════════════════════════════════════════════ */

'use strict';

/* ── Storage keys ── */
const KEY_TRANSACTIONS = 'ebv_transactions';
const KEY_CATEGORIES   = 'ebv_categories';

/* ── Default categories ── */
const DEFAULT_CATEGORIES = [
  { id: 'Food',      label: 'Food',      emoji: '🍔', type: 'default' },
  { id: 'Transport', label: 'Transport', emoji: '🚗', type: 'default' },
  { id: 'Fun',       label: 'Fun',       emoji: '🎉', type: 'default' },
];

/* ── Category colour map (for chart + badges) ── */
const CAT_COLORS = {
  Food:      '#f97316',
  Transport: '#3b82f6',
  Fun:       '#a855f7',
};
const CUSTOM_PALETTE = [
  '#14b8a6','#f43f5e','#eab308','#06b6d4',
  '#8b5cf6','#ec4899','#10b981','#f59e0b',
];

/* ════════════════════════════════════════════
   STATE
════════════════════════════════════════════ */
let transactions = [];   // { id, name, amount, category, date }
let categories   = [];   // { id, label, emoji, type, color? }
let pieChart     = null;

// Monthly summary navigation
const now = new Date();
let summaryYear  = now.getFullYear();
let summaryMonth = now.getMonth(); // 0-indexed

/* ════════════════════════════════════════════
   DOM REFERENCES
════════════════════════════════════════════ */
const totalBalanceEl    = document.getElementById('totalBalance');
const transactionListEl = document.getElementById('transactionList');
const emptyStateEl      = document.getElementById('emptyState');
const sortSelectEl      = document.getElementById('sortSelect');

// Form
const formEl               = document.getElementById('transactionForm');
const itemNameEl           = document.getElementById('itemName');
const amountEl             = document.getElementById('amount');
const categoryEl           = document.getElementById('category');
const transactionDateEl    = document.getElementById('transactionDate');

// Custom category modal
const openAddCategoryEl = document.getElementById('openAddCategory');
const categoryModalEl   = document.getElementById('categoryModal');
const newCategoryNameEl = document.getElementById('newCategoryName');
const saveCategoryEl    = document.getElementById('saveCategory');
const cancelCategoryEl  = document.getElementById('cancelCategory');

// Monthly summary
const prevMonthEl           = document.getElementById('prevMonth');
const nextMonthEl           = document.getElementById('nextMonth');
const monthLabelEl          = document.getElementById('monthLabel');
const summaryTotalEl        = document.getElementById('summaryTotal');
const summaryCategoryListEl = document.getElementById('summaryCategoryList');
const summaryEmptyEl        = document.getElementById('summaryEmpty');

// Chart
const chartEmptyEl          = document.getElementById('chartEmpty');
const pieChartCanvas        = document.getElementById('pieChart');

// Tabs
const tabBtns   = document.querySelectorAll('.tab-btn');
const tabPanels = document.querySelectorAll('.tab-panel');

/* ════════════════════════════════════════════
   PERSISTENCE HELPERS
════════════════════════════════════════════ */
function loadData() {
  try {
    transactions = JSON.parse(localStorage.getItem(KEY_TRANSACTIONS)) || [];
    const saved  = JSON.parse(localStorage.getItem(KEY_CATEGORIES));
    categories   = saved && saved.length ? saved : [...DEFAULT_CATEGORIES];
  } catch {
    transactions = [];
    categories   = [...DEFAULT_CATEGORIES];
  }
}

function saveTransactions() {
  localStorage.setItem(KEY_TRANSACTIONS, JSON.stringify(transactions));
}

function saveCategories() {
  localStorage.setItem(KEY_CATEGORIES, JSON.stringify(categories));
}

/* ════════════════════════════════════════════
   UTILITY
════════════════════════════════════════════ */
function formatRupiah(amount) {
  return 'Rp ' + Number(amount).toLocaleString('id-ID');
}

/* strip titik pemisah ribuan lalu parse ke angka */
function parseAmount(str) {
  // hapus semua titik (pemisah ribuan), lalu parse
  const cleaned = String(str).replace(/\./g, '').trim();
  return parseFloat(cleaned);
}

/* format angka jadi string dengan titik ribuan, e.g. 200000 → "200.000" */
function formatAmountInput(str) {
  const digits = String(str).replace(/\./g, '').replace(/\D/g, '');
  if (!digits) return '';
  return Number(digits).toLocaleString('id-ID');
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function getCategoryById(id) {
  return categories.find(c => c.id === id) || null;
}

function getCategoryColor(catId) {
  if (CAT_COLORS[catId]) return CAT_COLORS[catId];
  const cat = getCategoryById(catId);
  return cat && cat.color ? cat.color : '#14b8a6';
}

function getBadgeClass(catId) {
  if (catId === 'Food')      return 'badge-food';
  if (catId === 'Transport') return 'badge-transport';
  if (catId === 'Fun')       return 'badge-fun';
  return 'badge-custom';
}

function getIconBgClass(catId) {
  if (catId === 'Food')      return 'icon-bg-food';
  if (catId === 'Transport') return 'icon-bg-transport';
  if (catId === 'Fun')       return 'icon-bg-fun';
  return 'icon-bg-custom';
}

function getCategoryEmoji(catId) {
  const cat = getCategoryById(catId);
  return cat ? cat.emoji : '📦';
}

function formatDate(isoString) {
  const d = new Date(isoString);
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

/* return today's date as YYYY-MM-DD (required by <input type="date">) */
function getTodayString() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm   = String(d.getMonth() + 1).padStart(2, '0');
  const dd   = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/* ════════════════════════════════════════════
   SORT TRANSACTIONS
════════════════════════════════════════════ */
function getSortedTransactions() {
  const mode = sortSelectEl.value;
  const list = [...transactions];

  switch (mode) {
    case 'date-asc':
      return list.sort((a, b) => new Date(a.date) - new Date(b.date));
    case 'date-desc':
      return list.sort((a, b) => new Date(b.date) - new Date(a.date));
    case 'amount-asc':
      return list.sort((a, b) => a.amount - b.amount);
    case 'amount-desc':
      return list.sort((a, b) => b.amount - a.amount);
    case 'category-asc':
      return list.sort((a, b) => a.category.localeCompare(b.category));
    default:
      return list;
  }
}

/* ════════════════════════════════════════════
   RENDER FUNCTIONS
════════════════════════════════════════════ */

/* ── Total Balance ── */
function renderBalance() {
  const total = transactions.reduce((sum, t) => sum + t.amount, 0);
  totalBalanceEl.textContent = formatRupiah(total);
}

/* ── Transaction List ── */
function renderTransactions() {
  const sorted = getSortedTransactions();
  transactionListEl.innerHTML = '';

  if (sorted.length === 0) {
    emptyStateEl.hidden = false;
    transactionListEl.innerHTML = '';
    return;
  }
  emptyStateEl.hidden = true;

  sorted.forEach(t => {
    const li = document.createElement('li');
    li.className = 'transaction-item';
    li.setAttribute('data-id', t.id);

    li.innerHTML = `
      <div class="transaction-icon ${getIconBgClass(t.category)}">
        ${getCategoryEmoji(t.category)}
      </div>
      <div class="transaction-info">
        <div class="transaction-name">${escapeHtml(t.name)}</div>
        <div class="transaction-meta">
          <span class="badge ${getBadgeClass(t.category)}">${escapeHtml(t.category)}</span>
          <span class="transaction-date">${formatDate(t.date)}</span>
        </div>
      </div>
      <div class="transaction-right">
        <span class="transaction-amount">−${formatRupiah(t.amount)}</span>
        <button class="btn-delete" data-id="${t.id}" aria-label="Delete ${escapeHtml(t.name)}">Delete</button>
      </div>
    `;
    transactionListEl.appendChild(li);
  });
}

/* ── Category <select> options ── */
function renderCategoryOptions() {
  // keep current selection if possible
  const current = categoryEl.value;
  categoryEl.innerHTML = '<option value="">-- Select category --</option>';
  categories.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat.id;
    opt.textContent = `${cat.emoji} ${cat.label}`;
    categoryEl.appendChild(opt);
  });
  if (current) categoryEl.value = current;
}

/* ── Pie Chart ── */
function renderChart() {
  if (transactions.length === 0) {
    chartEmptyEl.hidden = false;
    pieChartCanvas.hidden = true;
    if (pieChart) { pieChart.destroy(); pieChart = null; }
    return;
  }

  chartEmptyEl.hidden = true;
  pieChartCanvas.hidden = false;

  // aggregate by category
  const totals = {};
  transactions.forEach(t => {
    totals[t.category] = (totals[t.category] || 0) + t.amount;
  });

  const labels     = Object.keys(totals);
  const data       = Object.values(totals);
  const colors     = labels.map(l => getCategoryColor(l));

  if (pieChart) {
    pieChart.data.labels          = labels;
    pieChart.data.datasets[0].data   = data;
    pieChart.data.datasets[0].backgroundColor = colors;
    pieChart.update();
  } else {
    pieChart = new Chart(pieChartCanvas, {
      type: 'pie',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: colors,
          borderColor: '#fff',
          borderWidth: 3,
          hoverOffset: 12,
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              padding: 16,
              font: { size: 13, weight: '600' },
              usePointStyle: true,
              pointStyleWidth: 10,
            }
          },
          tooltip: {
            callbacks: {
              label: ctx => {
                const total = ctx.dataset.data.reduce((a,b) => a+b, 0);
                const pct   = ((ctx.parsed / total) * 100).toFixed(1);
                return ` ${formatRupiah(ctx.parsed)} (${pct}%)`;
              }
            }
          }
        }
      }
    });
  }
}

/* ── Monthly Summary ── */
function renderMonthlySummary() {
  monthLabelEl.textContent = `${MONTH_NAMES[summaryMonth]} ${summaryYear}`;

  const filtered = transactions.filter(t => {
    const d = new Date(t.date);
    return d.getFullYear() === summaryYear && d.getMonth() === summaryMonth;
  });

  const total = filtered.reduce((sum, t) => sum + t.amount, 0);
  summaryTotalEl.textContent = formatRupiah(total);

  summaryCategoryListEl.innerHTML = '';

  if (filtered.length === 0) {
    summaryEmptyEl.hidden = false;
    return;
  }
  summaryEmptyEl.hidden = true;

  // aggregate by category
  const totals = {};
  filtered.forEach(t => {
    totals[t.category] = (totals[t.category] || 0) + t.amount;
  });

  // sort descending by amount
  const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1]);
  const max    = sorted[0][1];

  sorted.forEach(([catId, amt]) => {
    const pct    = total > 0 ? (amt / max) * 100 : 0;
    const color  = getCategoryColor(catId);
    const li     = document.createElement('li');
    li.className = 'summary-category-item';
    li.innerHTML = `
      <span class="badge ${getBadgeClass(catId)}">${escapeHtml(catId)}</span>
      <div class="summary-bar-wrap">
        <div class="summary-bar" style="width:${pct}%; background:${color};"></div>
      </div>
      <span class="summary-cat-amount">${formatRupiah(amt)}</span>
    `;
    summaryCategoryListEl.appendChild(li);
  });
}

/* ── Render everything ── */
function renderAll() {
  renderBalance();
  renderTransactions();
  renderChart();
  renderMonthlySummary();
}

/* ════════════════════════════════════════════
   FORM VALIDATION
════════════════════════════════════════════ */
function setError(fieldId, errId, msg) {
  const field = document.getElementById(fieldId);
  const err   = document.getElementById(errId);
  if (msg) {
    field.classList.add('invalid');
    err.textContent = msg;
  } else {
    field.classList.remove('invalid');
    err.textContent = '';
  }
}

function validateForm() {
  let valid = true;

  if (!itemNameEl.value.trim()) {
    setError('itemName', 'err-itemName', 'Item name is required.');
    valid = false;
  } else {
    setError('itemName', 'err-itemName', '');
  }

  const amt = parseAmount(amountEl.value);
  if (!amountEl.value.trim() || isNaN(amt) || amt <= 0) {
    setError('amount', 'err-amount', 'Enter a valid amount greater than 0.');
    valid = false;
  } else {
    setError('amount', 'err-amount', '');
  }

  if (!categoryEl.value) {
    setError('category', 'err-category', 'Please select a category.');
    valid = false;
  } else {
    setError('category', 'err-category', '');
  }

  if (!transactionDateEl.value) {
    setError('transactionDate', 'err-transactionDate', 'Please select a date.');
    valid = false;
  } else {
    setError('transactionDate', 'err-transactionDate', '');
  }

  return valid;
}

/* ════════════════════════════════════════════
   ADD TRANSACTION
════════════════════════════════════════════ */
formEl.addEventListener('submit', e => {
  e.preventDefault();
  if (!validateForm()) return;

  const t = {
    id:       generateId(),
    name:     itemNameEl.value.trim(),
    amount:   parseAmount(amountEl.value),
    category: categoryEl.value,
    // combine selected date with current time so ordering within a day is preserved
    date:     new Date(transactionDateEl.value + 'T' + new Date().toTimeString().slice(0,8)).toISOString(),
  };

  transactions.unshift(t);
  saveTransactions();
  renderAll();

  // reset form
  formEl.reset();
  setError('itemName',         'err-itemName',         '');
  setError('amount',           'err-amount',           '');
  setError('category',         'err-category',         '');
  setError('transactionDate',  'err-transactionDate',  '');
  // restore today's date as default after reset
  transactionDateEl.value = getTodayString();
});

/* ════════════════════════════════════════════
   DELETE TRANSACTION (event delegation)
════════════════════════════════════════════ */
transactionListEl.addEventListener('click', e => {
  if (!e.target.classList.contains('btn-delete')) return;
  const id = e.target.getAttribute('data-id');
  transactions = transactions.filter(t => t.id !== id);
  saveTransactions();
  renderAll();
});

/* ════════════════════════════════════════════
   SORT
════════════════════════════════════════════ */
sortSelectEl.addEventListener('change', renderTransactions);

/* ════════════════════════════════════════════
   CUSTOM CATEGORY
════════════════════════════════════════════ */
function openModal() {
  newCategoryNameEl.value = '';
  document.getElementById('err-newCategory').textContent = '';
  categoryModalEl.hidden = false;
  newCategoryNameEl.focus();
}

function closeModal() {
  categoryModalEl.hidden = true;
}

openAddCategoryEl.addEventListener('click', openModal);
cancelCategoryEl.addEventListener('click', closeModal);

categoryModalEl.addEventListener('click', e => {
  if (e.target === categoryModalEl) closeModal();
});

saveCategoryEl.addEventListener('click', () => {
  const name = newCategoryNameEl.value.trim();
  const errEl = document.getElementById('err-newCategory');

  if (!name) {
    newCategoryNameEl.classList.add('invalid');
    errEl.textContent = 'Category name is required.';
    return;
  }

  // duplicate check (case-insensitive)
  const duplicate = categories.some(c => c.label.toLowerCase() === name.toLowerCase());
  if (duplicate) {
    newCategoryNameEl.classList.add('invalid');
    errEl.textContent = 'This category already exists.';
    return;
  }

  newCategoryNameEl.classList.remove('invalid');
  errEl.textContent = '';

  // assign a colour from palette
  const customCount = categories.filter(c => c.type === 'custom').length;
  const color       = CUSTOM_PALETTE[customCount % CUSTOM_PALETTE.length];

  const newCat = {
    id:    name,        // use name as id for simplicity
    label: name,
    emoji: '📦',
    type:  'custom',
    color,
  };

  // also register color in map so chart picks it up
  CAT_COLORS[name] = color;

  categories.push(newCat);
  saveCategories();
  renderCategoryOptions();
  closeModal();
});

// Allow Enter key in modal input
newCategoryNameEl.addEventListener('keydown', e => {
  if (e.key === 'Enter') saveCategoryEl.click();
});

/* ════════════════════════════════════════════
   MONTHLY SUMMARY NAVIGATION
════════════════════════════════════════════ */
prevMonthEl.addEventListener('click', () => {
  summaryMonth--;
  if (summaryMonth < 0) { summaryMonth = 11; summaryYear--; }
  renderMonthlySummary();
});

nextMonthEl.addEventListener('click', () => {
  summaryMonth++;
  if (summaryMonth > 11) { summaryMonth = 0; summaryYear++; }
  renderMonthlySummary();
});

/* ════════════════════════════════════════════
   TABS
════════════════════════════════════════════ */
tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.getAttribute('data-tab');

    tabBtns.forEach(b => {
      b.classList.toggle('active', b === btn);
      b.setAttribute('aria-selected', b === btn);
    });

    tabPanels.forEach(panel => {
      const isTarget = panel.id === `tab-${target}`;
      panel.classList.toggle('active', isTarget);
      panel.hidden = !isTarget;
    });

    // re-render chart when switching to chart tab (fixes canvas sizing)
    if (target === 'chart') renderChart();
    if (target === 'summary') renderMonthlySummary();
  });
});

/* ════════════════════════════════════════════
   XSS PROTECTION
════════════════════════════════════════════ */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/* ════════════════════════════════════════════
   AUTO-FORMAT AMOUNT INPUT
════════════════════════════════════════════ */
amountEl.addEventListener('input', () => {
  const pos    = amountEl.selectionStart;
  const before = amountEl.value.length;
  amountEl.value = formatAmountInput(amountEl.value);
  // adjust cursor so it doesn't jump to end
  const diff = amountEl.value.length - before;
  amountEl.setSelectionRange(pos + diff, pos + diff);
});

/* ════════════════════════════════════════════
   INIT
════════════════════════════════════════════ */
(function init() {
  loadData();

  // restore custom category colors into CAT_COLORS map
  categories.forEach(cat => {
    if (cat.type === 'custom' && cat.color) {
      CAT_COLORS[cat.id] = cat.color;
    }
  });

  // set default date to today
  transactionDateEl.value = getTodayString();

  renderCategoryOptions();
  renderAll();
})();
