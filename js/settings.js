
import { supabase, showMessage, showGlobalNotification, checkAuthAndRedirect, logoutUser, addNotification } from './main.js';
import { showConfirmationModal } from './modals.js';
 
import { fetchTransactions } from './transactions.js';
import { fetchBills, fetchNotifications } from './notifications.js';
import { fetchTransactionsForCalendar, fetchTransactionsForChart } from './cards.js';

 
const welcomeMessage = document.getElementById('welcome-message');
const sidebar = document.querySelector('aside');
const sidebarOverlay = document.getElementById('sidebar-overlay');
const mobileMenuButton = document.getElementById('mobile-menu-button');
const notificationBellMobile = document.getElementById('notification-bell-mobile');
const notificationBell = document.getElementById('notification-bell');

const profileAccountManagementToggle = document.getElementById('profile-account-management-toggle');
const profileAccountManagementContent = document.getElementById('profile-account-management-content');

const changePasswordToggle = document.getElementById('change-password-toggle');
const changePasswordFormContainer = document.getElementById('change-password-form-container');
const changePasswordForm = document.getElementById('change-password-form');
const currentPasswordInput = document.getElementById('current-password');
const newPasswordInput = document.getElementById('new-password');
const confirmNewPasswordInput = document.getElementById('confirm-new-password');
const passwordMessageBox = document.getElementById('password-message-box');
const passwordMessageText = document.getElementById('password-message-text');

const updateEmailToggle = document.getElementById('update-email-toggle');
const updateEmailFormContainer = document.getElementById('update-email-form-container');
const updateEmailForm = document.getElementById('update-email-form');
const currentEmailInput = document.getElementById('current-email');
const newEmailInput = document.getElementById('new-email');
const emailMessageBox = document.getElementById('email-message-box');
const emailMessageText = document.getElementById('email-message-text');

const deleteAccountButton = document.getElementById('delete-account-button');
const deleteAccountMessageBox = document.getElementById('delete-account-message-box');
const deleteAccountMessageText = document.getElementById('delete-account-message-text');

const darkModeToggle = document.getElementById('dark-mode-toggle');

const clearAllDataButton = document.getElementById('clear-all-data-button');
const clearDataMessageBox = document.getElementById('clear-data-message-box');
const clearDataMessageText = document.getElementById('clear-data-message-text');

 
const monthlyBudgetForm = document.getElementById('monthly-budget-form');
const budgetAmountInput = document.getElementById('budget-amount');
const budgetMonthDisplay = document.getElementById('budget-month-display');
const budgetMessageBox = document.getElementById('budget-message-box');
const budgetMessageText = document.getElementById('budget-message-text');
 
function toggleSection(contentElement, toggleHeader) {
    if (!contentElement || !toggleHeader) {
        console.error("Missing content element or toggle header for toggleSection.", { contentElement, toggleHeader });
        return;
    }

    contentElement.classList.toggle('hidden');

    const iconSpan = toggleHeader.querySelector('.toggle-icon');

    if (iconSpan) {
        if (contentElement.classList.contains('hidden')) {
            iconSpan.style.transform = 'rotate(0deg)';  
        } else {
            iconSpan.style.transform = 'rotate(90deg)';  
        }
    }
}

function toggleSidebar() {
    if (sidebar) sidebar.classList.toggle('show');
    if (sidebarOverlay) sidebarOverlay.classList.toggle('show');
}
 
function getCurrentBudgetPeriod() {
    const date = new Date();
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    return `${year}-${month}`;
}

async function loadMonthlyBudget() {
    if (!supabase) {
        console.warn("Supabase is not initialized. Cannot load monthly budget.");
        return;
    }

    const currentPeriod = getCurrentBudgetPeriod();
    if (budgetMonthDisplay) {
        const date = new Date();
        const monthName = date.toLocaleString('default', { month: 'long' });
        budgetMonthDisplay.textContent = `${monthName} ${date.getFullYear()}`;
    }

    try {
        const { data, error } = await supabase
            .from('budgets')
            .select('amount')
            .eq('user_id', (await supabase.auth.getSession()).data.session?.user.id)
            .eq('budget_period', currentPeriod)
            .single();

        if (error && error.code !== 'PGRST116') {
            throw error;
        }

        if (data) {
            budgetAmountInput.value = data.amount;
            showMessage(budgetMessageBox, budgetMessageText, `Budget for this month loaded.`, false);
        } else {
            budgetAmountInput.value = '';
            showMessage(budgetMessageBox, budgetMessageText, `No budget set for this month.`, false);
        }
    } catch (error) {
        showMessage(budgetMessageBox, budgetMessageText, `Error loading budget: ${error.message}`, true);
        console.error("Error loading monthly budget:", error);
    }
}
 
