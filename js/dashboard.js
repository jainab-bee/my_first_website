import { supabase, formatCurrency, showGlobalNotification, checkAuthAndRedirect, logoutUser } from './main.js';

const welcomeMessage = document.getElementById('welcome-message');
const sidebar = document.querySelector('aside');
const sidebarOverlay = document.getElementById('sidebar-overlay');
const mobileMenuButton = document.getElementById('mobile-menu-button');
const notificationBell = document.getElementById('notification-bell');
const notificationBellMobile = document.getElementById('notification-bell-mobile');

const dashboardBalance = document.getElementById('dashboard-balance');
const dashboardTotalIncome = document.getElementById('dashboard-total-income');
const dashboardTotalExpenses = document.getElementById('dashboard-total-expenses');
const latestTransactionsList = document.getElementById('latest-transactions-list');
const noLatestTransactionsMessage = document.getElementById('no-latest-transactions-message');

const dashboardBudgetMonthDisplay = document.getElementById('dashboard-budget-month-display');
const displayBudgetAmount = document.getElementById('display-budget-amount');
const displaySpentAmount = document.getElementById('display-spent-amount');
const displayRemainingStatus = document.getElementById('display-remaining-status');
const displayRemainingAmount = document.getElementById('display-remaining-amount');
const budgetProgressBar = document.getElementById('budget-progress-bar');
const budgetExceededReminder = document.getElementById('budget-exceeded-reminder');
const exceededMessage = document.getElementById('exceeded-message');
const budgetStatusContent = document.getElementById('budget-status-content');
const noBudgetSetMessage = document.getElementById('no-budget-set-message');

const dismissBudgetReminderButton = budgetExceededReminder ? budgetExceededReminder.querySelector('[data-dismiss="#budget-exceeded-reminder"]') : null;
if (dismissBudgetReminderButton) {
    dismissBudgetReminderButton.addEventListener('click', () => {
        budgetExceededReminder.classList.add('hidden');
    });
}


function toggleSidebar() {
    if (sidebar) sidebar.classList.toggle('show');
    if (sidebarOverlay) sidebarOverlay.classList.toggle('show');
}

/**
 * Gets the current month and year in YYYY-MM format for budget period.
 * @returns {string} The current budget period string.
 */
function getCurrentBudgetPeriod() {
    const date = new Date();
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    return `${year}-${month}`;
}
 
document.addEventListener('DOMContentLoaded', async () => {
    const session = await checkAuthAndRedirect(true, '/index.html');

    if (session) {
         
        const username = session.user.user_metadata?.username || session.user.email;
        if (welcomeMessage) welcomeMessage.textContent = `Welcome, ${username}`;

        document.querySelectorAll('.sidebar-link').forEach(link => {
            link.classList.remove('active');
        });
        const dashboardLink = document.querySelector('.sidebar-link[href="dashboard.html"]');
        if (dashboardLink) dashboardLink.classList.add('active');

        if (mobileMenuButton) {
            mobileMenuButton.addEventListener('click', toggleSidebar);
        }
        if (sidebarOverlay) {
            sidebarOverlay.addEventListener('click', toggleSidebar);
        }
        if (notificationBell) {
            notificationBell.addEventListener('click', () => {
                window.location.href = 'notifications.html';
            });
        }
        if (notificationBellMobile) {
            notificationBellMobile.addEventListener('click', () => {
                window.location.href = 'notifications.html';
            });
        }

        const logoutBtn = document.getElementById('logout-button');
        if (logoutBtn) logoutBtn.addEventListener('click', logoutUser);
        
        fetchDashboardData();

        const searchInput = document.querySelector('input[placeholder="Search..."]');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                console.log('Dashboard search input:', e.target.value);
            });
        }
        window.addEventListener('budgetUpdated', fetchMonthlyBudgetStatus);
    }
});

