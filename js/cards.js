import { supabase, formatCurrency, showGlobalNotification, checkAuthAndRedirect, logoutUser } from './main.js';

const welcomeMessage = document.getElementById('welcome-message');
const sidebar = document.querySelector('aside');
const sidebarOverlay = document.getElementById('sidebar-overlay');
const mobileMenuButton = document.getElementById('mobile-menu-button');
const notificationBellMobile = document.getElementById('notification-bell-mobile');
const notificationBell = document.getElementById('notification-bell');

const calendarContainer = document.getElementById('calendar-container');
const incomeExpenseChartCanvas = document.getElementById('incomeExpenseChart');
const chartIncomeAmountSpan = document.getElementById('chart-income-amount');
const chartExpenseAmountSpan = document.getElementById('chart-expense-amount');

export const HIGH_EXPENSE_THRESHOLD = 500;
export const HIGH_INCOME_THRESHOLD = 1000;

let currentCalendarDate = new Date();
let incomeExpenseChart = null;

function toggleSidebar() {
    if (sidebar) sidebar.classList.toggle('show');
    if (sidebarOverlay) sidebarOverlay.classList.toggle('show');
}

document.addEventListener('DOMContentLoaded', async () => {
    const session = await checkAuthAndRedirect(true, '/index.html');

    if (session) {
        if (welcomeMessage) welcomeMessage.textContent = `Welcome, ${session.user.email}`;
        
        document.querySelectorAll('.sidebar-link').forEach(link => {
            link.classList.remove('active');
        });
        const cardsLink = document.querySelector('.sidebar-link[href="cards.html"]');
        if (cardsLink) cardsLink.classList.add('active');

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

        fetchTransactionsForCalendar();
        fetchTransactionsForChart();
    }
});

export async function fetchTransactionsForCalendar() {
    if (!supabase) {
        showGlobalNotification("Supabase is not initialized. Cannot fetch transactions for calendar.", 'error');
        renderCalendar({});
        return;
    }

    const user = (await supabase.auth.getSession()).data.session?.user;
    if (!user) {
        console.warn("User not authenticated for calendar data. This should be handled by checkAuthAndRedirect.");
        renderCalendar({});
        return;
    }

    const userId = user.id;
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();

    const startDate = new Date(year, month, 1).toISOString().split('T')[0];
    const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];

    try {
        const { data: transactions, error: transactionsError } = await supabase
            .from('transactions')
            .select('*')
            .eq('user_id', userId)
            .gte('date', startDate)
            .lte('date', endDate);

        if (transactionsError) throw transactionsError;

        const { data: bills, error: billsError } = await supabase
            .from('bills')
            .select('*')
            .eq('user_id', userId)
            .gte('due_date', startDate)
            .lte('due_date', endDate);

        if (billsError) throw billsError;

        const dailyNetAmounts = {};
        transactions.forEach(t => {
            const dateObj = new Date(t.date);
            const day = dateObj.getDate();
            if (!dailyNetAmounts[day]) {
                dailyNetAmounts[day] = { income: 0, expense: 0, hasBill: false };
            }
            if (t.type === 'income') {
                dailyNetAmounts[day].income += t.amount;
            } else {
                dailyNetAmounts[day].expense += t.amount;
            }
        });

        bills.forEach(bill => {
            const dateObj = new Date(bill.due_date);
            const day = dateObj.getDate();
            if (!dailyNetAmounts[day]) {
                dailyNetAmounts[day] = { income: 0, expense: 0, hasBill: false };
            }
            dailyNetAmounts[day].hasBill = true;
        });

        renderCalendar(dailyNetAmounts);

    } catch (error) {
        console.error('Error fetching data for calendar:', error.message);
        showGlobalNotification(`Error loading calendar data: ${error.message}`, 'error');
        renderCalendar({});
    }
}

