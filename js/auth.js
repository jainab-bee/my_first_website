
import { supabase, showMessage, checkAuthAndRedirect, showGlobalNotification } from './main.js';

const authForm = document.getElementById('auth-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const authButton = document.getElementById('auth-button');
const toggleAuthModeButton = document.getElementById('toggle-auth-mode');
const authMessageBox = document.getElementById('auth-message-box');
const authMessageText = document.getElementById('auth-message-text');

let isRegisterMode = false;

document.addEventListener('DOMContentLoaded', () => {
 
    checkAuthAndRedirect(false);

    if (authForm) {
        authForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!supabase) {
                showMessage(authMessageBox, authMessageText, "Supabase is not initialized. Please set your API credentials.", true);
                return;
            }

            const email = emailInput.value;
            const password = passwordInput.value;

            if (!email || !password) {
                showMessage(authMessageBox, authMessageText, 'Please enter both email and password.', true);
                return;
            }

            try {
                if (isRegisterMode) {
                    const { data, error } = await supabase.auth.signUp({ email, password });
                    if (error) throw error;
                    showMessage(authMessageBox, authMessageText, 'Registration successful! Please check your email to confirm your account.', false);
                    isRegisterMode = false; 
                    authButton.textContent = 'Login';
                    toggleAuthModeButton.textContent = 'Register here';
                } else {
                    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
                    if (error) throw error;
                    showGlobalNotification('Login successful!', 'success');
                    window.location.href = '/dashboard.html'; 
                }
            } catch (error) {
                showMessage(authMessageBox, authMessageText, `Authentication error: ${error.message}`, true);
                console.error('Auth error:', error.message);
            }
        });
    }

    if (toggleAuthModeButton) {
        toggleAuthModeButton.addEventListener('click', (e) => {
            e.preventDefault();
            isRegisterMode = !isRegisterMode;
            if (isRegisterMode) {
                authButton.textContent = 'Register';
                toggleAuthModeButton.textContent = 'Login here';
            } else {
                authButton.textContent = 'Login';
                toggleAuthModeButton.textContent = 'Register here';
            }
            if (authMessageBox) authMessageBox.classList.add('hidden'); 
        });
    }
});