async function handlePasswordChange(e) {
    e.preventDefault();
    if (!supabase) {
        showMessage(passwordMessageBox, passwordMessageText, "Supabase is not initialized. Cannot change password.", true);
        return;
    }

    const newPassword = newPasswordInput.value;
    const confirmNewPassword = confirmNewPasswordInput.value;

    if (!newPassword || newPassword.length < 6) {
        showMessage(passwordMessageBox, passwordMessageText, 'New password must be at least 6 characters long.', true);
        return;
    }
    if (newPassword !== confirmNewPassword) {
        showMessage(passwordMessageBox, passwordMessageText, 'New passwords do not match.', true);
        return;
    }

    try {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw error;

        showMessage(passwordMessageBox, passwordMessageText, 'Password updated successfully! Please re-login with your new password.', false);
        if (changePasswordForm) changePasswordForm.reset();
        await logoutUser();
    } catch (error) {
        showMessage(passwordMessageBox, passwordMessageText, `Error updating password: ${error.message}`, true);
        console.error('Password update error:', error.message);
    }
}

async function handleEmailUpdate(e) {
    e.preventDefault();
    if (!supabase) {
        showMessage(emailMessageBox, emailMessageText, "Supabase is not initialized. Cannot update email.", true);
        return;
    }

    const newEmail = newEmailInput.value;
    const user = (await supabase.auth.getSession()).data.session?.user;

    if (!user) {
        showMessage(emailMessageBox, emailMessageText, 'You must be logged in to update email.', true);
        return;
    }
    if (!newEmail || newEmail === user.email) {
        showMessage(emailMessageBox, emailMessageText, 'Please enter a valid new email address different from your current one.', true);
        return;
    }

    try {
        const { error } = await supabase.auth.updateUser({ email: newEmail });
        if (error) throw error;
        showMessage(emailMessageBox, emailMessageText, 'Email update initiated. Please check your NEW email for a confirmation link.', false);
        if (updateEmailForm) updateEmailForm.reset();
        populateSettingsProfile();
    }
    catch (error) {
        showMessage(emailMessageBox, emailMessageText, `Error updating email: ${error.message}`, true);
        console.error('Email update error:', error.message);
    }
}

async function handleDeleteAccount() {
    if (!supabase) {
        showMessage(deleteAccountMessageBox, deleteAccountMessageText, "Supabase is not initialized. Cannot delete account.", true);
        return;
    }
    const user = (await supabase.auth.getSession()).data.session?.user;
    if (!user) {
        showMessage(deleteAccountMessageBox, deleteAccountMessageText, 'You must be logged in to delete account.', true);
        return;
    }

    showConfirmationModal(
        'Delete Account',
        'Are you absolutely sure you want to delete your account? This will permanently delete ALL your data (transactions, bills, notifications) and cannot be undone. You will be logged out.',
        async () => {
            try {
                await supabase.from('transactions').delete().eq('user_id', user.id);
                await supabase.from('bills').delete().eq('user_id', user.id);
                await supabase.from('notifications').delete().eq('user_id', user.id);

                await logoutUser();
                showGlobalNotification('Your data has been cleared. For complete account deletion, please contact support or delete your user from the Supabase dashboard.', 'info');
            } catch (error) {
                showMessage(deleteAccountMessageBox, deleteAccountMessageText, `Error deleting account data: ${error.message}`, true);
                console.error('Account deletion error:', error.message);
            }
        },
        'Yes, Delete My Account',
        true
    );
}

