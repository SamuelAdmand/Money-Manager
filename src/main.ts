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

interface EMI {
    id: string;
    description: string;
    amount: number;
    accountId: string;
}

interface AppState {
    accounts: Account[];
    transactions: Transaction[];
    emis: EMI[];
    theme: 'light' | 'dark';
}

// --- State Management ---
const STORAGE_KEY = 'money_manager_state';

let state: AppState = {
    accounts: [],
    transactions: [],
    emis: [],
    theme: 'dark'
};

function loadState() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        try {
            state = JSON.parse(saved);
            if (!state.emis) state.emis = [];
        } catch (e) {
            console.error('Failed to parse state:', e);
        }
    } else {
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

// Dashboard
const spendableBalanceEl = document.getElementById('spendable-balance')!;
const netWorthEl = document.getElementById('net-worth')!;
const totalInvestmentsEl = document.getElementById('total-investments')!;
const totalDebtEl = document.getElementById('total-debt')!;
const totalEmisEl = document.getElementById('total-emis')!;
const txListEl = document.getElementById('transaction-list')!;

// Desktop Forms & Containers
const tabExpenseDesktop = document.getElementById('tab-expense-desktop') as HTMLButtonElement;
const tabIncomeDesktop = document.getElementById('tab-income-desktop') as HTMLButtonElement;
const txFormDesktop = document.getElementById('transaction-form-desktop') as HTMLFormElement;
const txTypeInputDesktop = document.getElementById('tx-type-desktop') as HTMLInputElement;
const txAmountInputDesktop = document.getElementById('tx-amount-desktop') as HTMLInputElement;
const txDescInputDesktop = document.getElementById('tx-desc-desktop') as HTMLInputElement;
const txAccountSelectDesktop = document.getElementById('tx-account-desktop') as HTMLSelectElement;

// Desktop Accounts
const accountListDesktopEl = document.getElementById('account-list-desktop')!;
const addAccountBtnDesktop = document.getElementById('add-account-btn-desktop') as HTMLButtonElement;
const addAccountFormDesktop = document.getElementById('add-account-form-desktop') as HTMLFormElement;
const cancelAccountBtnDesktop = document.getElementById('cancel-account-btn-desktop') as HTMLButtonElement;
const acctNameInputDesktop = document.getElementById('acct-name-desktop') as HTMLInputElement;
const acctTypeSelectDesktop = document.getElementById('acct-type-desktop') as HTMLSelectElement;
const acctBalanceInputDesktop = document.getElementById('acct-balance-desktop') as HTMLInputElement;

// Desktop EMIs
const emiListDesktopEl = document.getElementById('emi-list-desktop')!;
const addEmiBtnDesktop = document.getElementById('add-emi-btn-desktop') as HTMLButtonElement;
const addEmiFormDesktop = document.getElementById('add-emi-form-desktop') as HTMLFormElement;
const cancelEmiBtnDesktop = document.getElementById('cancel-emi-btn-desktop') as HTMLButtonElement;
const emiDescInputDesktop = document.getElementById('emi-desc-desktop') as HTMLInputElement;
const emiAmountInputDesktop = document.getElementById('emi-amount-desktop') as HTMLInputElement;
const emiAccountSelectDesktop = document.getElementById('emi-account-desktop') as HTMLSelectElement;

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

// Mobile Accounts
const accountListMobileEl = document.getElementById('account-list-mobile')!;
const addAccountBtnMobile = document.getElementById('add-account-btn-mobile') as HTMLButtonElement;
const addAccountFormMobile = document.getElementById('add-account-form-mobile') as HTMLFormElement;
const cancelAccountBtnMobile = document.getElementById('cancel-account-btn-mobile') as HTMLButtonElement;
const acctNameInputMobile = document.getElementById('acct-name-mobile') as HTMLInputElement;
const acctTypeSelectMobile = document.getElementById('acct-type-mobile') as HTMLSelectElement;
const acctBalanceInputMobile = document.getElementById('acct-balance-mobile') as HTMLInputElement;

// Mobile EMIs
const emiListMobileEl = document.getElementById('emi-list-mobile')!;
const addEmiBtnMobile = document.getElementById('add-emi-btn-mobile') as HTMLButtonElement;
const addEmiFormMobile = document.getElementById('add-emi-form-mobile') as HTMLFormElement;
const cancelEmiBtnMobile = document.getElementById('cancel-emi-btn-mobile') as HTMLButtonElement;
const emiDescInputMobile = document.getElementById('emi-desc-mobile') as HTMLInputElement;
const emiAmountInputMobile = document.getElementById('emi-amount-mobile') as HTMLInputElement;
const emiAccountSelectMobile = document.getElementById('emi-account-mobile') as HTMLSelectElement;

// Mobile Nav Bar Switching
const navHome = document.getElementById('nav-home')!;
const navTransactions = document.getElementById('nav-transactions')!;
const navAccounts = document.getElementById('nav-accounts')!;
const navEmis = document.getElementById('nav-emis')!;
const homeView = document.getElementById('home-view')!;
const transactionsContainer = document.getElementById('transactions-container')!;
const accountsMobileView = document.getElementById('accounts-mobile-view')!;
const emisMobileView = document.getElementById('emis-mobile-view')!;

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
    let grossAssets = 0;
    let debt = 0;
    let investments = 0;
    let emis = 0;

    state.accounts.forEach(a => {
        const bal = getAccountBalance(a.id);
        if (bal > 0) {
            grossAssets += bal;
            if (a.type === 'investment') investments += bal;
        } else if (bal < 0) {
            // Any negative balance is considered debt (credit cards typically go negative as you spend)
            debt += Math.abs(bal);
            if (a.type === 'investment') investments += bal; // maintain true value of investment even if negative (unlikely but safe)
        }
    });

    state.emis.forEach(e => {
        emis += e.amount;
    });

    const netWorth = grossAssets - debt;
    // Spendable Balance = Net Worth - Investments - Monthly Debt obligations (EMIs)
    const spendable = netWorth - investments - emis;

    return { spendable, netWorth, investments, debt, emis };
}

