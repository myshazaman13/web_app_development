// api.js
// This module contains all the functions responsible for communicating with the backend API.
import {
    API_BASE_URL,
    currentUser,
    allRecipes,
    savedRecipeIds,
    setAllRecipes,
    setSavedRecipeIds,
    setLikedRecipeIds,
    setCurrentUser
} from './state.js';
import {
    showMessage,
    showSection
} from './utils.js';
import {
    updateNavVisibility
} from './main.js'; // Import from main.js to avoid circular dependency
import {
    renderRecipes,
    resetAddEditForm
} from './render.js';
import {
    recipeListContainer,
    noRecipesMessage,
    savedRecipeListContainer,
    noSavedRecipesMessage,
    loginToViewSavedMessage
} from './domElements.js';

/**
 * Corrects the image URLs for a list of recipes to be absolute paths.
 * @param {Array} recipes - The list of recipes fetched from the API.
 * @returns {Array} The list of recipes with corrected image URLs.
 */
function processRecipesForDisplay(recipes) {
    return recipes.map(recipe => {
        // Ensure the image_url is an absolute path.
        if (recipe.image_url && !recipe.image_url.startsWith('http')) {
            recipe.image_url = `${API_BASE_URL}${recipe.image_url}`;
        }
        return recipe;
    });
}

/**
 * Checks the user's authentication status with the server.
 */
export async function checkAuthStatus() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/status`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include'
        });
        const data = await response.json();
        if (data.loggedIn) {
            setCurrentUser({ id: data.userId, email: data.userEmail });
            showMessage(`Welcome back, ${currentUser.email}!`, 'info');
        } else {
            setCurrentUser(null);
        }
    } catch (error) {
        console.error("Error checking auth status:", error);
        showMessage("Could not connect to authentication service.", 'error');
        setCurrentUser(null);
    } finally {
        updateNavVisibility();
        if (currentUser) {
            await fetchUserRecipeStatuses();
        }
        await fetchAllRecipes();
    }
}

/**
 * Fetches all recipes from the backend and renders them.
 */
export async function fetchAllRecipes() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/recipes`);
        if (response.ok) {
            let recipes = await response.json();
            // Process the recipes to fix image URLs before setting state
            recipes = processRecipesForDisplay(recipes);
            setAllRecipes(recipes);
            renderRecipes(allRecipes, recipeListContainer);
            if (allRecipes.length === 0) {
                noRecipesMessage.classList.remove('hidden');
            } else {
                noRecipesMessage.classList.add('hidden');
            }
        } else {
            showMessage(`Error fetching recipes: ${response.statusText}`, 'error');
        }
    } catch (error) {
        showMessage(`Error fetching recipes: ${error.message}`, 'error');
        console.error("Error fetching recipes:", error);
    }
}

/**
 * Fetches the recipes saved by the current user.
 */
export async function fetchSavedRecipes() {
    if (!currentUser) {
        savedRecipeListContainer.innerHTML = '';
        noSavedRecipesMessage.classList.add('hidden');
        loginToViewSavedMessage.classList.remove('hidden');
        return;
    }
    loginToViewSavedMessage.classList.add('hidden');
    try {
        const response = await fetch(`${API_BASE_URL}/api/my-saved-recipes`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include'
        });
        if (response.ok) {
            let savedRecipes = await response.json();
            // Process the recipes to fix image URLs before rendering
            savedRecipes = processRecipesForDisplay(savedRecipes);
            renderRecipes(savedRecipes, savedRecipeListContainer);
            if (savedRecipes.length === 0) {
                noSavedRecipesMessage.classList.remove('hidden');
            } else {
                noSavedRecipesMessage.classList.add('hidden');
            }
        } else {
            const errorData = await response.json();
            showMessage(`Error fetching saved recipes: ${errorData.message || 'Unknown error'}`, 'error');
        }
    } catch (error) {
        showMessage(`Error fetching saved recipes: ${error.message}`, 'error');
        console.error("Error fetching saved recipes:", error);
    }
}

/**
 * Fetches the liked and saved status for the current user's recipes.
 */
export async function fetchUserRecipeStatuses() {
    if (!currentUser) {
        setSavedRecipeIds(new Set());
        setLikedRecipeIds(new Set());
        return;
    }
    try {
        const likedRes = await fetch(`${API_BASE_URL}/api/my-liked-recipes-status`, { credentials: 'include' });
        if (likedRes.ok) {
            const likedData = await likedRes.json();
            setLikedRecipeIds(new Set(likedData.likedRecipeIds));
        } else {
            console.error("Failed to fetch liked recipe status:", likedRes.statusText);
        }
        const savedRes = await fetch(`${API_BASE_URL}/api/my-saved-recipes-status`, { credentials: 'include' });
        if (savedRes.ok) {
            const savedData = await savedRes.json();
            setSavedRecipeIds(new Set(savedData.savedRecipeIds));
        } else {
            console.error("Failed to fetch saved recipe status:", savedRes.statusText);
        }
    } catch (error) {
        console.error("Error fetching user recipe statuses:", error);
    }
    renderRecipes(allRecipes, recipeListContainer);
}

/**
 * Submits the add/edit recipe form data to the backend.
 * @param {Event} e The form submission event.
 */
export async function handleRecipeFormSubmit(e) {
    e.preventDefault();
    const recipeIdInput = document.getElementById('recipe-id-input');
    const recipeImageInput = document.getElementById('recipe-image');
    if (!currentUser) {
        showMessage('You must be logged in to add or update a recipe.', 'error');
        return;
    }

    const isEditing = !!recipeIdInput.value;
    const endpoint = isEditing ? `${API_BASE_URL}/api/recipes/${recipeIdInput.value}` : `${API_BASE_URL}/api/recipes`;
    const method = isEditing ? 'PUT' : 'POST';

    const formData = new FormData();

    // Correcting the IDs to more common form field IDs
    formData.append('title', document.getElementById('recipe-title').value);
    formData.append('description', document.getElementById('recipe-description').value);
    formData.append('instructions', document.getElementById('recipe-instructions').value);

    // Get and format ingredients to a comma-separated string
    const ingredientsValue = document.getElementById('recipe-ingredients').value || '';
    formData.append('ingredients', ingredientsValue.split(',').map(item => item.trim()).filter(item => item !== '').join(','));

    // Handle the image file upload
    if (recipeImageInput.files.length > 0) {
        formData.append('image', recipeImageInput.files[0]);
    } else if (!isEditing) {
        // For new recipes, an image is required by the backend
        showMessage('Please upload a recipe image for new recipes.', 'error');
        return;
    }
    
    // Now the formData has all required fields and the image file
    try {
        const response = await fetch(endpoint, {
            method: method,
            body: formData,
            credentials: 'include'
        });

        const data = await response.json();

        if (response.ok) {
            showMessage(data.message, 'success');
            resetAddEditForm();
            fetchAllRecipes();
            showSection('home-section');
        } else {
            showMessage(`Error ${isEditing ? 'updating' : 'adding'} recipe: ${data.message || 'Unknown error'}`, 'error');
            console.error("Error with recipe form:", data);
        }
    } catch (error) {
        showMessage(`Network error: ${error.message}`, 'error');
        console.error("Error with recipe form:", error);
    }
}