function initDarkModeToggle() {
    if (!darkModeToggle) return;

    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || (savedTheme === null && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.body.classList.add('dark');
        darkModeToggle.checked = true;
    } else {
        document.body.classList.remove('dark');
        darkModeToggle.checked = false;
    }

    darkModeToggle.addEventListener('change', () => {
        if (darkModeToggle.checked) {
            document.body.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.body.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    });
}

async function handleClearAllData() {
    if (!supabase) {
        showMessage(clearDataMessageBox, clearDataMessageText, "Supabase is not initialized. Cannot clear data.", true);
        return;
    }
    const user = (await supabase.auth.getSession()).data.session?.user;
    if (!user) {
        showMessage(clearDataMessageBox, clearDataMessageText, 'You must be logged in to clear data.', true);
        return;
    }

    showConfirmationModal(
        'Clear All Data',
        'Are you absolutely sure you want to delete ALL your transactions, bills, and notifications? This action cannot be undone.',
        async () => {
            try {
                await supabase.from('transactions').delete().eq('user_id', user.id);
                await supabase.from('bills').delete().eq('user_id', user.id);
                await supabase.from('notifications').delete().eq('user_id', user.id);

                showMessage(clearDataMessageBox, clearDataMessageText, 'All your data has been successfully cleared!', false);

                if (typeof fetchTransactions === 'function') fetchTransactions();
                (async () => {
                    try {
                        const { fetchDashboardData } = await import('./dashboard.js');
                        if (fetchDashboardData) fetchDashboardData();
                    } catch (error) {
                        console.warn("Could not import dashboard.js or fetchDashboardData (expected if on settings page):", error);
                    }
                })();

                if (typeof fetchBills === 'function') fetchBills();
                if (typeof fetchNotifications === 'function') fetchNotifications();
                if (typeof fetchTransactionsForCalendar === 'function') fetchTransactionsForCalendar();
                if (typeof fetchTransactionsForChart === 'function') fetchTransactionsForChart();

            } catch (error) {
                showMessage(clearDataMessageBox, clearDataMessageText, `Error clearing data: ${error.message}`, true);
                console.error('Clear data error:', error.message);
            }
        },
        'Yes, Clear All Data',
        true
    );
}

async function handleMonthlyBudgetSubmit(e) {
    e.preventDefault();
    if (!supabase) {
        showMessage(budgetMessageBox, budgetMessageText, "Supabase is not initialized. Cannot set budget.", true);
        return;
    }

    const budgetAmount = parseFloat(budgetAmountInput.value);
    if (isNaN(budgetAmount) || budgetAmount <= 0) {
        showMessage(budgetMessageBox, budgetMessageText, "Please enter a valid positive number for the budget.", true);
        return;
    }

    const user = (await supabase.auth.getSession()).data.session?.user;
    if (!user) {
        showMessage(budgetMessageBox, budgetMessageText, 'You must be logged in to set a budget.', true);
        return;
    }

    const currentPeriod = getCurrentBudgetPeriod();

    try {
        const { data, error } = await supabase
            .from('budgets')
            .upsert(
                {
                    user_id: user.id,
                    budget_period: currentPeriod,
                    amount: budgetAmount,
                    updated_at: new Date().toISOString()
                },
                {
                    onConflict: 'user_id, budget_period',
                    ignoreDuplicates: false
                }
            )
            .select()
            .single();

        if (error) throw error;

        showMessage(budgetMessageBox, budgetMessageText, `Budget for ${currentPeriod} set successfully!`, false);
        console.log("Budget upserted:", data);

        if (typeof window.dispatchEvent === 'function') {
             window.dispatchEvent(new CustomEvent('budgetUpdated'));
        }

    } catch (error) {
        showMessage(budgetMessageBox, budgetMessageText, `Error setting budget: ${error.message}`, true);
        console.error("Error setting monthly budget:", error);
    }
}
 
document.addEventListener('DOMContentLoaded', async () => {
    const session = await checkAuthAndRedirect(true, '/login.html');

    if (session) {
        if (welcomeMessage) welcomeMessage.textContent = `Welcome, ${session.user.email}`;
        document.querySelectorAll('.sidebar-link').forEach(link => {
            link.classList.remove('active');
        });
        const settingsLink = document.querySelector('.sidebar-link[href="settings.html"]');
        if (settingsLink) settingsLink.classList.add('active');

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

        if (profileAccountManagementToggle && profileAccountManagementContent) {
            profileAccountManagementToggle.addEventListener('click', () => {
                toggleSection(profileAccountManagementContent, profileAccountManagementToggle);
            });
            const iconSpan = profileAccountManagementToggle.querySelector('.toggle-icon');
            if (iconSpan) {
                iconSpan.style.transform = 'rotate(0deg)';
            }
        }

        if (changePasswordToggle && changePasswordFormContainer) {
            changePasswordToggle.addEventListener('click', () => {
                toggleSection(changePasswordFormContainer, changePasswordToggle);
            });
            const iconSpan = changePasswordToggle.querySelector('.toggle-icon');
            if (iconSpan) {
                iconSpan.style.transform = 'rotate(0deg)';
            }
        }

        if (updateEmailToggle && updateEmailFormContainer) {
            updateEmailToggle.addEventListener('click', () => {
                toggleSection(updateEmailFormContainer, updateEmailToggle);
            });
            const iconSpan = updateEmailToggle.querySelector('.toggle-icon');
            if (iconSpan) {
                iconSpan.style.transform = 'rotate(0deg)';
            }
        }

        if (changePasswordForm) changePasswordForm.addEventListener('submit', handlePasswordChange);
        if (updateEmailForm) updateEmailForm.addEventListener('submit', handleEmailUpdate);
        if (deleteAccountButton) deleteAccountButton.addEventListener('click', handleDeleteAccount);
        if (clearAllDataButton) clearAllDataButton.addEventListener('click', handleClearAllData);

        populateSettingsProfile();
        initDarkModeToggle();

 
        if (monthlyBudgetForm) {
            monthlyBudgetForm.addEventListener('submit', handleMonthlyBudgetSubmit);
            await loadMonthlyBudget();
        }
 
    }
});

export async function populateSettingsProfile() {
    if (!supabase) {
        console.warn("Supabase is not initialized. Cannot populate profile email.");
        return;
    }
    const { data: { user } } = await supabase.auth.getSession();
    if (user && currentEmailInput) {
        currentEmailInput.value = user.email || '';
    }
}