// --- UI Updates ---
function formatCurrency(amount: number) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR'
    }).format(amount);
}

function updateUI() {
    const totals = calculateTotals();
    if (spendableBalanceEl) spendableBalanceEl.textContent = formatCurrency(totals.spendable);
    if (netWorthEl) netWorthEl.textContent = formatCurrency(totals.netWorth);
    if (totalInvestmentsEl) totalInvestmentsEl.textContent = formatCurrency(totals.investments);
    if (totalDebtEl) totalDebtEl.textContent = formatCurrency(totals.debt);
    if (totalEmisEl) totalEmisEl.textContent = formatCurrency(totals.emis);

    // Apply colors to hero card based on spendable balance
    if (spendableBalanceEl) {
        if (totals.spendable < 0) {
            spendableBalanceEl.style.color = 'var(--danger-color)';
        } else {
            spendableBalanceEl.style.color = 'var(--primary-color)';
        }
    }

    const renderAccountOptions = () => {
        const eligibleAccounts = state.accounts.filter(a => a.type !== 'investment');
        if (eligibleAccounts.length === 0) return '<option value="" disabled selected>No accounts found</option>';
        return eligibleAccounts.map(a => `<option value="${a.id}">${a.name} (${a.type})</option>`).join('');
    };

    if (txAccountSelectDesktop) txAccountSelectDesktop.innerHTML = renderAccountOptions();
    if (txAccountSelectMobile) txAccountSelectMobile.innerHTML = renderAccountOptions();
    if (emiAccountSelectDesktop) emiAccountSelectDesktop.innerHTML = renderAccountOptions();
    if (emiAccountSelectMobile) emiAccountSelectMobile.innerHTML = renderAccountOptions();

    // Render accounts list
    const renderAccounts = (container: HTMLElement) => {
        if (!container) return;
        container.innerHTML = '';
        if (state.accounts.length === 0) {
            container.innerHTML = '<div class="empty-state"><ion-icon name="wallet-outline"></ion-icon><p>No accounts yet.</p></div>';
        } else {
            state.accounts.forEach(a => {
                const bal = getAccountBalance(a.id);
                const item = document.createElement('div');
                item.className = 'account-item';
                item.innerHTML = `
          <div class="account-info">
            <h5>${a.name}</h5>
            <p>${a.type.charAt(0).toUpperCase() + a.type.slice(1)}</p>
          </div>
          <div class="account-balance" style="color: ${bal < 0 ? 'var(--danger-color)' : 'inherit'}">${formatCurrency(Math.abs(bal))} ${bal < 0 ? '(Owed)' : ''}</div>
        `;
                container.appendChild(item);
            });
        }
    };

    renderAccounts(accountListDesktopEl);
    renderAccounts(accountListMobileEl);

    // Render EMIs list
    const renderEmis = (container: HTMLElement) => {
        if (!container) return;
        container.innerHTML = '';
        if (state.emis.length === 0) {
            container.innerHTML = '<div class="empty-state"><ion-icon name="calendar-outline"></ion-icon><p>No active EMIs.</p></div>';
        } else {
            state.emis.forEach(e => {
                const item = document.createElement('div');
                item.className = 'account-item';
                item.innerHTML = `
          <div class="account-info">
            <h5>${e.description}</h5>
            <p>Deducts from: ${state.accounts.find(a => a.id === e.accountId)?.name || 'Unknown'}</p>
          </div>
          <div style="display: flex; align-items: center; gap: 1rem;">
             <div class="account-balance tx-expense">${formatCurrency(e.amount)} /mo</div>
             <button class="btn-icon delete-emi-btn" data-id="${e.id}" style="width: 2rem; height: 2rem; border-color: transparent; box-shadow: none;">
               <ion-icon name="close-circle-outline" style="color: var(--danger-color); font-size: 1.5rem;"></ion-icon>
             </button>
          </div>
        `;
                container.appendChild(item);
            });
        }

        // Attach delete handlers for EMIs
        container.querySelectorAll('.delete-emi-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = (e.currentTarget as HTMLButtonElement).dataset.id;
                if (id) {
                    state.emis = state.emis.filter(tx => tx.id !== id);
                    saveState();
                }
            });
        });
    };

    renderEmis(emiListDesktopEl);
    renderEmis(emiListMobileEl);

    // Render transactions
    if (txListEl) {
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

            // Attach delete handlers for transactions
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
}

