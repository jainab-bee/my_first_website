
import { supabase, showMessage, formatCurrency, addNotification, showGlobalNotification, checkAuthAndRedirect, logoutUser } from './main.js';
import { showConfirmationModal } from './modals.js';

const welcomeMessage = document.getElementById('welcome-message');
const sidebar = document.querySelector('aside');
const sidebarOverlay = document.getElementById('sidebar-overlay');
const mobileMenuButton = document.getElementById('mobile-menu-button');
const notificationBellMobile = document.getElementById('notification-bell-mobile');
const notificationBell = document.getElementById('notification-bell');

const transactionForm = document.getElementById('transaction-form');
const transactionIdInput = document.getElementById('transaction-id');
const typeInput = document.getElementById('type');
const categoryInput = document.getElementById('category');
const itemInput = document.getElementById('item');
const amountInput = document.getElementById('amount');
const dateInput = document.getElementById('date');
const addTransactionButton = document.getElementById('add-transaction-button');
const transactionMessageBox = document.getElementById('transaction-message-box');
const transactionMessageText = document.getElementById('transaction-message-text');

const transactionsList = document.getElementById('transactions-list');
const filterCategoryInput = document.getElementById('filter-category');
const searchItemInput = document.getElementById('search-item');
const clearFiltersButton = document.getElementById('clear-filters-button');
const noTransactionsMessage = document.getElementById('no-transactions-message');


 
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
        const transactionsLink = document.querySelector('.sidebar-link[href="transactions.html"]');
        if (transactionsLink) transactionsLink.classList.add('active');

 
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

         
        if (transactionForm) {
            transactionForm.addEventListener('submit', handleTransactionFormSubmit);
        }

 
        if (filterCategoryInput) filterCategoryInput.addEventListener('input', fetchTransactions);
        if (searchItemInput) searchItemInput.addEventListener('input', fetchTransactions);
        if (clearFiltersButton) {
            clearFiltersButton.addEventListener('click', () => {
                if (filterCategoryInput) filterCategoryInput.value = '';
                if (searchItemInput) searchItemInput.value = '';
                fetchTransactions();
            });
        }

 
        if (transactionsList) { 
            fetchTransactions();
        }
    }
});


 
export async function fetchTransactions() {
    if (!supabase) {
        showGlobalNotification("Supabase is not initialized. Cannot fetch transactions.", 'error');
 
        if (transactionsList) transactionsList.innerHTML = '';
        if (noTransactionsMessage) noTransactionsMessage.classList.remove('hidden');
        return;
    }

    const user = (await supabase.auth.getSession()).data.session?.user;
    if (!user) return;

    const userId = user.id;

     
    const filterCategory = filterCategoryInput ? filterCategoryInput.value.toLowerCase().trim() : '';
    const searchItem = searchItemInput ? searchItemInput.value.toLowerCase().trim() : '';

    try {
        let query = supabase
            .from('transactions')
            .select('*')
            .eq('user_id', userId)
            .order('date', { ascending: false })
            .order('created_at', { ascending: false });

        if (filterCategory) {
            query = query.ilike('category', `%${filterCategory}%`);
        }
        if (searchItem) {
            query = query.ilike('item', `%${searchItem}%`);
        }

        const { data: transactions, error } = await query;

        if (error) {
            console.error("Supabase Fetch Error:", error);
            throw error;
        }

 
        if (transactionsList) {
            renderAllTransactions(transactions);
        }


    } catch (error) {
 
        if (transactionMessageBox && transactionMessageText) {
            showMessage(transactionMessageBox, transactionMessageText, `Error fetching transactions: ${error.message}`, true);
        } else {
            showGlobalNotification(`Error fetching transactions: ${error.message}`, 'error');
        }
        console.error('Error fetching transactions:', error.message);
    }
}

/**
 * Renders the full list of transactions for the transactions page.
 * @param {Array} transactions - An array of transaction objects.
 */
