import './style.css';

// --- Service Worker Registration ---
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => {
                console.log('SW Registered!', reg);

                // Check for updates periodically
                reg.onupdatefound = () => {
                    const installingWorker = reg.installing;
                    if (installingWorker) {
                        installingWorker.onstatechange = () => {
                            if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                // New version available, UI could show a notification,
                                // but as per user request for "auto refresh", we'll force it.
                                console.log('New content available; please refresh.');
                            }
                        };
                    }
                };
            })
            .catch(err => console.log('SW registration failed: ', err));
    });

    // Handle the actual reload when the new service worker takes over
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
            refreshing = true;
            window.location.reload();
        }
    });
}

// --- Interfaces ---
interface Account {
    id: string;
    name: string;
    type: string;
    balance: number;
    limit?: number; // For Credit Cards
}

interface Transaction {
    id: string;
    type: 'income' | 'expense';
    amount: number;
    category: string;
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
    customPresets: { name: string, icon: string, type: 'income' | 'expense' }[];
    theme: 'light' | 'dark';
}

// --- Constants & Types ---
const STORAGE_KEY = 'money_manager_state';

const EXPENSE_PRESETS = [
    { name: 'Grocery', icon: 'cart-outline' },
    { name: 'Health', icon: 'heart-outline' },
    { name: 'Dining', icon: 'restaurant-outline' },
    { name: 'Travel', icon: 'airplane-outline' },
    { name: 'Fuel', icon: 'speedometer-outline' },
    { name: 'Rent', icon: 'home-outline' },
    { name: 'Repay', icon: 'arrow-undo-outline' }
];

const INCOME_PRESETS = [
    { name: 'Salary', icon: 'cash-outline' },
    { name: 'Dividend', icon: 'pie-chart-outline' },
    { name: 'Gift', icon: 'gift-outline' },
    { name: 'Interest', icon: 'trending-up-outline' },
    { name: 'Refund', icon: 'refresh-outline' }
];

let state: AppState = {
    accounts: [],
    transactions: [],
    emis: [],
    customPresets: [],
    theme: 'dark'
};

