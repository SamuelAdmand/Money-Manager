import './style.css';

// --- Interfaces ---
interface Account {
    id: string;
    name: string;
    type: string;
    balance: number;
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

const txListEl = document.getElementById('transaction-list')!;

// Desktop Forms
const tabExpenseDesktop = document.getElementById('tab-expense-desktop') as HTMLButtonElement;
const tabIncomeDesktop = document.getElementById('tab-income-desktop') as HTMLButtonElement;
const txFormDesktop = document.getElementById('transaction-form-desktop') as HTMLFormElement;
const txTypeInputDesktop = document.getElementById('tx-type-desktop') as HTMLInputElement;
const txAmountInputDesktop = document.getElementById('tx-amount-desktop') as HTMLInputElement;
const txDescInputDesktop = document.getElementById('tx-desc-desktop') as HTMLInputElement;
const txAccountSelectDesktop = document.getElementById('tx-account-desktop') as HTMLSelectElement;

const accountListDesktopEl = document.getElementById('account-list-desktop')!;
const addAccountBtnDesktop = document.getElementById('add-account-btn-desktop') as HTMLButtonElement;
const addAccountFormDesktop = document.getElementById('add-account-form-desktop') as HTMLFormElement;
const cancelAccountBtnDesktop = document.getElementById('cancel-account-btn-desktop') as HTMLButtonElement;
const acctNameInputDesktop = document.getElementById('acct-name-desktop') as HTMLInputElement;
const acctTypeSelectDesktop = document.getElementById('acct-type-desktop') as HTMLSelectElement;
const acctBalanceInputDesktop = document.getElementById('acct-balance-desktop') as HTMLInputElement;

// Mobile Forms & Modal
const txModal = document.getElementById('tx-modal')!;
const closeModalBtn = document.getElementById('close-modal-btn') as HTMLButtonElement;
const mobileAddBtn = document.getElementById('mobile-add-btn') as HTMLButtonElement;

const tabExpenseMobile = document.getElementById('tab-expense-mobile') as HTMLButtonElement;
const tabIncomeMobile = document.getElementById('tab-income-mobile') as HTMLButtonElement;
const txFormMobile = document.getElementById('transaction-form-mobile') as HTMLFormElement;
const txTypeInputMobile = document.getElementById('tx-type-mobile') as HTMLInputElement;
const txAmountInputMobile = document.getElementById('tx-amount-mobile') as HTMLInputElement;
const txDescInputMobile = document.getElementById('tx-desc-mobile') as HTMLInputElement;
const txAccountSelectMobile = document.getElementById('tx-account-mobile') as HTMLSelectElement;

const accountListMobileEl = document.getElementById('account-list-mobile')!;
const addAccountBtnMobile = document.getElementById('add-account-btn-mobile') as HTMLButtonElement;
const addAccountFormMobile = document.getElementById('add-account-form-mobile') as HTMLFormElement;
const cancelAccountBtnMobile = document.getElementById('cancel-account-btn-mobile') as HTMLButtonElement;
const acctNameInputMobile = document.getElementById('acct-name-mobile') as HTMLInputElement;
const acctTypeSelectMobile = document.getElementById('acct-type-mobile') as HTMLSelectElement;
const acctBalanceInputMobile = document.getElementById('acct-balance-mobile') as HTMLInputElement;

// Mobile Nav Bar Switching
const navHome = document.getElementById('nav-home')!;
const navAccounts = document.getElementById('nav-accounts')!;
const homeView = document.getElementById('home-view')!;
const transactionsContainer = document.getElementById('transactions-container')!;
const accountsMobileView = document.getElementById('accounts-mobile-view')!;


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

    // Update account selects (both desktop and mobile)
    const renderOptions = () => {
        if (state.accounts.length === 0) {
            return '<option value="" disabled selected>No accounts found</option>';
        }
        return state.accounts.map(a => `<option value="${a.id}">${a.name}</option>`).join('');
    };

    txAccountSelectDesktop.innerHTML = renderOptions();
    txAccountSelectMobile.innerHTML = renderOptions();

    // Render accounts list function
    const renderAccounts = (container: HTMLElement) => {
        container.innerHTML = '';
        if (state.accounts.length === 0) {
            container.innerHTML = '<div class="empty-state"><ion-icon name="wallet-outline"></ion-icon><p>No accounts yet.</p></div>';
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
                container.appendChild(item);
            });
        }
    };

    renderAccounts(accountListDesktopEl);
    renderAccounts(accountListMobileEl);

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


