 
const confirmationModal = document.getElementById('confirmation-modal');
const confirmationModalTitle = document.getElementById('confirmation-modal-title');
const confirmationModalMessage = document.getElementById('confirmation-modal-message');
const cancelConfirmationButton = document.getElementById('cancel-confirmation-button');
const confirmActionButton = document.getElementById('confirm-action-button');

 
const connectBankAccountModal = document.getElementById('connect-bank-account-modal');
const billModal = document.getElementById('bill-modal');

let pendingConfirmationAction = null;  

/**
 * Shows a generic confirmation modal.
 * This modal's HTML must be present in the page where it's used.
 * @param {string} title - The title for the modal.
 * @param {string} message - The message to display.
 * @param {Function} onConfirm - Callback function to execute if user confirms.
 * @param {string} confirmButtonText - Text for the confirm button.
 * @param {boolean} isDestructive - If true, makes the confirm button red.
 */
export function showConfirmationModal(title, message, onConfirm, confirmButtonText = 'Confirm', isDestructive = false) {
    if (!confirmationModal) {
        console.error("Confirmation modal HTML not found in the DOM.");
 
        if (confirm(message)) {
            onConfirm();
        }
        return;
    }

    if (confirmationModalTitle) confirmationModalTitle.textContent = title;
    if (confirmationModalMessage) confirmationModalMessage.textContent = message;
    if (confirmActionButton) confirmActionButton.textContent = confirmButtonText;

    if (confirmActionButton) {
        if (isDestructive) {
            confirmActionButton.classList.remove('bg-blue-600', 'hover:bg-blue-700');
            confirmActionButton.classList.add('bg-red-600', 'hover:bg-red-700');
        } else {
            confirmActionButton.classList.remove('bg-red-600', 'hover:bg-red-700');
            confirmActionButton.classList.add('bg-blue-600', 'hover:bg-blue-700');
        }
    }

    pendingConfirmationAction = onConfirm;
    confirmationModal.classList.add('show');
}

/**
 * Hides the generic confirmation modal.
 */
export function hideConfirmationModal() {
    if (confirmationModal) confirmationModal.classList.remove('show');
    pendingConfirmationAction = null;
}

 
document.addEventListener('DOMContentLoaded', () => {
    if (cancelConfirmationButton) {
        cancelConfirmationButton.addEventListener('click', hideConfirmationModal);
    }
    if (confirmActionButton) {
        confirmActionButton.addEventListener('click', () => {
            if (pendingConfirmationAction) {
                pendingConfirmationAction();
            }
            hideConfirmationModal();
        });
    }
});


 

export function showConnectBankAccountModal() {
    if (connectBankAccountModal) connectBankAccountModal.classList.add('show');
}

export function hideConnectBankAccountModal() {
    if (connectBankAccountModal) connectBankAccountModal.classList.remove('show');
}

export function showBillModal() {  
    if (billModal) billModal.classList.add('show');
}

export function hideBillModal() {
    if (billModal) billModal.classList.remove('show');
}