function loadState() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        try {
            state = JSON.parse(saved);
            if (!state.emis) state.emis = [];
            if (!state.customPresets) state.customPresets = [];
            state.transactions = state.transactions.map(t => ({
                ...t,
                category: t.category || 'Other'
            }));
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
// Navigation Views
const dashboardView = document.getElementById('dashboard-view')!;
const settingsView = document.getElementById('settings-view')!;

// Settings View Elements
const openSettingsBtn = document.getElementById('open-settings') as HTMLButtonElement;
const backFromSettingsBtn = document.getElementById('back-from-settings') as HTMLButtonElement;
const themeToggleSettings = document.getElementById('theme-toggle-settings') as HTMLButtonElement;
const themeStatusEl = document.getElementById('theme-status')!;
const exportBtnSettings = document.getElementById('export-data-settings') as HTMLButtonElement;
const importInputSettings = document.getElementById('import-data-settings') as HTMLInputElement;
const settingsThemeIcon = document.getElementById('settings-theme-icon') as HTMLElement;

// Dashboard
const homeView = document.getElementById('home-view')!;
const spendableBalanceEl = document.getElementById('spendable-balance')!;
const netWorthEl = document.getElementById('net-worth')!;
const totalInvestmentsEl = document.getElementById('total-investments')!;
const totalDebtEl = document.getElementById('total-debt')!;
const totalEmisEl = document.getElementById('total-emis')!;
const txListEl = document.getElementById('transaction-list')!;
const txListMobileSharedEl = document.getElementById('transaction-list-mobile')!;

// Desktop Forms & Containers
const tabExpenseDesktop = document.getElementById('tab-expense-desktop') as HTMLButtonElement;
const tabIncomeDesktop = document.getElementById('tab-income-desktop') as HTMLButtonElement;
const txFormDesktop = document.getElementById('transaction-form-desktop') as HTMLFormElement;
const txTypeInputDesktop = document.getElementById('tx-type-desktop') as HTMLInputElement;
const txAmountInputDesktop = document.getElementById('tx-amount-desktop') as HTMLInputElement;
const txCategoryInputDesktop = document.getElementById('tx-category-desktop') as HTMLInputElement;
const txDescInputDesktop = document.getElementById('tx-desc-desktop') as HTMLInputElement;
const txAccountSelectDesktop = document.getElementById('tx-account-desktop') as HTMLSelectElement;

// Desktop Accounts
const accountListDesktopEl = document.getElementById('account-list-desktop')!;
const investmentListDesktopEl = document.getElementById('investment-list-desktop')!;
const addAccountBtnDesktop = document.getElementById('add-account-btn-desktop') as HTMLButtonElement;
const addAccountFormDesktop = document.getElementById('add-account-form-desktop') as HTMLFormElement;
const cancelAccountBtnDesktop = document.getElementById('cancel-account-btn-desktop') as HTMLButtonElement;
const acctNameInputDesktop = document.getElementById('acct-name-desktop') as HTMLInputElement;
const acctTypeSelectDesktop = document.getElementById('acct-type-desktop') as HTMLSelectElement;
const acctBalanceInputDesktop = document.getElementById('acct-balance-desktop') as HTMLInputElement;
const acctBalanceGroupDesktop = document.getElementById('acct-balance-group-desktop')!;
const acctLimitGroupDesktop = document.getElementById('acct-limit-group-desktop')!;
const acctLimitInputDesktop = document.getElementById('acct-limit-desktop') as HTMLInputElement;
const acctOutstandingGroupDesktop = document.getElementById('acct-outstanding-group-desktop')!;
const acctOutstandingInputDesktop = document.getElementById('acct-outstanding-desktop') as HTMLInputElement;

// Desktop EMIs
const emiListDesktopEl = document.getElementById('emi-list-desktop')!;
const addEmiBtnDesktop = document.getElementById('add-emi-btn-desktop') as HTMLButtonElement;
const addEmiFormDesktop = document.getElementById('add-emi-form-desktop') as HTMLFormElement;
const cancelEmiBtnDesktop = document.getElementById('cancel-emi-btn-desktop') as HTMLButtonElement;
const emiDescInputDesktop = document.getElementById('emi-desc-desktop') as HTMLInputElement;
const emiAmountInputDesktop = document.getElementById('emi-amount-desktop') as HTMLInputElement;
const emiAccountSelectDesktop = document.getElementById('emi-account-desktop') as HTMLSelectElement;

// Mobile Forms & Bottom Sheets
const globalOverlay = document.getElementById('global-overlay')!;
const txBottomSheet = document.getElementById('tx-bottom-sheet')!;
const accountBottomSheet = document.getElementById('account-bottom-sheet')!;
const emiBottomSheet = document.getElementById('emi-bottom-sheet')!;

const closeTxSheetBtn = document.getElementById('close-tx-sheet') as HTMLButtonElement;
const closeAccountSheetBtn = document.getElementById('close-account-sheet') as HTMLButtonElement;
const closeEmiSheetBtn = document.getElementById('close-emi-sheet') as HTMLButtonElement;

const mobileAddBtn = document.getElementById('mobile-add-btn') as HTMLButtonElement;

const tabExpenseMobile = document.getElementById('tab-expense-mobile') as HTMLButtonElement;
const tabIncomeMobile = document.getElementById('tab-income-mobile') as HTMLButtonElement;
const txFormMobile = document.getElementById('transaction-form-mobile') as HTMLFormElement;
const txTypeInputMobile = document.getElementById('tx-type-mobile') as HTMLInputElement;
const txAmountInputMobile = document.getElementById('tx-amount-mobile') as HTMLInputElement;
const txCategoryInputMobile = document.getElementById('tx-category-mobile') as HTMLInputElement;
const txDescInputMobile = document.getElementById('tx-desc-mobile') as HTMLInputElement;
const txAccountSelectMobile = document.getElementById('tx-account-mobile') as HTMLSelectElement;
const txPresetsDesktop = document.getElementById('tx-presets-desktop')!;
const txPresetsMobile = document.getElementById('tx-presets-mobile')!;

// Custom Presets Management
const customPresetsList = document.getElementById('custom-presets-list')!;
const addCustomPresetBtn = document.getElementById('add-custom-preset-btn') as HTMLButtonElement;

// Mobile Accounts
const accountListMobileEl = document.getElementById('account-list-mobile')!;
const investmentListMobileEl = document.getElementById('investment-list-mobile')!;
const addAccountBtnMobile = document.getElementById('add-account-btn-mobile') as HTMLButtonElement;
const addAccountFormMobile = document.getElementById('add-account-form-mobile') as HTMLFormElement;
const acctNameInputMobile = document.getElementById('acct-name-mobile') as HTMLInputElement;
const acctTypeSelectMobile = document.getElementById('acct-type-mobile') as HTMLSelectElement;
const acctBalanceInputMobile = document.getElementById('acct-balance-mobile') as HTMLInputElement;
const acctBalanceGroupMobile = document.getElementById('acct-balance-group-mobile')!;
const acctLimitGroupMobile = document.getElementById('acct-limit-group-mobile')!;
const acctLimitInputMobile = document.getElementById('acct-limit-mobile') as HTMLInputElement;
const acctOutstandingGroupMobile = document.getElementById('acct-outstanding-group-mobile')!;
const acctOutstandingInputMobile = document.getElementById('acct-outstanding-mobile') as HTMLInputElement;

// Mobile EMIs
const emiListMobileEl = document.getElementById('emi-list-mobile')!;
const addEmiBtnMobile = document.getElementById('add-emi-btn-mobile') as HTMLButtonElement;
const addEmiFormMobile = document.getElementById('add-emi-form-mobile') as HTMLFormElement;
const emiDescInputMobile = document.getElementById('emi-desc-mobile') as HTMLInputElement;
const emiAmountInputMobile = document.getElementById('emi-amount-mobile') as HTMLInputElement;
const emiAccountSelectMobile = document.getElementById('emi-account-mobile') as HTMLSelectElement;

// Mobile Nav Bar Switching
const navHome = document.getElementById('nav-home')!;
const navAccounts = document.getElementById('nav-accounts')!;
const navTransactions = document.getElementById('nav-transactions')!;
const navEmis = document.getElementById('nav-emis')!;
const transactionsViewDesktop = document.getElementById('transactions-container')!;
const accountsMobileView = document.getElementById('accounts-mobile-view')!;
const transactionsMobileView = document.getElementById('transactions-mobile-view')!;
const emisMobileView = document.getElementById('emis-mobile-view')!;

// --- Layout Helpers ---
function lockScroll() {
    document.body.classList.add('no-scroll');
}

function unlockScroll() {
    document.body.classList.remove('no-scroll');
}

// --- Presets Helper ---
const setupPresets = (container: HTMLElement, categoryInput: HTMLInputElement, accountSelect: HTMLSelectElement, type: 'income' | 'expense') => {
    if (!container) return;
    container.innerHTML = '';
    const presets = [
        ...(type === 'income' ? INCOME_PRESETS : EXPENSE_PRESETS),
        ...state.customPresets.filter(p => p.type === type)
    ];
    presets.forEach(p => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'preset-chip';
        chip.innerHTML = `<ion-icon name="${p.icon}"></ion-icon> ${p.name}`;
        chip.addEventListener('click', () => {
            if (p.name === 'Repay') {
                const creditAccounts = state.accounts.filter(a => a.type === 'credit');
                if (creditAccounts.length === 0) {
                    alert('No credit card accounts found to repay.');
                    return;
                }

                // Optimized Repay Flow
                if (creditAccounts.length === 1) {
                    accountSelect.value = creditAccounts[0].id;
                    (window as any).repayDebt(creditAccounts[0].id);
                } else {
                    const selAccount = state.accounts.find(a => a.id === accountSelect.value);
                    if (selAccount && selAccount.type === 'credit') {
                        (window as any).repayDebt(selAccount.id);
                    } else {
                        // Filter account select temporarily or just prompt
                        alert('Please select a Credit Card account first to use the Repay shortcut.');
                    }
                }
                return;
            }
            categoryInput.value = p.name;
        });
        container.appendChild(chip);
    });
};

