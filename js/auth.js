import { supabase, showMessage, checkAuthAndRedirect, showGlobalNotification } from './main.js';

const authForm = document.getElementById('auth-form');
const emailInput = document.getElementById('email');
const usernameInput = document.getElementById('username');  
const usernameGroup = document.getElementById('username-group');  
const passwordInput = document.getElementById('password');
const confirmPasswordInput = document.getElementById('confirm-password');  
const confirmPasswordGroup = document.getElementById('confirm-password-group');  
const authButton = document.getElementById('auth-button');
const toggleAuthModeButton = document.getElementById('toggle-auth-mode');
const toggleAuthText = document.getElementById('toggle-auth-text'); 
const authMessageBox = document.getElementById('auth-message-box');
const authMessageText = document.getElementById('auth-message-text');

let isRegisterMode = false;

document.addEventListener('DOMContentLoaded', () => {
    checkAuthAndRedirect(false, 'dashboard.html');
    
 
    updateAuthText();

    if (authForm) {
        authForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!supabase) {
                showMessage(authMessageBox, authMessageText, "Supabase is not initialized. Please set your API credentials.", true);
                return;
            }

            const email = emailInput.value.trim();
            const password = passwordInput.value.trim();
            const username = usernameInput.value.trim(); 
            const confirmPassword = confirmPasswordInput.value.trim();

            if (!email || !password) {
                showMessage(authMessageBox, authMessageText, 'Please enter both email and password.', true);
                return;
            }

            try {
                if (isRegisterMode) {
                    if (password !== confirmPassword) {
                        showMessage(authMessageBox, authMessageText, 'Passwords do not match.', true);
                        return;
                    }
                    if (!username) {
                        showMessage(authMessageBox, authMessageText, 'Please enter a username.', true);
                        return;
                    }

                    const { error } = await supabase.auth.signUp({ 
                        email, 
                        password,
                        options: {
                            data: {
                                username: username
                            }
                        }
                    });

                    if (error) throw error;

                    showMessage(authMessageBox, authMessageText, 'Registration successful! Please check your email to confirm your account.', false);
                    
                    isRegisterMode = false;
                    updateAuthText();
                    
                    emailInput.value = '';
                    usernameInput.value = '';
                    passwordInput.value = '';
                    confirmPasswordInput.value = '';

                } else {
                    const { error } = await supabase.auth.signInWithPassword({ email, password });
                    if (error) throw error;
                    showGlobalNotification('Login successful!', 'success');
                    window.location.href = 'dashboard.html';
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
            updateAuthText(); 
            if (authMessageBox) authMessageBox.classList.add('hidden');
            
    
            emailInput.value = '';
            passwordInput.value = '';
            usernameInput.value = '';
            confirmPasswordInput.value = '';
        });
    }

 
    function updateAuthText() {
        if (isRegisterMode) {
            authButton.textContent = 'Register';
            toggleAuthModeButton.textContent = 'Login here';
            toggleAuthText.textContent = 'Already have an account?';
            usernameGroup.classList.remove('hidden');
            usernameInput.setAttribute('required', 'true');
            confirmPasswordGroup.classList.remove('hidden');
            confirmPasswordInput.setAttribute('required', 'true');
        } else {
            authButton.textContent = 'Login';
            toggleAuthModeButton.textContent = 'Register here';
            toggleAuthText.textContent = "Don't have an account?";
            usernameGroup.classList.add('hidden');
            usernameInput.removeAttribute('required');
            confirmPasswordGroup.classList.add('hidden');
            confirmPasswordInput.removeAttribute('required');
        }
    }
});