async function fetchDashboardData() {
    if (!supabase) {
        showGlobalNotification("Supabase is not initialized. Cannot fetch dashboard data.", 'error');
        return;
    }
    const user = (await supabase.auth.getSession()).data.session?.user;
    if (!user) {
        console.warn("User not authenticated on dashboard. Data cannot be fetched.");
        return;
    }

    try {

        await Promise.all([
            fetchMonthlyBudgetStatus(),
            (async () => {
                const { data: transactions, error } = await supabase
                    .from('transactions')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('date', { ascending: false })
                    .order('created_at', { ascending: false });

                if (error) {
                    console.error("Supabase Dashboard Data Fetch Error:", error);
                    throw error;
                }

                calculateSummary(transactions);
                renderLatestTransactions(transactions.slice(0, 5));
            })()
        ]);

    } catch (error) {
        showGlobalNotification(`Error loading dashboard data: ${error.message}`, 'error');
        console.error('Error fetching dashboard data:', error.message);
    }
}


/**
 * Calculates and displays summary statistics (total income, expenses, balance).
 * @param {Array} transactions - An array of transaction objects.
 */
function calculateSummary(transactions) {
    let totalIncome = 0;
    let totalExpenses = 0;

    transactions.forEach(t => {
        if (t.type === 'income') {
            totalIncome += parseFloat(t.amount);
        } else {
            totalExpenses += parseFloat(t.amount);
        }
    });

    const balance = totalIncome - totalExpenses;

    if (dashboardTotalIncome) dashboardTotalIncome.textContent = formatCurrency(totalIncome);
    if (dashboardTotalExpenses) dashboardTotalExpenses.textContent = formatCurrency(totalExpenses);
    if (dashboardBalance) {
        dashboardBalance.textContent = formatCurrency(balance);
        if (balance >= 0) {
            dashboardBalance.style.color = 'var(--color-balance-positive)';
        } else {
            dashboardBalance.style.color = 'var(--color-balance-negative)';
        }
    }
}

/**
 * Renders the list of latest transactions for the dashboard.
 * @param {Array} transactions - An array of transaction objects.
 */