// --- Theme Logic ---
function applyTheme() {
    document.documentElement.setAttribute('data-theme', state.theme);
}

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
        const withdrawable = state.accounts.filter(a => a.type !== 'investment');
        if (withdrawable.length === 0) return '<option value="" disabled selected>No source accounts found</option>';
        return withdrawable.map(a => `<option value="${a.id}">${a.name} (${a.type})</option>`).join('');
    };

    if (txAccountSelectDesktop) txAccountSelectDesktop.innerHTML = renderAccountOptions();
    if (txAccountSelectMobile) txAccountSelectMobile.innerHTML = renderAccountOptions();
    if (emiAccountSelectDesktop) emiAccountSelectDesktop.innerHTML = renderAccountOptions();
    if (emiAccountSelectMobile) emiAccountSelectMobile.innerHTML = renderAccountOptions();

    // Render accounts list
    const renderAccounts = (container: HTMLElement, type: 'standard' | 'investment') => {
        if (!container) return;
        container.innerHTML = '';

        const filtered = state.accounts.filter(a => type === 'investment' ? a.type === 'investment' : a.type !== 'investment');

        if (filtered.length === 0) {
            container.innerHTML = `<div class="empty-state"><ion-icon name="${type === 'investment' ? 'bar-chart-outline' : 'wallet-outline'}"></ion-icon><p>No ${type}s yet.</p></div>`;
        } else {
            filtered.forEach(a => {
                const bal = getAccountBalance(a.id);
                const item = document.createElement('div');
                const isCredit = a.type === 'credit';
                item.className = isCredit ? 'account-item credit-card-ui' : 'account-item';

                let balanceDisplay = formatCurrency(Math.abs(bal));
                let balanceLabel = bal < 0 ? '(Owed)' : '';

                if (isCredit) {
                    const limit = a.limit || 0;
                    item.innerHTML = `
                    <div class="card-header">
                        <div class="account-info">
                            <h5>${a.name}</h5>
                            <p>${a.type.toUpperCase()}</p>
                        </div>
                        <button class="btn-icon delete-account-btn" data-id="${a.id}" style="background: rgba(255,255,255,0.2); border: none; color: white;">
                             <ion-icon name="trash-outline"></ion-icon>
                        </button>
                    </div>
                    <div class="card-chip"></div>
                    <div class="card-body">
                        <div class="outstanding-amount">${balanceDisplay}</div>
                        <div class="outstanding-label">CURRENT OUTSTANDING</div>
                    </div>
                    <div class="card-footer">
                        <div class="card-limit">
                            LIMIT: ${formatCurrency(limit)}
                        </div>
                    </div>
                `;
                } else {
                    item.innerHTML = `
                    <div class="account-info">
                        <h5>${a.name}</h5>
                        <p>${a.type.charAt(0).toUpperCase() + a.type.slice(1)}</p>
                    </div>
                    <div style="display: flex; align-items: center; gap: 1rem;">
                        <div class="account-balance" style="color: ${bal < 0 ? 'var(--danger-color)' : 'inherit'}">${balanceDisplay} ${balanceLabel}</div>
                        <button class="btn-icon delete-account-btn" data-id="${a.id}" style="width: 2rem; height: 2rem;">
                            <ion-icon name="trash-outline" style="color: var(--danger-color);"></ion-icon>
                        </button>
                    </div>
                `;
                }
                container.appendChild(item);
            });
        }
    };

    renderAccounts(accountListDesktopEl, 'standard');
    renderAccounts(investmentListDesktopEl, 'investment');
    renderAccounts(accountListMobileEl, 'standard');
    renderAccounts(investmentListMobileEl, 'investment');

    // Attach delete handlers for accounts
    document.querySelectorAll('.delete-account-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = (e.currentTarget as HTMLButtonElement).dataset.id;
            const account = state.accounts.find(a => a.id === id);
            if (id && account) {
                if (confirm(`Are you sure you want to delete account "${account.name}"? This will also delete all associated transactions.`)) {
                    state.accounts = state.accounts.filter(a => a.id !== id);
                    state.transactions = state.transactions.filter(t => t.accountId !== id);
                    state.emis = state.emis.filter(e => e.accountId !== id);
                    saveState();
                }
            }
        });
    });

    // --- Transaction Presets Management ---

    setupPresets(txPresetsDesktop, txCategoryInputDesktop, txAccountSelectDesktop, txTypeInputDesktop.value as any);
    setupPresets(txPresetsMobile, txCategoryInputMobile, txAccountSelectMobile, txTypeInputMobile.value as any);
    renderCustomPresets();

    renderEmis(emiListDesktopEl);
    renderEmis(emiListMobileEl);

    renderTransactionsList(txListEl);
    renderTransactionsList(txListMobileSharedEl);
}

