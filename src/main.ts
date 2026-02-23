import './style.css';

// --- Interfaces ---
interface Account {
    id: string;
    name: string;
    type: string;
    balance: number; // initial plus transactions
}

interface Transaction {
    id: string;
    type: 'income' | 'expense';
    amount: number;
    description: string;
    accountId: string;
    date: string;
}

interface AppState {
    accounts: Account[];
    transactions: Transaction[];
    theme: 'light' | 'dark';
}

// --- State Management ---
const STORAGE_KEY = 'money_manager_state';

let state: AppState = {
    accounts: [],
    transactions: [],
    theme: 'dark'
};

function loadState() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        try {
            state = JSON.parse(saved);
        } catch (e) {
            console.error('Failed to parse state:', e);
        }
    } else {
        // Check system preference for theme initially
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
            state.theme = 'light';
        }
    }
    applyTheme();
}

function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    updateUI();
}

// --- DOM Elements ---
const themeToggle = document.getElementById('theme-toggle') as HTMLButtonElement;
const exportBtn = document.getElementById('export-data') as HTMLButtonElement;
const importInput = document.getElementById('import-data') as HTMLInputElement;

const totalBalanceEl = document.getElementById('total-balance')!;
const totalIncomeEl = document.getElementById('total-income')!;
const totalExpenseEl = document.getElementById('total-expense')!;

const tabExpense = document.getElementById('tab-expense') as HTMLButtonElement;
const tabIncome = document.getElementById('tab-income') as HTMLButtonElement;
const txForm = document.getElementById('transaction-form') as HTMLFormElement;
const txTypeInput = document.getElementById('tx-type') as HTMLInputElement;
const txAmountInput = document.getElementById('tx-amount') as HTMLInputElement;
const txDescInput = document.getElementById('tx-desc') as HTMLInputElement;
const txAccountSelect = document.getElementById('tx-account') as HTMLSelectElement;

const accountListEl = document.getElementById('account-list')!;
const txListEl = document.getElementById('transaction-list')!;

const addAccountBtn = document.getElementById('add-account-btn') as HTMLButtonElement;
const addAccountForm = document.getElementById('add-account-form') as HTMLFormElement;
const cancelAccountBtn = document.getElementById('cancel-account-btn') as HTMLButtonElement;
const acctNameInput = document.getElementById('acct-name') as HTMLInputElement;
const acctTypeSelect = document.getElementById('acct-type') as HTMLSelectElement;
const acctBalanceInput = document.getElementById('acct-balance') as HTMLInputElement;


// --- Theme Logic ---
function applyTheme() {
    document.documentElement.setAttribute('data-theme', state.theme);
    const icon = themeToggle.querySelector('ion-icon');
    if (icon) {
        icon.setAttribute('name', state.theme === 'dark' ? 'sunny' : 'moon');
    }
}

themeToggle.addEventListener('click', () => {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    applyTheme();
    saveState();
});

// --- Calculations ---
function getAccountBalance(accountId: string): number {
    const acct = state.accounts.find(a => a.id === accountId);
    if (!acct) return 0;

    const txs = state.transactions.filter(t => t.accountId === accountId);
    const income = txs.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expense = txs.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

    return acct.balance + income - expense;
}

function calculateTotals() {
    let income = 0;
    let expense = 0;
    let balance = 0;

    state.accounts.forEach(a => {
        balance += getAccountBalance(a.id);
    });

    state.transactions.forEach(t => {
        if (t.type === 'income') income += t.amount;
        if (t.type === 'expense') expense += t.amount;
    });

    return { income, expense, balance };
}

// --- UI Updates ---
function formatCurrency(amount: number) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR'
    }).format(amount);
}