export function renderCalendar(dailyData = {}) {
    if (!calendarContainer) return;

    calendarContainer.innerHTML = '';

    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const numDays = lastDayOfMonth.getDate();
    const startDayOfWeek = firstDayOfMonth.getDay();

    const monthNames = ["January", "February", "March", "April", "May", "June",
                                         "July", "August", "September", "October", "November", "December"];
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    const header = document.createElement('div');
    header.className = 'flex justify-between items-center mb-4';
    header.innerHTML = `
        <button id="prev-month" class="px-3 py-1 rounded-lg bg-gray-200 hover:bg-gray-300 transition duration-200 text-gray-800">&lt;</button>
        <h3 class="text-lg font-semibold text-gray-800">${monthNames[month]} ${year}</h3>
        <button id="next-month" class="px-3 py-1 rounded-lg bg-gray-200 hover:bg-gray-300 transition duration-200 text-gray-800">&gt;</button>
    `;
    calendarContainer.appendChild(header);

    const dayHeaders = document.createElement('div');
    dayHeaders.className = 'calendar-grid mb-2';
    dayNames.forEach(day => {
        const div = document.createElement('div');
        div.className = 'calendar-day-header text-sm';
        div.textContent = day;
        dayHeaders.appendChild(div);
    });
    calendarContainer.appendChild(dayHeaders);

    const daysGrid = document.createElement('div');
    daysGrid.className = 'calendar-grid';

    for (let i = 0; i < startDayOfWeek; i++) {
        const div = document.createElement('div');
        div.className = 'calendar-day empty';
        daysGrid.appendChild(div);
    }

    for (let day = 1; day <= numDays; day++) {
        const div = document.createElement('div');
        div.className = 'calendar-day';

        const dayNumberSpan = document.createElement('span');
        dayNumberSpan.className = 'day-number';
        dayNumberSpan.textContent = day;
        div.appendChild(dayNumberSpan);

        const todayDate = new Date();
        if (year === todayDate.getFullYear() && month === todayDate.getMonth() && day === todayDate.getDate()) {
            div.classList.add('current-day');
        }

        const dayStats = dailyData[day];
        if (dayStats) {
            const totalIncomeForDay = dayStats.income || 0;
            const totalExpenseForDay = dayStats.expense || 0;
            const hasBillDue = dayStats.hasBill || false;

            const indicatorsContainer = document.createElement('div');
            indicatorsContainer.className = 'day-indicators';

            if (totalExpenseForDay > totalIncomeForDay && totalExpenseForDay >= HIGH_EXPENSE_THRESHOLD) {
                const expenseIndicator = document.createElement('div');
                expenseIndicator.className = 'expense-indicator';
                indicatorsContainer.appendChild(expenseIndicator);
            }
            else if (totalIncomeForDay >= totalExpenseForDay && totalIncomeForDay >= HIGH_INCOME_THRESHOLD) {
                const incomeIndicator = document.createElement('div');
                incomeIndicator.className = 'income-indicator';
                indicatorsContainer.appendChild(incomeIndicator);
            }
            else if (hasBillDue) {
                const billIndicator = document.createElement('div');
                billIndicator.className = 'bill-indicator';
                indicatorsContainer.appendChild(billIndicator);
            }
            else if (totalIncomeForDay > 0) {
                const incomeIndicator = document.createElement('div');
                incomeIndicator.className = 'income-indicator';
                indicatorsContainer.appendChild(incomeIndicator);
            }
            else if (totalExpenseForDay > 0) {
                const expenseIndicator = document.createElement('div');
                expenseIndicator.className = 'expense-indicator';
                indicatorsContainer.appendChild(expenseIndicator);
            }
            div.appendChild(indicatorsContainer);
        }
        daysGrid.appendChild(div);
    }
    calendarContainer.appendChild(daysGrid);

    const prevMonthButton = document.getElementById('prev-month');
    const nextMonthButton = document.getElementById('next-month');

    if (prevMonthButton) {
        prevMonthButton.addEventListener('click', () => {
            currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
            fetchTransactionsForCalendar();
        });
    }
    if (nextMonthButton) {
        nextMonthButton.addEventListener('click', () => {
            currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
            fetchTransactionsForCalendar();
        });
    }
}

export async function fetchTransactionsForChart() {
    if (!supabase) {
        showGlobalNotification("Supabase is not initialized. Cannot fetch transactions for chart.", 'error');
        renderChart(0, 0);
        return;
    }

    const user = (await supabase.auth.getSession()).data.session?.user;
    if (!user) {
        console.warn("User not authenticated for chart data. This should be handled by checkAuthAndRedirect.");
        renderChart(0, 0);
        return;
    }

    const userId = user.id;

    try {
        const { data: transactions, error } = await supabase
            .from('transactions')
            .select('*')
            .eq('user_id', userId);

        if (error) throw error;

        let totalIncome = 0;
        let totalExpense = 0;
        transactions.forEach(t => {
            if (t.type === 'income') {
                totalIncome += t.amount;
            } else {
                totalExpense += t.amount;
            }
        });

        renderChart(totalIncome, totalExpense);

    } catch (error) {
        console.error('Error fetching transactions for chart:', error.message);
        showGlobalNotification(`Error loading chart data: ${error.message}`, 'error');
        renderChart(0, 0);
    }
}

export function renderChart(totalIncome, totalExpense) {
    if (incomeExpenseChart) {
        incomeExpenseChart.destroy();
    }

    if (chartIncomeAmountSpan) chartIncomeAmountSpan.textContent = formatCurrency(totalIncome);
    if (chartExpenseAmountSpan) chartExpenseAmountSpan.textContent = formatCurrency(totalExpense);

    const data = {
        labels: ['Income', 'Expense'],
        datasets: [{
            data: [totalIncome, totalExpense],
            backgroundColor: [
                getComputedStyle(document.documentElement).getPropertyValue('--chart-income-color').trim(),
                getComputedStyle(document.documentElement).getPropertyValue('--chart-expense-color').trim()
            ],
            hoverBackgroundColor: [
                getComputedStyle(document.documentElement).getPropertyValue('--chart-income-color').trim(),
                getComputedStyle(document.documentElement).getPropertyValue('--chart-expense-color').trim()
            ],
            borderWidth: 0
        }]
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '70%',
        plugins: {
            legend: {
                display: false
            },
            tooltip: {
                callbacks: {
                    label: function(context) {
                        let label = context.label || '';
                        if (label) {
                            label += ': ';
                        }
                        if (context.parsed !== null) {
                            label += formatCurrency(context.parsed);
                        }
                        return label;
                    }
                }
            }
        }
    };

    if (incomeExpenseChartCanvas) {
        incomeExpenseChart = new Chart(incomeExpenseChartCanvas, {
            type: 'doughnut',
            data: data,
            options: options
        });
    }
}