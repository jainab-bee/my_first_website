
import { supabase, showGlobalNotification, checkAuthAndRedirect, logoutUser } from './main.js';
import { showConnectBankAccountModal, hideConnectBankAccountModal } from './modals.js';

const welcomeMessage = document.getElementById('welcome-message');
const sidebar = document.querySelector('aside');
const sidebarOverlay = document.getElementById('sidebar-overlay');
const mobileMenuButton = document.getElementById('mobile-menu-button');
const notificationBellMobile = document.getElementById('notification-bell-mobile');
const notificationBell = document.getElementById('notification-bell');

const connectAccountButtonMain = document.getElementById('connect-account-button-main');
const connectFirstAccountButton = document.getElementById('connect-first-account-button');
const connectBankAccountForm = document.getElementById('connect-bank-account-form');
const cancelConnectAccountButton = document.getElementById('cancel-connect-account');
const demoModeCheckbox = document.getElementById('demo-mode-checkbox');
const selectBankInput = document.getElementById('select-bank');
const bankUsernameInput = document.getElementById('bank-username');
const bankPasswordInput = document.getElementById('bank-password');
const accountTypeInput = document.getElementById('account-type');
const noBankAccountsConnectedDiv = document.getElementById('no-bank-accounts-connected');
const connectedBankAccountsList = document.getElementById('connected-bank-accounts-list');

 
let connectedBankAccounts = [];

 
function toggleSidebar() {
    if (sidebar) sidebar.classList.toggle('show');
    if (sidebarOverlay) sidebarOverlay.classList.toggle('show');
}

document.addEventListener('DOMContentLoaded', async () => {
 
    const session = await checkAuthAndRedirect(true, '/index.html');

    if (session) {
        const username = session.user.user_metadata?.username || session.user.email;
        if (welcomeMessage) welcomeMessage.textContent = `Welcome, ${username}`;
        
        document.querySelectorAll('.sidebar-link').forEach(link => {
            link.classList.remove('active');
        });
        const bankAccountsLink = document.querySelector('.sidebar-link[href="bank-accounts.html"]');
        if (bankAccountsLink) bankAccountsLink.classList.add('active');

         
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

         
        if (connectAccountButtonMain) {
            connectAccountButtonMain.addEventListener('click', () => {
 
                if (connectBankAccountForm) connectBankAccountForm.reset();
                if (demoModeCheckbox) demoModeCheckbox.checked = false; 
                if (selectBankInput) selectBankInput.disabled = false;
                if (bankUsernameInput) bankUsernameInput.disabled = false;
                if (bankPasswordInput) bankPasswordInput.disabled = false;
                if (accountTypeInput) accountTypeInput.disabled = false;
                showConnectBankAccountModal();
            });
        }
        if (connectFirstAccountButton) {
            connectFirstAccountButton.addEventListener('click', () => {
 
                if (connectBankAccountForm) connectBankAccountForm.reset();
                if (demoModeCheckbox) demoModeCheckbox.checked = false; 
                if (selectBankInput) selectBankInput.disabled = false;
                if (bankUsernameInput) bankUsernameInput.disabled = false;
                if (bankPasswordInput) bankPasswordInput.disabled = false;
                if (accountTypeInput) accountTypeInput.disabled = false;
                showConnectBankAccountModal();
            });
        }
        if (cancelConnectAccountButton) {
            cancelConnectAccountButton.addEventListener('click', hideConnectBankAccountModal);
        }
        if (demoModeCheckbox) {
            demoModeCheckbox.addEventListener('change', () => {
                const isDemo = demoModeCheckbox.checked;
                if (selectBankInput) selectBankInput.disabled = isDemo;
                if (bankUsernameInput) bankUsernameInput.disabled = isDemo;
                if (bankPasswordInput) bankPasswordInput.disabled = isDemo;
                if (accountTypeInput) accountTypeInput.disabled = isDemo;

                if (isDemo) {
                    if (selectBankInput) selectBankInput.value = 'demo-bank-1'; 
                    if (bankUsernameInput) bankUsernameInput.value = 'demoUser';
                    if (bankPasswordInput) bankPasswordInput.value = 'demoPass';
                    if (accountTypeInput) accountTypeInput.value = 'checking';
                } else {
                    if (selectBankInput) selectBankInput.value = '';
                    if (bankUsernameInput) bankUsernameInput.value = '';
                    if (bankPasswordInput) bankPasswordInput.value = '';
                    if (accountTypeInput) accountTypeInput.value = '';
                }
            });
        }
        if (connectBankAccountForm) {
            connectBankAccountForm.addEventListener('submit', handleConnectAccountSubmit);
        }

 
        renderBankAccounts();
    }
});


export function renderBankAccounts() {
    if (!noBankAccountsConnectedDiv || !connectedBankAccountsList) return;

    if (connectedBankAccounts.length === 0) {
        noBankAccountsConnectedDiv.classList.remove('hidden');
        connectedBankAccountsList.classList.add('hidden');
    } else {
        noBankAccountsConnectedDiv.classList.add('hidden');
        connectedBankAccountsList.classList.remove('hidden');
        connectedBankAccountsList.innerHTML = ''; 

        connectedBankAccounts.forEach(account => {
            const accountDiv = document.createElement('div');
            accountDiv.className = 'bg-gray-50 p-4 rounded-lg shadow-sm flex justify-between items-center';
             
            accountDiv.innerHTML = `
                <div>
                    <p class="font-semibold text-gray-800">${account.bankName} - ${account.accountType}</p>
                    <p class="text-sm text-gray-600">${account.username} - **** ${account.accountNumberLast4}</p>
                </div>
                <span class="text-green-600 font-bold">Connected</span>
            `;
            connectedBankAccountsList.appendChild(accountDiv);
        });
    }
}

/**
 * Handles the submission of the "Connect Bank Account" form.
 * @param {Event} e - The form submission event.
 */
function handleConnectAccountSubmit(e) {
    e.preventDefault();

    const isDemo = demoModeCheckbox.checked;
    const bankName = selectBankInput.value;
    const username = bankUsernameInput.value;
    const password = bankPasswordInput.value;
    const accountType = accountTypeInput.value;

    if (!isDemo && (!bankName || !username || !password || !accountType)) {
        showGlobalNotification('Please fill all required fields for bank connection.', 'error');
        return;
    }

    console.log("Attempting to connect bank account (Demo Mode):");
    console.log("Bank Name:", bankName);
    console.log("Username:", username);
    console.log("Account Type:", accountType);

 
    const newAccount = {
        id: Date.now().toString(), 
        bankName: isDemo ? 'Demo Bank' : bankName,
        username: username,
        accountType: accountType,
        accountNumberLast4: Math.floor(1000 + Math.random() * 9000).toString().substring(0,4) 
    };
    connectedBankAccounts.push(newAccount);

    renderBankAccounts(); 
    showGlobalNotification('Bank account connected successfully (demo)!', 'success');
    hideConnectBankAccountModal(); 
}