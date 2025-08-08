// main.js
// This is the main script file for the Recipe Share application.
// It handles all the core application logic, including event listeners and API calls.

// --- Globals (Assumed to be here based on API calls) ---
const API_BASE_URL = window.location.origin;

// --- Imports ---
import {
    currentUser,
    setCurrentUser,
    isLoginMode,
    setIsLoginMode,
    setSavedRecipeIds,
    setLikedRecipeIds,
    allRecipes,
    setAllRecipes
} from './state.js';
import {
    showSection,
    showMessage
} from './utils.js';
import {
    checkAuthStatus,
    fetchAllRecipes,
    fetchSavedRecipes,
    fetchUserRecipeStatuses // Added this import to call after login/register
} from './api.js';
import {
    renderRecipes,
    resetAddEditForm,
    confirmDeleteRecipe
} from './render.js';
import {
    navAllRecipesBtn,
    navAddRecipeBtn,
    navMySavedRecipesBtn,
    navAuthBtn,
    navLogoutBtn,
    addRecipeForm,
    cancelEditBtn,
    authForm,
    authToggleButton,
    authTitle,
    authSubmitButton,
    authToggleText,
    confirmPasswordGroup,
    authConfirmPasswordInput,
    authEmailInput,
    authPasswordInput,
    deleteModal,
    confirmDeleteBtn,
    cancelDeleteBtn,
    currentUserIdSpan,
    recipeIdInput // Added to get the recipe ID from the hidden input
} from './domElements.js';

// --- Functions for Initial Setup and State Management ---

/**
 * Updates the visibility of navigation buttons based on the user's authentication status.
 */
export function updateNavVisibility() {
    if (currentUser) {
        navAddRecipeBtn.classList.remove('hidden');
        navMySavedRecipesBtn.classList.remove('hidden');
        navLogoutBtn.classList.remove('hidden');
        navLogoutBtn.textContent = `Logout (${currentUser.email})`;
        navAuthBtn.classList.add('hidden');
        currentUserIdSpan.textContent = currentUser.id;
    } else {
        navAddRecipeBtn.classList.add('hidden');
        navMySavedRecipesBtn.classList.add('hidden');
        navLogoutBtn.classList.add('hidden');
        navAuthBtn.classList.remove('hidden');
        currentUserIdSpan.textContent = 'Not logged in';
    }
}

// --- Event Listeners ---
// Navigation
navAllRecipesBtn.addEventListener('click', () => {
    showSection('home-section');
    fetchAllRecipes();
});

navAddRecipeBtn.addEventListener('click', () => {
    if (currentUser) {
        resetAddEditForm();
        showSection('add-recipe-section');
    } else {
        showMessage('Please log in to add a recipe.', 'error');
        showSection('auth-section');
    }
});

navMySavedRecipesBtn.addEventListener('click', () => {
    if (currentUser) {
        showSection('my-saved-recipes-section');
        fetchSavedRecipes();
    } else {
        showMessage('Please log in to view your saved recipes.', 'error');
        showSection('auth-section');
    }
});

navAuthBtn.addEventListener('click', () => {
    showSection('auth-section');
    setIsLoginMode(true);
    authTitle.textContent = 'Login';
    authSubmitButton.textContent = 'Login';
    authToggleText.textContent = "Don't have an account?";
    authToggleButton.textContent = 'Register here';
    confirmPasswordGroup.classList.add('hidden');
    authConfirmPasswordInput.removeAttribute('required');
    authForm.reset();
});

navLogoutBtn.addEventListener('click', async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/logout`, {
            method: 'POST',
            credentials: 'include'
        });
        const data = await response.json();
        if (response.ok) {
            setCurrentUser(null);
            setSavedRecipeIds(new Set()); // Clears saved recipes on logout
            setLikedRecipeIds(new Set()); // Clears liked recipes on logout
            showMessage(data.message, 'success');
            updateNavVisibility();
            showSection('home-section');
            fetchAllRecipes();
        } else {
            showMessage(`Logout failed: ${data.message || 'Unknown error'}`, 'error');
        }
    } catch (error) {
        showMessage(`Logout failed: ${error.message}`, 'error');
        console.error("Logout error:", error);
    }
});

// Auth Form Submission
authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = authEmailInput.value;
    const password = authPasswordInput.value;
    const confirmPassword = authConfirmPasswordInput.value;

    if (!isLoginMode && password !== confirmPassword) {
        showMessage('Passwords do not match!', 'error');
        return;
    }

    const endpoint = isLoginMode ? `${API_BASE_URL}/api/auth/login` : `${API_BASE_URL}/api/auth/register`;
    const payload = { email, password };

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            credentials: 'include'
        });

        const data = await response.json();

        if (response.ok) {
            setCurrentUser({ id: data.userId, email: data.userEmail });
            showMessage(data.message, 'success');
            authForm.reset();
            updateNavVisibility();
            showSection('home-section');
            await fetchUserRecipeStatuses();
            fetchAllRecipes();
        } else {
            showMessage(`Authentication failed: ${data.message || 'Unknown error'}`, 'error');
            console.error("Auth error:", data);
        }
    } catch (error) {
        showMessage(`Authentication failed: ${error.message}`, 'error');
        console.error("Auth error:", error);
    }
});

// Auth Form Toggle (Login/Register)
authToggleButton.addEventListener('click', () => {
    setIsLoginMode(!isLoginMode);
    authTitle.textContent = isLoginMode ? 'Login' : 'Register';
    authSubmitButton.textContent = isLoginMode ? 'Login' : 'Register';
    authToggleText.textContent = isLoginMode ? "Don't have an account?" : "Already have an account?";
    authToggleButton.textContent = isLoginMode ? 'Register here' : 'Login here';
    if (isLoginMode) {
        confirmPasswordGroup.classList.add('hidden');
        authConfirmPasswordInput.removeAttribute('required');
    } else {
        confirmPasswordGroup.classList.remove('hidden');
        authConfirmPasswordInput.setAttribute('required', 'required');
    }
    authForm.reset();
});

addRecipeForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(addRecipeForm);
    const recipeId = recipeIdInput.value;
    const method = recipeId ? 'PUT' : 'POST';
    const url = recipeId ? `${API_BASE_URL}/api/recipes/${recipeId}` : `${API_BASE_URL}/api/recipes`;


    try {
        const response = await fetch(url, {
            method: method,
            body: formData,
            credentials: 'include'
        });

        const data = await response.json();
        if (response.ok) {
            showMessage(data.message, 'success');
            resetAddEditForm();
            await fetchAllRecipes();
            renderRecipes(allRecipes, document.getElementById('recipe-list-container'));
            showSection('home-section');
        } else {
            showMessage(`Error: ${data.message || 'Unknown error'}`, 'error');
        }
    } catch (error) {
        showMessage(`Network error: ${error.message}`, 'error');
        console.error("Error submitting form:", error);
    }
});

// Cancel Edit Button
cancelEditBtn.addEventListener('click', () => {
    resetAddEditForm();
    showSection('home-section');
});

// Delete Modal Buttons
confirmDeleteBtn.addEventListener('click', confirmDeleteRecipe);
cancelDeleteBtn.addEventListener('click', () => {
    deleteModal.classList.add('hidden');
});

// Initial application load
window.addEventListener('load', checkAuthStatus);
