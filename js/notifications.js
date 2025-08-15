
import { supabase, showMessage, showGlobalNotification, checkAuthAndRedirect, logoutUser, formatCurrency, addNotification } from './main.js';
import { showConfirmationModal } from './modals.js';

const welcomeMessage = document.getElementById('welcome-message');
const sidebar = document.querySelector('aside');
const sidebarOverlay = document.getElementById('sidebar-overlay');
const mobileMenuButton = document.getElementById('mobile-menu-button');
const notificationBellMobile = document.getElementById('notification-bell-mobile');
const notificationBell = document.getElementById('notification-bell');

const notificationsList = document.getElementById('notifications-list');
const noNotificationsMessage = document.getElementById('no-notifications-message');

const billsList = document.getElementById('bills-list');
const noBillsMessage = document.getElementById('no-bills-message');
const addBillButton = document.getElementById('add-bill-button');

const billModal = document.getElementById('bill-modal');
const billModalTitle = document.getElementById('bill-modal-title');
const billForm = document.getElementById('bill-form');
const billIdInput = document.getElementById('bill-id');
const billNameInput = document.getElementById('bill-name');
const billAmountInput = document.getElementById('bill-amount');
const billDueDateInput = document.getElementById('bill-due-date');
const billIsPaidInput = document.getElementById('bill-is-paid');
const cancelBillButton = document.getElementById('cancel-bill-button');
const submitBillButton = document.getElementById('submit-bill-button');


function toggleSidebar() {
    if (sidebar) sidebar.classList.toggle('show');
    if (sidebarOverlay) sidebarOverlay.classList.toggle('show');
}

function showBillModal(title, submitBtnText) {
    if (billModal) billModal.classList.add('show');
    if (billModalTitle) billModalTitle.textContent = title;
    if (submitBillButton) submitBillButton.textContent = submitBtnText;
}

function hideBillModal() {
    if (billModal) billModal.classList.remove('show');
    if (billForm) billForm.reset();
    if (billIdInput) billIdInput.value = '';
    if (billIsPaidInput) billIsPaidInput.checked = false;
}


document.addEventListener('DOMContentLoaded', async () => {
    const session = await checkAuthAndRedirect(true, '/login.html');

    if (session) {
     const username = session.user.user_metadata?.username || session.user.email;
        if (welcomeMessage) welcomeMessage.textContent = `Welcome, ${username}`;
        document.querySelectorAll('.sidebar-link').forEach(link => {
            link.classList.remove('active');
        });
        const notificationsLink = document.querySelector('.sidebar-link[href="notifications.html"]');
        if (notificationsLink) notificationsLink.classList.add('active');

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

        if (addBillButton) addBillButton.addEventListener('click', () => showBillModal('Add New Bill', 'Add Bill'));
        if (cancelBillButton) cancelBillButton.addEventListener('click', hideBillModal);
        if (billForm) billForm.addEventListener('submit', handleBillFormSubmit);

        fetchNotifications();
        fetchBills();
    }
});