const renderCustomPresets = () => {
    if (!customPresetsList) return;
    customPresetsList.innerHTML = '';
    state.customPresets.forEach((p, index) => {
        const item = document.createElement('div');
        item.className = 'settings-item';
        item.innerHTML = `
            <div class="settings-item-info">
                <ion-icon name="${p.icon}"></ion-icon>
                <div>
                    <h4>${p.name}</h4>
                    <p>${p.type.toUpperCase()} Category</p>
                </div>
            </div>
            <button class="btn-icon delete-preset-btn" data-index="${index}">
                <ion-icon name="trash-outline" style="color: var(--danger-color);"></ion-icon>
            </button>
        `;
        customPresetsList.appendChild(item);
    });

    // Delete Preset Handler
    customPresetsList.querySelectorAll('.delete-preset-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt((e.currentTarget as HTMLButtonElement).dataset.index!);
            state.customPresets.splice(index, 1);
            saveState();
            renderCustomPresets();
            // Update active presets in forms
            setupPresets(txPresetsDesktop, txCategoryInputDesktop, txAccountSelectDesktop, txTypeInputDesktop.value as any);
            setupPresets(txPresetsMobile, txCategoryInputMobile, txAccountSelectMobile, txTypeInputMobile.value as any);
        });
    });
};