// --- Event Handlers ---

// Transactions
function setupTransactionForm(form: HTMLFormElement, typeInput: HTMLInputElement, amountInput: HTMLInputElement, descInput: HTMLInputElement, accountSelect: HTMLSelectElement, onSuccess?: () => void) {
    if (!form) return;
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

setupTransactionForm(txFormDesktop, txTypeInputDesktop, txAmountInputDesktop, txDescInputDesktop, txAccountSelectDesktop);
setupTransactionForm(txFormMobile, txTypeInputMobile, txAmountInputMobile, txDescInputMobile, txAccountSelectMobile, () => {
    if (txModal) txModal.classList.remove('open');
});

// Accounts
function setupAccountForm(btn: HTMLButtonElement, form: HTMLFormElement, cancelBtn: HTMLButtonElement, nameInput: HTMLInputElement, typeSelect: HTMLSelectElement, balanceInput: HTMLInputElement) {
    if (!btn || !form) return;
    btn.addEventListener('click', () => { form.style.display = 'block'; });
    cancelBtn.addEventListener('click', () => { form.style.display = 'none'; form.reset(); });

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const newAccount: Account = {
            id: crypto.randomUUID(),
            name: nameInput.value.trim(),
            type: typeSelect.value,
            // If user inputs a positive number for a credit card balance, typically it means they owe that much right now.
            // E.g., Credit Card with 500 balance = -500 net cash.
            balance: typeSelect.value === 'credit' ? -(parseFloat(balanceInput.value) || 0) : (parseFloat(balanceInput.value) || 0)
        };
        state.accounts.push(newAccount);
        saveState();
        form.reset();
        form.style.display = 'none';
    });
}

setupAccountForm(addAccountBtnDesktop, addAccountFormDesktop, cancelAccountBtnDesktop, acctNameInputDesktop, acctTypeSelectDesktop, acctBalanceInputDesktop);
setupAccountForm(addAccountBtnMobile, addAccountFormMobile, cancelAccountBtnMobile, acctNameInputMobile, acctTypeSelectMobile, acctBalanceInputMobile);