export async function fetchNotifications() {
    if (!supabase) {
        showGlobalNotification("Supabase is not initialized. Cannot fetch notifications.", 'error');
        if (notificationsList) notificationsList.innerHTML = '';
        if (noNotificationsMessage) noNotificationsMessage.classList.remove('hidden');
        return;
    }

    const user = (await supabase.auth.getSession()).data.session?.user;
    if (!user) return;

    try {
        const { data: notifications, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (notificationsList) {
            notificationsList.innerHTML = '';
            if (notifications.length === 0) {
                if (noNotificationsMessage) noNotificationsMessage.classList.remove('hidden');
            } else {
                if (noNotificationsMessage) noNotificationsMessage.classList.add('hidden');
                notifications.forEach(notification => {
                    const notificationItem = document.createElement('div');
                    notificationItem.className = 'bg-white p-4 rounded-lg shadow-sm flex justify-between items-center transition duration-200 ease-in-out hover:shadow-md';
                    notificationItem.innerHTML = `
                        <div>
                            <p class="text-sm font-semibold text-gray-800">${notification.message}</p>
                            <p class="text-xs text-gray-500">${new Date(notification.created_at).toLocaleString()}</p>
                        </div>
                        <button data-id="${notification.id}" class="delete-notification-btn text-red-500 hover:text-red-700 transition duration-150 ease-in-out">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                    `;
                    notificationsList.appendChild(notificationItem);
                });

                document.querySelectorAll('#notifications-list .delete-notification-btn').forEach(button => {
                    button.addEventListener('click', (e) => deleteNotification(e.currentTarget.dataset.id));
                });
            }
        }

    } catch (error) {
        showGlobalNotification(`Error fetching notifications: ${error.message}`, 'error');
        console.error('Error fetching notifications:', error.message);
    }
}

export async function fetchBills() {
    if (!supabase) {
        showGlobalNotification("Supabase is not initialized. Cannot fetch bills.", 'error');
        if (billsList) billsList.innerHTML = '';
        if (noBillsMessage) noBillsMessage.classList.remove('hidden');
        return;
    }

    const user = (await supabase.auth.getSession()).data.session?.user;
    if (!user) return;

    try {
        const { data: bills, error } = await supabase
            .from('bills')
            .select('*')
            .eq('user_id', user.id)
            .order('due_date', { ascending: true });

        if (error) throw error;

        if (billsList) {
            billsList.innerHTML = '';
            if (bills.length === 0) {
                if (noBillsMessage) noBillsMessage.classList.remove('hidden');
            } else {
                if (noBillsMessage) noBillsMessage.classList.add('hidden');
                bills.forEach(bill => {
                    const isOverdue = !bill.is_paid && new Date(bill.due_date) < new Date();
                    const dueDateClass = isOverdue ? 'text-red-600 font-semibold' : 'text-gray-600';
                    const paidClass = bill.is_paid ? 'line-through text-gray-400' : 'text-gray-800';

                    const billItem = document.createElement('div');
                    billItem.className = `bg-white p-4 rounded-lg shadow-sm flex flex-col sm:flex-row justify-between items-center transition duration-200 ease-in-out hover:shadow-md ${bill.is_paid ? 'opacity-70' : ''}`;
                    billItem.innerHTML = `
                        <div class="flex-grow mb-2 sm:mb-0">
                            <h3 class="text-lg font-bold ${paidClass}">${bill.name}</h3>
                            <p class="text-sm ${paidClass}">Amount: ${formatCurrency(bill.amount)}</p>
                            <p class="text-sm ${dueDateClass}">Due: ${bill.due_date}</p>
                            ${bill.is_paid ? '<span class="text-green-600 text-xs font-semibold">Paid</span>' : ''}
                        </div>
                        <div class="flex space-x-2">
                            <button data-id="${bill.id}" class="edit-bill-btn text-blue-600 hover:text-blue-900 transition duration-150 ease-in-out">
                                Edit
                            </button>
                            <button data-id="${bill.id}" class="delete-bill-btn text-red-600 hover:text-red-900 transition duration-150 ease-in-out">
                                Delete
                            </button>
                            ${!bill.is_paid ? `<button data-id="${bill.id}" class="mark-paid-btn text-green-600 hover:text-green-900 transition duration-150 ease-in-out ml-2">
                                Mark Paid
                            </button>` : ''}
                        </div>
                    `;
                    billsList.appendChild(billItem);
                });

                document.querySelectorAll('#bills-list .edit-bill-btn').forEach(button => {
                    button.addEventListener('click', (e) => editBill(e.currentTarget.dataset.id));
                });
                document.querySelectorAll('#bills-list .delete-bill-btn').forEach(button => {
                    button.addEventListener('click', (e) => deleteBill(e.currentTarget.dataset.id));
                });
                document.querySelectorAll('#bills-list .mark-paid-btn').forEach(button => {
                    button.addEventListener('click', (e) => markBillAsPaid(e.currentTarget.dataset.id));
                });
            }
        }

    } catch (error) {
        showGlobalNotification(`Error fetching bills: ${error.message}`, 'error');
        console.error('Error fetching bills:', error.message);
    }
}

async function handleBillFormSubmit(e) {
    e.preventDefault();

    if (!supabase) {
        showGlobalNotification("Supabase is not initialized. Cannot save bill.", 'error');
        return;
    }

    const user = (await supabase.auth.getSession()).data.session?.user;
    if (!user) {
        showGlobalNotification('You must be logged in to add bills.', 'error');
        return;
    }

    const billId = billIdInput.value;
    const name = billNameInput.value.trim();
    const amount = parseFloat(billAmountInput.value);
    const due_date = billDueDateInput.value;
    const is_paid = billIsPaidInput.checked;

    if (!name || isNaN(amount) || amount <= 0 || !due_date) {
        showGlobalNotification('Please fill all bill fields correctly. Amount must be a positive number.', 'error');
        return;
    }

    const billData = {
        user_id: user.id,
        name,
        amount,
        due_date,
        is_paid,
        created_at: new Date().toISOString()
    };

    try {
        if (billId) {
            const { data, error } = await supabase
                .from('bills')
                .update(billData)
                .eq('id', billId)
                .select();

            if (error) throw error;
            showGlobalNotification('Bill updated successfully!', 'success');
            await addNotification(`Updated Bill: ${name} (Due: ${due_date})`);

        } else {
            const { data, error } = await supabase
                .from('bills')
                .insert([billData])
                .select();

            if (error) throw error;
            showGlobalNotification('Bill added successfully!', 'success');
            await addNotification(`Added Bill: ${name} (Due: ${due_date})`);
        }

        hideBillModal();
        fetchBills();
    } catch (error) {
        showGlobalNotification(`Error saving bill: ${error.message}`, 'error');
        console.error('Error saving bill:', error.message);
    }
}

async function editBill(id) {
    if (!supabase) {
        showGlobalNotification("Supabase is not initialized. Cannot edit bill.", 'error');
        return;
    }
    try {
        const { data, error } = await supabase
            .from('bills')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        showBillModal('Edit Bill', 'Update Bill');
        if (billIdInput) billIdInput.value = data.id;
        if (billNameInput) billNameInput.value = data.name;
        if (billAmountInput) billAmountInput.value = data.amount;
        if (billDueDateInput) billDueDateInput.value = data.due_date;
        if (billIsPaidInput) billIsPaidInput.checked = data.is_paid;

    } catch (error) {
        showGlobalNotification(`Error fetching bill for edit: ${error.message}`, 'error');
        console.error('Error fetching bill for edit:', error.message);
    }
}

async function deleteBill(id) {
    if (!supabase) {
        showGlobalNotification("Supabase is not initialized. Cannot delete bill.", 'error');
        return;
    }
    showConfirmationModal(
        'Delete Bill',
        'Are you sure you want to delete this bill? This action cannot be undone.',
        async () => {
            try {
                const { error } = await supabase
                    .from('bills')
                    .delete()
                    .eq('id', id);

                if (error) throw error;
                showGlobalNotification('Bill deleted successfully!', 'success');
                await addNotification(`Deleted Bill ID: ${id}`);

                fetchBills();
            } catch (error) {
                showGlobalNotification(`Error deleting bill: ${error.message}`, 'error');
                console.error('Error deleting bill:', error.message);
            }
        },
        'Delete',
        true
    );
}

async function markBillAsPaid(id) {
    if (!supabase) {
        showGlobalNotification("Supabase is not initialized. Cannot mark bill as paid.", 'error');
        return;
    }
    showConfirmationModal(
        'Mark Bill as Paid',
        'Are you sure you want to mark this bill as paid?',
        async () => {
            try {
                const { error } = await supabase
                    .from('bills')
                    .update({ is_paid: true })
                    .eq('id', id);

                if (error) throw error;
                showGlobalNotification('Bill marked as paid!', 'success');
                await addNotification(`Bill marked paid: ID ${id}`);

                fetchBills();
            } catch (error) {
                showGlobalNotification(`Error marking bill as paid: ${error.message}`, 'error');
                console.error('Error marking bill as paid:', error.message);
            }
        },
        'Mark Paid'
    );
}