if (addCustomPresetBtn) {
    addCustomPresetBtn.addEventListener('click', () => {
        const name = prompt('Enter category name:');
        if (!name) return;
        const type = confirm('Is this an Income category? (Cancel for Expense)') ? 'income' : 'expense';
        const icon = prompt('Enter Ionicon name (e.g. cafe-outline):', 'bookmark-outline') || 'bookmark-outline';

        state.customPresets.push({ name, type, icon });
        saveState();
        renderCustomPresets();
        // Update active presets in forms
        setupPresets(txPresetsDesktop, txCategoryInputDesktop, txAccountSelectDesktop, txTypeInputDesktop.value as any);
        setupPresets(txPresetsMobile, txCategoryInputMobile, txAccountSelectMobile, txTypeInputMobile.value as any);
    });
}

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
const renderTransactionsList = (container: HTMLElement) => {
    if (!container) return;
    container.innerHTML = '';
    if (state.transactions.length === 0) {
        container.innerHTML = '<div class="empty-state"><ion-icon name="receipt-outline"></ion-icon><p>No recent transactions.</p></div>';
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
              <p><strong>${t.category}</strong> • ${acct ? acct.name : 'Unknown Account'} • ${new Date(t.date).toLocaleDateString()}</p>
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
            container.appendChild(item);
        });

        // Attach delete handlers for transactions
        container.querySelectorAll('.delete-tx-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = (e.currentTarget as HTMLButtonElement).dataset.id;
                if (id) {
                    state.transactions = state.transactions.filter(t => t.id !== id);
                    saveState();
                }
            });
        });
    }
};

// --- Event Handlers ---

// Transactions
function setupTransactionForm(form: HTMLFormElement, typeInput: HTMLInputElement, amountInput: HTMLInputElement, categoryInput: HTMLInputElement, descInput: HTMLInputElement, accountSelect: HTMLSelectElement, onSuccess?: () => void) {
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
            category: categoryInput.value.trim() || 'Other',
            description: descInput.value.trim(),
            accountId: accountSelect.value,
            date: new Date().toISOString()
        };
        state.transactions.push(newTx);
        saveState();

        amountInput.value = '';
        categoryInput.value = '';
        descInput.value = '';
        if (onSuccess) onSuccess();
    });
}