function renderLatestTransactions(transactions) {
    if (!latestTransactionsList) return;
    latestTransactionsList.innerHTML = '';

    if (transactions.length === 0) {
        if (noLatestTransactionsMessage) noLatestTransactionsMessage.classList.remove('hidden');
        return;
    } else {
        if (noLatestTransactionsMessage) noLatestTransactionsMessage.classList.add('hidden');
    }

    transactions.forEach(transaction => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50';
        
        const displayNote = transaction.description || transaction.category || 'N/A';

        const displayDate = new Date(transaction.date).toLocaleDateString();

        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium" style="color: ${transaction.type === 'income' ? 'var(--color-income-text)' : 'var(--color-expense-text)'};">
                ${transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm" style="color: var(--color-text-dark);">${displayNote}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm" style="color: ${transaction.type === 'income' ? 'var(--color-income-text)' : 'var(--color-expense-text)'};">
                ${formatCurrency(transaction.amount)}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm" style="color: var(--color-text-dark);">${displayDate}</td>
        `;
        latestTransactionsList.appendChild(row);
    });
}

export async function fetchMonthlyBudgetStatus() {
    console.log("[fetchMonthlyBudgetStatus] Starting fetch for monthly budget status.");
    if (!supabase) {
        console.error("[fetchMonthlyBudgetStatus] Supabase is not initialized.");
        return;
    }

    const user = (await supabase.auth.getSession()).data.session?.user;
    if (!user) {
        console.warn("[fetchMonthlyBudgetStatus] User not logged in. Aborting budget fetch.");
        return;
    }
    console.log("[fetchMonthlyBudgetStatus] User ID:", user.id);

    const currentPeriod = getCurrentBudgetPeriod();
    if (dashboardBudgetMonthDisplay) {
        const date = new Date();
        const monthName = date.toLocaleString('default', { month: 'long' });
        dashboardBudgetMonthDisplay.textContent = `${monthName} ${date.getFullYear()}`;
    }

    try {
        const { data: budgetData, error: budgetError } = await supabase
            .from('budgets')
            .select('amount')
            .eq('user_id', user.id)
            .eq('budget_period', currentPeriod)
            .single();

        console.log("[fetchMonthlyBudgetStatus] Budget data raw:", budgetData, "Error:", budgetError);

        let monthlyBudget = 0;
        if (budgetError && budgetError.code !== 'PGRST116') {
            throw budgetError;
        } else if (budgetData) {
            monthlyBudget = parseFloat(budgetData.amount);
            console.log("[fetchMonthlyBudgetStatus] Monthly budget found:", monthlyBudget);
            if (noBudgetSetMessage) noBudgetSetMessage.classList.add('hidden');
            if (budgetStatusContent) budgetStatusContent.classList.remove('hidden');
        } else {
            console.log("[fetchMonthlyBudgetStatus] No budget set for current period.");
            if (noBudgetSetMessage) noBudgetSetMessage.classList.remove('hidden');
            if (budgetStatusContent) budgetStatusContent.classList.add('hidden');
            if (budgetExceededReminder) budgetExceededReminder.classList.add('hidden');
            return;
        }
        const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
        const endOfMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59, 999).toISOString();
        console.log(`[fetchMonthlyBudgetStatus] Fetching transactions from ${startOfMonth} to ${endOfMonth}`);


        const { data: transactions, error: transactionsError } = await supabase
            .from('transactions')
            .select('amount, type, date')
            .eq('user_id', user.id)
            .gte('date', startOfMonth)
            .lte('date', endOfMonth);

        console.log("[fetchMonthlyBudgetStatus] Transactions for budget comparison raw:", transactions, "Error:", transactionsError);

        if (transactionsError) throw transactionsError;

        let totalSpent = 0;
        transactions.forEach(transaction => {
            if (transaction.type === 'expense') {
                totalSpent += parseFloat(transaction.amount);
            }
        });
        console.log("[fetchMonthlyBudgetStatus] Total spent this month:", totalSpent);

        const remaining = monthlyBudget - totalSpent;
        const percentageSpent = monthlyBudget > 0 ? (totalSpent / monthlyBudget) * 100 : 0;

        if (displayBudgetAmount) displayBudgetAmount.textContent = formatCurrency(monthlyBudget);
        if (displaySpentAmount) displaySpentAmount.textContent = formatCurrency(totalSpent);

        if (displayRemainingAmount) {
            displayRemainingAmount.textContent = formatCurrency(Math.abs(remaining));
        }

        if (displayRemainingStatus) {
            if (remaining >= 0) {
                displayRemainingStatus.textContent = 'Remaining: ';
                displayRemainingStatus.classList.remove('text-red-600');
                displayRemainingStatus.classList.add('text-green-600');
            } else {
                displayRemainingStatus.textContent = 'Over Budget By: ';
                displayRemainingStatus.classList.remove('text-green-600');
                displayRemainingStatus.classList.add('text-red-600');
            }
        }

        if (budgetProgressBar) {
            let progressBarWidth = Math.min(100, percentageSpent);
            budgetProgressBar.style.width = `${progressBarWidth}%`;

            if (percentageSpent < 75) {
                budgetProgressBar.classList.remove('bg-yellow-500', 'bg-red-600');
                budgetProgressBar.classList.add('bg-blue-600');
            } else if (percentageSpent >= 75 && percentageSpent < 100) {
                budgetProgressBar.classList.remove('bg-blue-600', 'bg-red-600');
                budgetProgressBar.classList.add('bg-yellow-500');
            } else {
                budgetProgressBar.classList.remove('bg-blue-600', 'bg-yellow-500');
                budgetProgressBar.classList.add('bg-red-600');
            }
        }

        if (remaining < 0) {
            if (budgetExceededReminder) {
                exceededMessage.textContent = `You have spent ${formatCurrency(Math.abs(remaining))} more than your monthly budget of ${formatCurrency(monthlyBudget)}!`;
                budgetExceededReminder.classList.remove('hidden');
            }
        } else {
            if (budgetExceededReminder) budgetExceededReminder.classList.add('hidden');
        }
        console.log("[fetchMonthlyBudgetStatus] Budget status updated successfully.");

    } catch (error) {
        console.error("[fetchMonthlyBudgetStatus] Error fetching monthly budget status:", error.message);

        if (budgetExceededReminder) {
            exceededMessage.textContent = `Could not load budget status: ${error.message}`;
            budgetExceededReminder.classList.remove('hidden');
        }
    }
}