function updateUI() {
    // Update totals
    const totals = calculateTotals();
    totalBalanceEl.textContent = formatCurrency(totals.balance);
    totalIncomeEl.textContent = formatCurrency(totals.income);
    totalExpenseEl.textContent = formatCurrency(totals.expense);

    // Update account select
    txAccountSelect.innerHTML = '';
    if (state.accounts.length === 0) {
        txAccountSelect.innerHTML = '<option value="" disabled selected>No accounts found</option>';
    } else {
        state.accounts.forEach(a => {
            const opt = document.createElement('option');
            opt.value = a.id;
            opt.textContent = a.name;
            txAccountSelect.appendChild(opt);
        });
    }

    // Render accounts list
    accountListEl.innerHTML = '';
    if (state.accounts.length === 0) {
        accountListEl.innerHTML = '<div class="empty-state"><ion-icon name="wallet-outline"></ion-icon><p>No accounts yet. Add one to start.</p></div>';
    } else {
        state.accounts.forEach(a => {
            const item = document.createElement('div');
            item.className = 'account-item';
            item.innerHTML = `
        <div class="account-info">
          <h5>${a.name}</h5>
          <p>${a.type.charAt(0).toUpperCase() + a.type.slice(1)}</p>
        </div>
        <div class="account-balance">${formatCurrency(getAccountBalance(a.id))}</div>
      `;
            accountListEl.appendChild(item);
        });
    }

    // Render transactions
    txListEl.innerHTML = '';
    if (state.transactions.length === 0) {
        txListEl.innerHTML = '<div class="empty-state"><ion-icon name="receipt-outline"></ion-icon><p>No recent transactions.</p></div>';
    } else {
        // Show newest first
        [...state.transactions].reverse().forEach(t => {
            const acct = state.accounts.find(a => a.id === t.accountId);
            const item = document.createElement('div');
            item.className = 'transaction-item tx-' + t.type;

            const iconName = t.type === 'income' ? 'arrow-down' : 'arrow-up';
            const sign = t.type === 'income' ? '+' : '-';

            item.innerHTML = `
        <div class="transaction-info">
          <div class="transaction-icon">
            <ion-icon name="${iconName}"></ion-icon>
          </div>
          <div class="transaction-details">
            <h4>${t.description}</h4>
            <p>${acct ? acct.name : 'Unknown Account'} • ${new Date(t.date).toLocaleDateString()}</p>
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 1rem;">
          <div class="transaction-amount">${sign}${formatCurrency(t.amount)}</div>
          <div class="transaction-actions">
            <button class="btn-icon delete-tx-btn" data-id="${t.id}" style="width: 2rem; height: 2rem;">
              <ion-icon name="trash-outline" style="color: var(--danger-color);"></ion-icon>
            </button>
          </div>
        </div>
      `;
            txListEl.appendChild(item);
        });

        // Attach delete handlers
        document.querySelectorAll('.delete-tx-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = (e.currentTarget as HTMLButtonElement).dataset.id;
                if (id) {
                    state.transactions = state.transactions.filter(t => t.id !== id);
                    saveState();
                }
            });
        });
    }
}

// --- Event Listeners ---
// Tabs
tabExpense.addEventListener('click', () => {
    tabExpense.classList.add('active');
    tabIncome.classList.remove('active');
    txTypeInput.value = 'expense';
});

tabIncome.addEventListener('click', () => {
    tabIncome.classList.add('active');
    tabExpense.classList.remove('active');
    txTypeInput.value = 'income';
});

// Add Account
addAccountBtn.addEventListener('click', () => {
    addAccountForm.style.display = 'block';
});

cancelAccountBtn.addEventListener('click', () => {
    addAccountForm.style.display = 'none';
    addAccountForm.reset();
});

addAccountForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const newAccount: Account = {
        id: crypto.randomUUID(),
        name: acctNameInput.value.trim(),
        type: acctTypeSelect.value,
        balance: parseFloat(acctBalanceInput.value) || 0
    };

    state.accounts.push(newAccount);
    saveState();

    addAccountForm.reset();
    addAccountForm.style.display = 'none';
});

// Add Transaction
txForm.addEventListener('submit', (e) => {
    e.preventDefault();

    if (state.accounts.length === 0) {
        alert("Please create an account first.");
        return;
    }

    const newTx: Transaction = {
        id: crypto.randomUUID(),
        type: txTypeInput.value as 'income' | 'expense',
        amount: parseFloat(txAmountInput.value),
        description: txDescInput.value.trim(),
        accountId: txAccountSelect.value,
        date: new Date().toISOString()
    };

    state.transactions.push(newTx);
    saveState();

    txAmountInput.value = '';
    txDescInput.value = '';
});

// Export Data
exportBtn.addEventListener('click', () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `money_manager_backup_${new Date().toISOString().split('T')[0]}.json`);
    dlAnchorElem.click();
});

// Import Data
importInput.addEventListener('change', (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const importedState = JSON.parse(event.target?.result as string);
            if (importedState && Array.isArray(importedState.accounts) && Array.isArray(importedState.transactions)) {
                state = {
                    ...state,
                    accounts: importedState.accounts,
                    transactions: importedState.transactions,
                };
                saveState();
                alert('Data imported successfully!');
            } else {
                alert('Invalid backup file format.');
            }
        } catch (err) {
            console.error(err);
            alert('Error parsing backup file.');
        }
        // reset input
        importInput.value = '';
    };
    reader.readAsText(file);
});


// --- Init ---
loadState();
updateUI();