setupTransactionForm(txFormDesktop, txTypeInputDesktop, txAmountInputDesktop, txCategoryInputDesktop, txDescInputDesktop, txAccountSelectDesktop);
setupTransactionForm(txFormMobile, txTypeInputMobile, txAmountInputMobile, txCategoryInputMobile, txDescInputMobile, txAccountSelectMobile, () => {
    closeAllSheets();
});

// Accounts
function setupAccountForm(
    btn: HTMLButtonElement,
    form: HTMLFormElement,
    cancelBtn: HTMLButtonElement,
    nameInput: HTMLInputElement,
    typeSelect: HTMLSelectElement,
    balanceInput: HTMLInputElement,
    balanceGroup: HTMLElement,
    limitGroup: HTMLElement,
    limitInput: HTMLInputElement,
    outstandingGroup: HTMLElement,
    outstandingInput: HTMLInputElement
) {
    if (!btn || !form) return;

    const toggleFields = () => {
        const isCredit = typeSelect.value === 'credit';
        balanceGroup.style.display = isCredit ? 'none' : 'block';
        limitGroup.style.display = isCredit ? 'block' : 'none';
        outstandingGroup.style.display = isCredit ? 'block' : 'none';

        const balanceLabel = balanceGroup.querySelector('label');
        if (balanceLabel) {
            balanceLabel.textContent = typeSelect.value === 'investment' ? 'Initial Value' : 'Initial Balance';
        }
    };

    btn.addEventListener('click', () => {
        if (form.id.includes('mobile')) {
            openSheet(accountBottomSheet);
        } else {
            form.style.display = 'block';
        }
        toggleFields();
    });

    typeSelect.addEventListener('change', toggleFields);

    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            form.style.display = 'none';
            form.reset();
        });
    }

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const type = typeSelect.value;
        const isCredit = type === 'credit';

        const newAccount: Account = {
            id: crypto.randomUUID(),
            name: nameInput.value.trim(),
            type: type,
            balance: isCredit ? -(parseFloat(outstandingInput.value) || 0) : (parseFloat(balanceInput.value) || 0),
            limit: isCredit ? (parseFloat(limitInput.value) || 0) : undefined
        };
        state.accounts.push(newAccount);
        saveState();
        form.reset();
        if (form.id.includes('mobile')) {
            closeAllSheets();
        } else {
            form.style.display = 'none';
        }
        updateUI();
    });
}

setupAccountForm(
    addAccountBtnDesktop,
    addAccountFormDesktop,
    cancelAccountBtnDesktop,
    acctNameInputDesktop,
    acctTypeSelectDesktop,
    acctBalanceInputDesktop,
    acctBalanceGroupDesktop,
    acctLimitGroupDesktop,
    acctLimitInputDesktop,
    acctOutstandingGroupDesktop,
    acctOutstandingInputDesktop
);

setupAccountForm(
    addAccountBtnMobile,
    addAccountFormMobile,
    null as any, // Handled by closeAccountSheetBtn
    acctNameInputMobile,
    acctTypeSelectMobile,
    acctBalanceInputMobile,
    acctBalanceGroupMobile,
    acctLimitGroupMobile,
    acctLimitInputMobile,
    acctOutstandingGroupMobile,
    acctOutstandingInputMobile
);

// EMIs
function setupEmiForm(btn: HTMLButtonElement, form: HTMLFormElement, cancelBtn: HTMLButtonElement | null, descInput: HTMLInputElement, amountInput: HTMLInputElement, accountSelect: HTMLSelectElement) {
    if (!btn || !form) return;
    btn.addEventListener('click', () => {
        if (form.id.includes('mobile')) {
            openSheet(emiBottomSheet);
        } else {
            form.style.display = 'block';
        }
    });
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => { form.style.display = 'none'; form.reset(); });
    }

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
        if (form.id.includes('mobile')) {
            closeAllSheets();
        } else {
            form.style.display = 'none';
        }
        updateUI();
    });
}