// --- Transaction Event Handlers ---
function setupTransactionForm(
    form: HTMLFormElement,
    typeInput: HTMLInputElement,
    amountInput: HTMLInputElement,
    descInput: HTMLInputElement,
    accountSelect: HTMLSelectElement,
    onSuccess?: () => void
) {
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        if (state.accounts.length === 0) {
            alert("Please create an account first.");
            return;
        }
        const newTx: Transaction = {
            id: crypto.randomUUID(),
            type: typeInput.value as 'income' | 'expense',
            amount: parseFloat(amountInput.value),
            description: descInput.value.trim(),
            accountId: accountSelect.value,
            date: new Date().toISOString()
        };
        state.transactions.push(newTx);
        saveState();

        amountInput.value = '';
        descInput.value = '';

        if (onSuccess) onSuccess();
    });
}

// Bind Desktop Add TX
setupTransactionForm(txFormDesktop, txTypeInputDesktop, txAmountInputDesktop, txDescInputDesktop, txAccountSelectDesktop);

// Bind Mobile Modal Add TX
setupTransactionForm(txFormMobile, txTypeInputMobile, txAmountInputMobile, txDescInputMobile, txAccountSelectMobile, () => {
    txModal.classList.remove('open');
});

// Setup Tabs Desktop
tabExpenseDesktop.addEventListener('click', () => { tabExpenseDesktop.classList.add('active'); tabIncomeDesktop.classList.remove('active'); txTypeInputDesktop.value = 'expense'; });
tabIncomeDesktop.addEventListener('click', () => { tabIncomeDesktop.classList.add('active'); tabExpenseDesktop.classList.remove('active'); txTypeInputDesktop.value = 'income'; });

// Setup Tabs Mobile
tabExpenseMobile.addEventListener('click', () => { tabExpenseMobile.classList.add('active'); tabIncomeMobile.classList.remove('active'); txTypeInputMobile.value = 'expense'; });
tabIncomeMobile.addEventListener('click', () => { tabIncomeMobile.classList.add('active'); tabExpenseMobile.classList.remove('active'); txTypeInputMobile.value = 'income'; });


// --- Account Event Handlers ---
function setupAccountForm(
    btn: HTMLButtonElement,
    form: HTMLFormElement,
    cancelBtn: HTMLButtonElement,
    nameInput: HTMLInputElement,
    typeSelect: HTMLSelectElement,
    balanceInput: HTMLInputElement
) {
    btn.addEventListener('click', () => { form.style.display = 'block'; });
    cancelBtn.addEventListener('click', () => { form.style.display = 'none'; form.reset(); });

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const newAccount: Account = {
            id: crypto.randomUUID(),
            name: nameInput.value.trim(),
            type: typeSelect.value,
            balance: parseFloat(balanceInput.value) || 0
        };
        state.accounts.push(newAccount);
        saveState();
        form.reset();
        form.style.display = 'none';
    });
}

// Bind Account Handlers
setupAccountForm(addAccountBtnDesktop, addAccountFormDesktop, cancelAccountBtnDesktop, acctNameInputDesktop, acctTypeSelectDesktop, acctBalanceInputDesktop);
setupAccountForm(addAccountBtnMobile, addAccountFormMobile, cancelAccountBtnMobile, acctNameInputMobile, acctTypeSelectMobile, acctBalanceInputMobile);


// --- Mobile Navigation Logic ---
mobileAddBtn.addEventListener('click', () => {
    txModal.classList.add('open');
});

closeModalBtn.addEventListener('click', () => {
    txModal.classList.remove('open');
});

navHome.addEventListener('click', (e) => {
    e.preventDefault();
    navHome.classList.add('active');
    navAccounts.classList.remove('active');

    homeView.style.display = 'grid'; // Dashboard cards mostly grid
    transactionsContainer.style.display = 'block';
    accountsMobileView.style.display = 'none';
});

navAccounts.addEventListener('click', (e) => {
    e.preventDefault();
    navAccounts.classList.add('active');
    navHome.classList.remove('active');

    homeView.style.display = 'none';
    transactionsContainer.style.display = 'none';
    accountsMobileView.style.display = 'block';
});


// --- Export / Import ---
exportBtn.addEventListener('click', () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `money_manager_backup_${new Date().toISOString().split('T')[0]}.json`);
    dlAnchorElem.click();
});

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
