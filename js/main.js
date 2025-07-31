 
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

 
const SUPABASE_URL = 'https://nklujxwxkdtagrnkowec.supabase.co';  
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rbHVqeHd4a2R0YWdybmtvd2VjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1NDI3MzIsImV4cCI6MjA2OTExODczMn0.He0sTf0RCQWVahcZ5QE0O5mFiDh9eJwlVqnjlpCl3jo'; // Replace with your Supabase Anon Key

export let supabase = null;

if (SUPABASE_URL && SUPABASE_URL !== 'YOUR_SUPABASE_URL_HERE' && SUPABASE_ANON_KEY && SUPABASE_ANON_KEY !== 'YOUR_SUPABASE_ANON_KEY_HERE') {
    try {
        supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } catch (error) {
        console.error("Error initializing Supabase client:", error.message);
 
    }
} else {
    console.warn("Supabase URL or Anon Key is not set. Please update the placeholders in the code.");
 
}
 
export const globalNotificationToast = document.getElementById('global-notification-toast');

/**
 * Displays a message in a designated message box.
 * This is for page-specific message boxes, like auth-message-box or transaction-message-box.
 * @param {HTMLElement} boxElement - The message box container element.
 * @param {HTMLElement} textElement - The element to display the message text.
 * @param {string} message - The message to display.
 * @param {boolean} isError - True if it's an error message, false for success.
 */
export function showMessage(boxElement, textElement, message, isError = false) {
    if (textElement) textElement.textContent = message;
    if (boxElement) {
        boxElement.classList.remove('hidden');
        if (isError) {
            boxElement.classList.remove('bg-green-100', 'border-green-400', 'text-green-700');
            boxElement.classList.add('bg-red-100', 'border-red-400', 'text-red-700');
        } else {
            boxElement.classList.remove('bg-red-100', 'border-red-400', 'text-red-700');
            boxElement.classList.add('bg-green-100', 'border-green-400', 'text-green-700');
        }
        setTimeout(() => {
            boxElement.classList.add('hidden');
        }, 5000);
    }
}

/**
 * Shows a global notification toast.
 * This function requires a `<div id="global-notification-toast">` in the HTML.
 * @param {string} message - The message to display.
 * @param {string} type - 'success' or 'error' (for styling, though current toast is generic).
 */
export function showGlobalNotification(message, type = 'info') {
    const toast = document.getElementById('global-notification-toast');
    if (toast) {
        toast.textContent = message;
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    } else {
        console.warn('Global notification toast element not found in the DOM. Message:', message);
    }
}

/**
 * Formats a number as Indian Rupees.
 * @param {number} amount - The amount to format.
 * @returns {string} Formatted currency string with Rupee symbol.
 */
export function formatCurrency(amount) {
    return `₹${parseFloat(amount).toFixed(2)}`;
}

/**
 * Adds a new notification to the database.
 * This is a common utility function that can be used by any page.
 * @param {string} message - The notification message.
 */
export async function addNotification(message) {
    if (!supabase) {
        console.warn("Supabase is not initialized. Cannot add notification.");
        return;
    }
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;

    if (!user) {
        console.warn("User not authenticated. Cannot add notification. Session:", session);
        return;
    }

    try {
        const { error } = await supabase
            .from('notifications')
            .insert([{ user_id: user.id, message: message, created_at: new Date().toISOString() }]);
        if (error) {
            console.error("Supabase Notification Insert Error:", error);
            throw error;
        }
        console.log("Notification added to DB successfully:", message);
        // In an MPA, notifications would be fetched when the notifications page loads.
    } catch (error) {
        console.error('Error adding notification to DB:', error.message);
        showGlobalNotification(`Failed to save notification: ${error.message}`, 'error');
    }
}

/**
 * Checks authentication status and redirects if necessary.
 * @param {boolean} requiredAuth - If true, redirects if not authenticated. If false, redirects if authenticated.
 * @param {string} redirectPath - The path to redirect to.
 * @returns {Promise<object|null>} The session object if authenticated, otherwise null.
 */
export async function checkAuthAndRedirect(requiredAuth = true, redirectPath = '/index.html') {
    if (!supabase) {
        console.error("Supabase is not initialized for auth check. Assuming no auth.");
        if (requiredAuth) {
            window.location.href = redirectPath;
        }
        return null;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (requiredAuth && !session) {
        console.log(`Auth required but not authenticated on ${window.location.pathname}, redirecting to ${redirectPath}.`);
        window.location.href = redirectPath;
        return null;
    } else if (!requiredAuth && session) {
 
        console.log(`Authenticated on ${window.location.pathname} (auth page), redirecting to /dashboard.html.`);
        window.location.href = '/dashboard.html';
        return session;
    }
    return session; 
}

 
export async function logoutUser() {
    if (!supabase) {
        console.warn("Supabase is not initialized. Cannot logout.");
        showGlobalNotification("Supabase is not initialized. Cannot logout.", 'error');
        return;
    }
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        showGlobalNotification('Logged out successfully!', 'success');
 
        localStorage.removeItem('theme');  
        window.location.href = '/index.html'; 
    } catch (error) {
        console.error('Logout error:', error.message);
        showGlobalNotification(`Logout error: ${error.message}`, 'error');
    }
}

 