setupEmiForm(addEmiBtnDesktop, addEmiFormDesktop, cancelEmiBtnDesktop, emiDescInputDesktop, emiAmountInputDesktop, emiAccountSelectDesktop);
setupEmiForm(addEmiBtnMobile, addEmiFormMobile, null, emiDescInputMobile, emiAmountInputMobile, emiAccountSelectMobile);

// Tabs Desktop & Mobile
if (tabExpenseDesktop) tabExpenseDesktop.addEventListener('click', () => {
    tabExpenseDesktop.classList.add('active');
    tabIncomeDesktop.classList.remove('active');
    txTypeInputDesktop.value = 'expense';
    setupPresets(txPresetsDesktop, txCategoryInputDesktop, txAccountSelectDesktop, 'expense');
});
if (tabIncomeDesktop) tabIncomeDesktop.addEventListener('click', () => {
    tabIncomeDesktop.classList.add('active');
    tabExpenseDesktop.classList.remove('active');
    txTypeInputDesktop.value = 'income';
    setupPresets(txPresetsDesktop, txCategoryInputDesktop, txAccountSelectDesktop, 'income');
});
if (tabExpenseMobile) tabExpenseMobile.addEventListener('click', () => {
    tabExpenseMobile.classList.add('active');
    tabIncomeMobile.classList.remove('active');
    txTypeInputMobile.value = 'expense';
    setupPresets(txPresetsMobile, txCategoryInputMobile, txAccountSelectMobile, 'expense');
});
if (tabIncomeMobile) tabIncomeMobile.addEventListener('click', () => {
    tabIncomeMobile.classList.add('active');
    tabExpenseMobile.classList.remove('active');
    txTypeInputMobile.value = 'income';
    setupPresets(txPresetsMobile, txCategoryInputMobile, txAccountSelectMobile, 'income');
});

// Helper to manage Bottom Sheets
const openSheet = (sheet: HTMLElement) => {
    globalOverlay.classList.add('open');
    sheet.classList.add('open');
    lockScroll();
};

const closeAllSheets = () => {
    globalOverlay.classList.remove('open');
    if (txBottomSheet) txBottomSheet.classList.remove('open');
    if (accountBottomSheet) accountBottomSheet.classList.remove('open');
    if (emiBottomSheet) emiBottomSheet.classList.remove('open');
    unlockScroll();
};

if (mobileAddBtn) mobileAddBtn.addEventListener('click', () => { openSheet(txBottomSheet); });
if (closeTxSheetBtn) closeTxSheetBtn.addEventListener('click', closeAllSheets);
if (closeAccountSheetBtn) closeAccountSheetBtn.addEventListener('click', closeAllSheets);
if (closeEmiSheetBtn) closeEmiSheetBtn.addEventListener('click', closeAllSheets);
if (backFromSettingsBtn) {
    backFromSettingsBtn.addEventListener('click', () => {
        settingsView.style.display = 'none';
        dashboardView.style.display = 'block';
        unlockScroll();
    });
}
if (globalOverlay) globalOverlay.addEventListener('click', closeAllSheets);

if (addAccountBtnMobile) addAccountBtnMobile.addEventListener('click', () => { openSheet(accountBottomSheet); });
if (addEmiBtnMobile) addEmiBtnMobile.addEventListener('click', () => { openSheet(emiBottomSheet); });

// Navigation logic
const resetMobileViews = () => {
    if (homeView) homeView.style.display = 'none';
    if (transactionsViewDesktop) transactionsViewDesktop.style.display = 'none';
    if (accountsMobileView) accountsMobileView.style.display = 'none';
    if (transactionsMobileView) transactionsMobileView.style.display = 'none';
    if (emisMobileView) emisMobileView.style.display = 'none';

    if (navHome) navHome.classList.remove('active');
    if (navAccounts) navAccounts.classList.remove('active');
    if (navTransactions) navTransactions.classList.remove('active');
    if (navEmis) navEmis.classList.remove('active');
};