function renderAllTransactions(transactions) {
    if (!transactionsList) return;  

    transactionsList.innerHTML = '';  
    if (transactions.length === 0) {
        if (noTransactionsMessage) noTransactionsMessage.classList.remove('hidden');
        return;
    } else {
        if (noTransactionsMessage) noTransactionsMessage.classList.add('hidden');
    }

    transactions.forEach(transaction => {
        const row = document.createElement('tr');
        row.className = 'hover:bg-gray-50';
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium" style="color: ${transaction.type === 'income' ? 'var(--color-income-text)' : 'var(--color-expense-text)'};">
                ${transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm" style="color: var(--color-text-dark);">${transaction.category}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm" style="color: var(--color-text-dark);">${transaction.item}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm" style="color: ${transaction.type === 'income' ? 'var(--color-income-text)' : 'var(--color-expense-text)'};">
                ${formatCurrency(transaction.amount)}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm" style="color: var(--color-text-dark);">${transaction.date}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm">
                <button data-id="${transaction.id}" class="edit-btn text-blue-600 hover:text-blue-900 mr-4 transition duration-150 ease-in-out">
                    Edit
                </button>
                <button data-id="${transaction.id}" class="delete-btn text-red-600 hover:text-red-900 transition duration-150 ease-in-out">
                    Delete
                </button>
            </td>
        `;
        transactionsList.appendChild(row);
    });

    document.querySelectorAll('#transactions-list .edit-btn').forEach(button => {
        button.addEventListener('click', (e) => editTransaction(e.target.dataset.id));
    });
    document.querySelectorAll('#transactions-list .delete-btn').forEach(button => {
        button.addEventListener('click', (e) => deleteTransaction(e.target.dataset.id));
    });
}


/**
 * Handles the submission of the transaction form for adding or updating.
 * @param {Event} e - The form submission event.
 */
async function handleTransactionFormSubmit(e) {
    e.preventDefault();

    if (!supabase) {
        showMessage(transactionMessageBox, transactionMessageText, "Supabase is not initialized. Cannot save transaction.", true);
        return;
    }

    const user = (await supabase.auth.getSession()).data.session?.user;
    if (!user) {
        showGlobalNotification('You must be logged in to add transactions.', 'error');
        return;
    }

    const transactionId = transactionIdInput.value;
    const type = typeInput.value;
    const category = categoryInput.value.trim();
    const item = itemInput.value.trim();
    const amount = parseFloat(amountInput.value);
    const date = dateInput.value;

    if (!category || !item || isNaN(amount) || amount <= 0 || !date) {
        showMessage(transactionMessageBox, transactionMessageText, 'Please fill all fields correctly. Amount must be a positive number.', true);
        return;
    }

    const transactionData = {
        user_id: user.id,
        type,
        category,
        item,
        amount,
        date,
        created_at: new Date().toISOString()
    };

    try {
        if (transactionId) {
            const { data, error } = await supabase
                .from('transactions')
                .update(transactionData)
                .eq('id', transactionId)
                .select();

            if (error) throw error;
            showMessage(transactionMessageBox, transactionMessageText, 'Transaction updated successfully!', false);
            await addNotification(`Updated: ${type === 'income' ? '+' : '-'} ₹${amount.toFixed(2)}: ${item}`);

            transactionIdInput.value = '';
            addTransactionButton.textContent = 'Add Transaction';
        } else {
            const { data, error } = await supabase
                .from('transactions')
                .insert([transactionData])
                .select();

            if (error) throw error;
            showMessage(transactionMessageBox, transactionMessageText, 'Transaction added successfully!', false);
            await addNotification(`Added: ${type === 'income' ? '+' : '-'} ₹${amount.toFixed(2)}: ${item}`);
        }

        if (typeInput) typeInput.value = 'expense';
        if (categoryInput) categoryInput.value = '';
        if (itemInput) itemInput.value = '';
        if (amountInput) amountInput.value = '';
        if (dateInput) dateInput.value = '';

        fetchTransactions();
    } catch (error) {
        showMessage(transactionMessageBox, transactionMessageText, `Error saving transaction: ${error.message}`, true);
        console.error('Error saving transaction:', error.message);
    }
}

/**
 * Populates the form with transaction data for editing.
 * @param {string} id - The ID of the transaction to edit.
 */
async function editTransaction(id) {
    if (!supabase) {
        showMessage(transactionMessageBox, transactionMessageText, "Supabase is not initialized. Cannot edit transaction.", true);
        return;
    }
    try {
        const { data, error } = await supabase
            .from('transactions')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        if (transactionIdInput) transactionIdInput.value = data.id;
        if (typeInput) typeInput.value = data.type;
        if (categoryInput) categoryInput.value = data.category;
        if (itemInput) itemInput.value = data.item;
        if (amountInput) amountInput.value = data.amount;
        if (dateInput) dateInput.value = data.date;
        if (addTransactionButton) addTransactionButton.textContent = 'Update Transaction';
    } catch (error) {
        showMessage(transactionMessageBox, transactionMessageText, `Error fetching transaction for edit: ${error.message}`, true);
        console.error('Error fetching transaction for edit:', error.message);
    }
}

/**
 * Deletes a transaction from the database.
 * @param {string} id - The ID of the transaction to delete.
 */
async function deleteTransaction(id) {
    if (!supabase) {
        showMessage(transactionMessageBox, transactionMessageText, "Supabase is not initialized. Cannot delete transaction.", true);
        return;
    }
    showConfirmationModal(
        'Delete Transaction',
        'Are you sure you want to delete this transaction? This action cannot be undone.',
        async () => {
            try {
                const { error } = await supabase
                    .from('transactions')
                    .delete()
                    .eq('id', id);

                if (error) throw error;
                showMessage(transactionMessageBox, transactionMessageText, 'Transaction deleted successfully!', false);
                await addNotification(`Deleted transaction with ID: ${id}`);

                fetchTransactions();
            } catch (error) {
                showMessage(transactionMessageBox, transactionMessageText, `Error deleting transaction: ${error.message}`, true);
                console.error('Error deleting transaction:', error.message);
            }
        },
        'Delete',
        true
    );
}