// EMIs
function setupEmiForm(btn: HTMLButtonElement, form: HTMLFormElement, cancelBtn: HTMLButtonElement, descInput: HTMLInputElement, amountInput: HTMLInputElement, accountSelect: HTMLSelectElement) {
    if (!btn || !form) return;
    btn.addEventListener('click', () => { form.style.display = 'block'; });
    cancelBtn.addEventListener('click', () => { form.style.display = 'none'; form.reset(); });

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        if (state.accounts.length === 0) {
            alert("Please create an account first to link to an EMI.");
            return;
        }
        const newEmi: EMI = {
            id: crypto.randomUUID(),
            description: descInput.value.trim(),
            amount: parseFloat(amountInput.value),
            accountId: accountSelect.value
        };
        state.emis.push(newEmi);
        saveState();
        form.reset();
        form.style.display = 'none';
    });
}

setupEmiForm(addEmiBtnDesktop, addEmiFormDesktop, cancelEmiBtnDesktop, emiDescInputDesktop, emiAmountInputDesktop, emiAccountSelectDesktop);
setupEmiForm(addEmiBtnMobile, addEmiFormMobile, cancelEmiBtnMobile, emiDescInputMobile, emiAmountInputMobile, emiAccountSelectMobile);

// Tabs Desktop & Mobile
if (tabExpenseDesktop) tabExpenseDesktop.addEventListener('click', () => { tabExpenseDesktop.classList.add('active'); tabIncomeDesktop.classList.remove('active'); txTypeInputDesktop.value = 'expense'; });
if (tabIncomeDesktop) tabIncomeDesktop.addEventListener('click', () => { tabIncomeDesktop.classList.add('active'); tabExpenseDesktop.classList.remove('active'); txTypeInputDesktop.value = 'income'; });
if (tabExpenseMobile) tabExpenseMobile.addEventListener('click', () => { tabExpenseMobile.classList.add('active'); tabIncomeMobile.classList.remove('active'); txTypeInputMobile.value = 'expense'; });
if (tabIncomeMobile) tabIncomeMobile.addEventListener('click', () => { tabIncomeMobile.classList.add('active'); tabExpenseMobile.classList.remove('active'); txTypeInputMobile.value = 'income'; });

// Mobile Navigation
if (mobileAddBtn) mobileAddBtn.addEventListener('click', () => { txModal.classList.add('open'); });
if (closeModalBtn) closeModalBtn.addEventListener('click', () => { txModal.classList.remove('open'); });

const resetMobileViews = () => {
    if (homeView) homeView.style.display = 'none';
    if (transactionsContainer) transactionsContainer.style.display = 'none';
    if (accountsMobileView) accountsMobileView.style.display = 'none';
    if (emisMobileView) emisMobileView.style.display = 'none';
    if (navHome) navHome.classList.remove('active');
    if (navTransactions) navTransactions.classList.remove('active');
    if (navAccounts) navAccounts.classList.remove('active');
    if (navEmis) navEmis.classList.remove('active');
};

if (navHome) {
    navHome.addEventListener('click', (e) => {
        e.preventDefault();
        resetMobileViews();
        navHome.classList.add('active');
        homeView.style.display = 'grid';
    });
}

if (navTransactions) {
    navTransactions.addEventListener('click', (e) => {
        e.preventDefault();
        resetMobileViews();
        navTransactions.classList.add('active');
        transactionsContainer.style.display = 'block';
    });
}

if (navAccounts) {
    navAccounts.addEventListener('click', (e) => {
        e.preventDefault();
        resetMobileViews();
        navAccounts.classList.add('active');
        accountsMobileView.style.display = 'block';
    });
}

if (navEmis) {
    navEmis.addEventListener('click', (e) => {
        e.preventDefault();
        resetMobileViews();
        navEmis.classList.add('active');
        emisMobileView.style.display = 'block';
    });
}

// --- Export / Import ---
if (exportBtn) {
    exportBtn.addEventListener('click', () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
        const dlAnchorElem = document.createElement('a');
        dlAnchorElem.setAttribute("href", dataStr);
        dlAnchorElem.setAttribute("download", `money_manager_backup_${new Date().toISOString().split('T')[0]}.json`);
        dlAnchorElem.click();
    });
}

if (importInput) {
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
                        emis: Array.isArray(importedState.emis) ? importedState.emis : []
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
            importInput.value = '';
        };
        reader.readAsText(file);
    });
}

// --- Init ---
loadState();
updateUI();