if (openSettingsBtn) {
    openSettingsBtn.addEventListener('click', () => {
        dashboardView.style.display = 'none';
        settingsView.style.display = 'flex';
        lockScroll();
        updateSettingsUI();
    });
}

function updateSettingsUI() {
    const isDark = state.theme === 'dark';
    themeStatusEl.textContent = isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode';
    if (settingsThemeIcon) {
        settingsThemeIcon.setAttribute('name', isDark ? 'moon-outline' : 'sunny-outline');
    }
}

if (navHome) {
    navHome.addEventListener('click', (e) => {
        e.preventDefault();
        resetMobileViews();
        navHome.classList.add('active');
        homeView.style.display = 'grid';
        transactionsViewDesktop.style.display = 'block';
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

if (navTransactions) {
    navTransactions.addEventListener('click', (e) => {
        e.preventDefault();
        resetMobileViews();
        navTransactions.classList.add('active');
        transactionsMobileView.style.display = 'block';
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

// --- Settings Actions ---
if (themeToggleSettings) {
    themeToggleSettings.addEventListener('click', () => {
        state.theme = state.theme === 'light' ? 'dark' : 'light';
        applyTheme();
        updateSettingsUI();
        saveState();
    });
}

const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `money_manager_backup_${new Date().toISOString().split('T')[0]}.json`);
    dlAnchorElem.click();
};

if (exportBtnSettings) {
    exportBtnSettings.addEventListener('click', handleExport);
}

if (importInputSettings) {
    importInputSettings.addEventListener('change', (e) => {
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
                    applyTheme();
                    updateSettingsUI();
                } else {
                    alert('Invalid backup file format.');
                }
            } catch (err) {
                console.error(err);
                alert('Error parsing backup file.');
            }
            importInputSettings.value = '';
        };
        reader.readAsText(file);
    });
}

// --- Init ---
loadState();
updateUI();

// Global Repayment Function
(window as any).repayDebt = (accountId: string) => {
    const account = state.accounts.find(a => a.id === accountId);
    if (!account) return;

    const currentOutstanding = Math.abs(getAccountBalance(accountId));
    if (currentOutstanding <= 0) {
        alert('No outstanding balance to repay!');
        return;
    }

    const amountStr = prompt(`Repay Credit Card Debt\n\nCurrent Outstanding: ${formatCurrency(currentOutstanding)}\n\nEnter amount to repay:`, currentOutstanding.toString());
    if (!amountStr) return;

    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) {
        alert('Invalid amount');
        return;
    }

    const withdrawableAccounts = state.accounts.filter(a => a.type !== 'credit' && a.type !== 'investment');
    if (withdrawableAccounts.length === 0) {
        alert('No source account available to pay from!');
        return;
    }

    let options = withdrawableAccounts.map((a, i) => `${i + 1}. ${a.name} (${formatCurrency(getAccountBalance(a.id))})`).join('\n');
    const sourceIndexStr = prompt(`Select source account:\n\n${options}`, '1');
    if (!sourceIndexStr) return;

    const sourceIndex = parseInt(sourceIndexStr) - 1;
    const sourceAccount = withdrawableAccounts[sourceIndex];

    if (!sourceAccount) {
        alert('Invalid selection');
        return;
    }

    // Create two transactions: one expense from source, one income (repayment) to CC
    const repaymentDesc = `Repayment for ${account.name}`;

    // 1. Expense from source account
    state.transactions.push({
        id: crypto.randomUUID(),
        amount: amount,
        category: 'Debt Repayment',
        description: repaymentDesc,
        type: 'expense',
        accountId: sourceAccount.id,
        date: new Date().toISOString()
    });

    // 2. Income (Debt Reduction) to Credit Card
    state.transactions.push({
        id: crypto.randomUUID(),
        amount: amount,
        category: 'Repayment',
        description: repaymentDesc,
        type: 'income',
        accountId: account.id,
        date: new Date().toISOString()
    });

    saveState();
    alert('Repayment successful!');
    updateUI();
};
