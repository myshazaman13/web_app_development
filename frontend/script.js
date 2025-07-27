// script.js

// --- Global Variables and DOM Elements ---
const API_BASE_URL = window.location.origin; // Flask serves from the same origin

let currentUser = null; // Stores { id, email } of the logged-in user
let allRecipes = []; // Cache for all recipes
let savedRecipeIds = new Set(); // Set of IDs of recipes saved by the current user
let likedRecipeIds = new Set(); // Set of IDs of recipes liked by the current user

// DOM Elements
const messageDisplay = document.getElementById('message-display');
const currentUserIdSpan = document.getElementById('current-user-id');

// Navigation Buttons
const navAllRecipesBtn = document.getElementById('nav-all-recipes');
const navAddRecipeBtn = document.getElementById('nav-add-recipe');
const navMySavedRecipesBtn = document.getElementById('nav-my-saved-recipes');
const navAuthBtn = document.getElementById('nav-auth');
const navLogoutBtn = document.getElementById('nav-logout');

// Sections
const homeSection = document.getElementById('home-section');
const addRecipeSection = document.getElementById('add-recipe-section');
const mySavedRecipesSection = document.getElementById('my-saved-recipes-section');
const authSection = document.getElementById('auth-section');

// Recipe List Elements
const recipeListContainer = document.getElementById('recipe-list-container');
const noRecipesMessage = document.getElementById('no-recipes-message');

// Add Recipe Form Elements
const addRecipeForm = document.getElementById('add-recipe-form');
const recipeTitleInput = document.getElementById('recipe-title');
const recipeDescriptionInput = document.getElementById('recipe-description');
const recipeIngredientsInput = document.getElementById('recipe-ingredients');
const recipeInstructionsInput = document.getElementById('recipe-instructions');
const recipeImageInput = document.getElementById('recipe-image'); // New image input

// Saved Recipes Elements
const savedRecipeListContainer = document.getElementById('saved-recipe-list-container');
const noSavedRecipesMessage = document.getElementById('no-saved-recipes-message');
const loginToViewSavedMessage = document.getElementById('login-to-view-saved-message');

// Auth Form Elements
const authTitle = document.getElementById('auth-title');
const authForm = document.getElementById('auth-form');
const authEmailInput = document.getElementById('auth-email');
const authPasswordInput = document.getElementById('auth-password');
const confirmPasswordGroup = document.getElementById('confirm-password-group');
const authConfirmPasswordInput = document.getElementById('auth-confirm-password');
const authSubmitButton = document.getElementById('auth-submit-button');
const authToggleText = document.getElementById('auth-toggle-text');
const authToggleButton = document.getElementById('auth-toggle-button');

let isLoginMode = true; // State for auth form (login or register)

// --- Utility Functions ---

function showMessage(text, type = 'info') {
    messageDisplay.textContent = text;
    messageDisplay.className = `p-3 text-center rounded-md mx-4 mt-4 shadow-sm`;
    messageDisplay.classList.remove('hidden');

    if (type === 'error') {
        messageDisplay.classList.add('bg-red-200', 'text-red-800');
    } else if (type === 'success') {
        messageDisplay.classList.add('bg-green-200', 'text-green-800');
    } else { // info
        messageDisplay.classList.add('bg-yellow-200', 'text-yellow-800');
    }

    setTimeout(() => {
        messageDisplay.classList.add('hidden');
        messageDisplay.textContent = '';
    }, 5000);
}

function showSection(sectionId) {
    const sections = document.querySelectorAll('.page-section');
    sections.forEach(section => {
        if (section.id === sectionId) {
            section.classList.remove('hidden');
        } else {
            section.classList.add('hidden');
        }
    });
}

function updateNavVisibility() {
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

// --- API Calls ---

async function checkAuthStatus() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/status`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include' // Important for sending session cookies
        });
        const data = await response.json();
        if (data.loggedIn) {
            currentUser = { id: data.userId, email: data.userEmail };
            showMessage(`Welcome back, ${currentUser.email}!`, 'info');
        } else {
            currentUser = null;
        }
    } catch (error) {
        console.error("Error checking auth status:", error);
        showMessage("Could not connect to authentication service.", 'error');
        currentUser = null;
    } finally {
        updateNavVisibility();
        // After auth status is known, fetch user-specific recipe statuses
        if (currentUser) {
            await fetchUserRecipeStatuses();
        }
        // Always load all recipes regardless of login status
        await fetchAllRecipes();
    }
}

async function fetchAllRecipes() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/recipes`);
        if (response.ok) {
            allRecipes = await response.json();
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

async function fetchUserRecipeStatuses() {
    if (!currentUser) {
        savedRecipeIds = new Set();
        likedRecipeIds = new Set();
        return;
    }
    try {
        // Fetch liked status
        const likedRes = await fetch(`${API_BASE_URL}/api/my-liked-recipes-status`, { credentials: 'include' });
        if (likedRes.ok) {
            const likedData = await likedRes.json();
            likedRecipeIds = new Set(likedData.likedRecipeIds);
        } else {
            console.error("Failed to fetch liked recipe status:", likedRes.statusText);
        }

        // Fetch saved status
        const savedRes = await fetch(`${API_BASE_URL}/api/my-saved-recipes-status`, { credentials: 'include' });
        if (savedRes.ok) {
            const savedData = await savedRes.json();
            savedRecipeIds = new Set(savedData.savedRecipeIds);
        } else {
            console.error("Failed to fetch saved recipe status:", savedRes.statusText);
        }
    } catch (error) {
        console.error("Error fetching user recipe statuses:", error);
    }
    // Re-render recipes to update like/save buttons
    renderRecipes(allRecipes, recipeListContainer);
}

async function fetchSavedRecipes() {
    if (!currentUser) {
        savedRecipeListContainer.innerHTML = '';
        noSavedRecipesMessage.classList.add('hidden');
        loginToViewSavedMessage.classList.remove('hidden');
        return;
    }

    loginToViewSavedMessage.classList.add('hidden'); // Hide login prompt
    try {
        const response = await fetch(`${API_BASE_URL}/api/my-saved-recipes`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include'
        });

        if (response.ok) {
            const savedRecipes = await response.json();
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

// --- Render Functions ---

function createRecipeCard(recipe, isSavedInitial, isLikedInitial) {
    const card = document.createElement('div');
    card.className = 'recipe-card'; // Apply base card styles

    // Determine initial state for buttons
    let currentIsSaved = isSavedInitial !== undefined ? isSavedInitial : savedRecipeIds.has(recipe.id);
    let currentIsLiked = isLikedInitial !== undefined ? isLikedInitial : likedRecipeIds.has(recipe.id);
    let currentLikes = recipe.likes; // Use the likes count from the recipe object

    // Construct image URL if available
    const imageUrl = recipe.imageFilename ? `${API_BASE_URL}/uploads/${recipe.imageFilename}` : 'https://placehold.co/400x200/cccccc/333333?text=No+Image';

    card.innerHTML = `
        <div class="p-5">
            ${recipe.imageFilename ? `<img src="${imageUrl}" alt="${recipe.title}" class="w-full h-48 object-cover rounded-md mb-4 shadow-sm">` : ''}
            <h3 class="text-xl font-bold text-orange-700 mb-2">${recipe.title}</h3>
            <p class="text-gray-600 text-sm mb-3 line-clamp-3">${recipe.description}</p>
            <div class="flex justify-between items-center text-sm text-gray-500 mb-3">
                <span>By: ${recipe.creatorEmail || 'Unknown'}</span>
                <span data-likes-count="${recipe.id}">Likes: ${currentLikes}</span>
            </div>
            <div class="flex gap-2 mt-4">
                <button class="view-details-btn flex-1 px-3 py-1 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors text-sm shadow-sm">
                    View Details
                </button>
                ${currentUser ? `
                    <button class="save-recipe-btn px-3 py-1 rounded-md transition-colors text-sm shadow-sm ${currentIsSaved ? 'bg-gray-400 hover:bg-gray-500 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'}">
                        ${currentIsSaved ? 'Unsave' : 'Save'}
                    </button>
                    <button class="like-recipe-btn px-3 py-1 rounded-md transition-colors text-sm shadow-sm ${currentIsLiked ? 'bg-red-400 hover:bg-red-500 text-white' : 'bg-red-500 hover:bg-red-600 text-white'}">
                        ${currentIsLiked ? 'Unlike' : 'Like'}
                    </button>
                ` : ''}
            </div>
        </div>
        <div class="recipe-card-details hidden">
            <h4 class="text-lg font-semibold text-orange-600 mb-2">Ingredients:</h4>
            <ul class="list-none text-gray-700 mb-4 space-y-1">
                ${recipe.ingredients.map((ing, index) => `
                    <li>
                        <label class="inline-flex items-center">
                            <input type="checkbox" class="form-checkbox h-4 w-4 text-orange-600 rounded-sm">
                            <span class="ml-2 text-gray-700">${ing}</span>
                        </label>
                    </li>
                `).join('') || '<li>No ingredients listed.</li>'}
            </ul>
            <h4 class="text-lg font-semibold text-orange-600 mb-2">Instructions:</h4>
            <p class="text-gray-700 whitespace-pre-wrap">${recipe.instructions}</p>
        </div>
    `;

    const viewDetailsBtn = card.querySelector('.view-details-btn');
    const detailsSection = card.querySelector('.recipe-card-details');
    const saveRecipeBtn = card.querySelector('.save-recipe-btn');
    const likeRecipeBtn = card.querySelector('.like-recipe-btn');
    const likesCountSpan = card.querySelector(`[data-likes-count="${recipe.id}"]`);


    viewDetailsBtn.addEventListener('click', () => {
        detailsSection.classList.toggle('hidden');
        viewDetailsBtn.textContent = detailsSection.classList.contains('hidden') ? 'View Details' : 'Hide Details';
    });

    if (saveRecipeBtn) {
        saveRecipeBtn.addEventListener('click', async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/api/recipes/${recipe.id}/save`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include'
                });
                const data = await response.json();
                if (response.ok) {
                    currentIsSaved = data.saved; // Update state based on backend
                    if (currentIsSaved) {
                        saveRecipeBtn.classList.remove('bg-blue-500', 'hover:bg-blue-600');
                        saveRecipeBtn.classList.add('bg-gray-400', 'hover:bg-gray-500');
                        saveRecipeBtn.textContent = 'Unsave';
                        savedRecipeIds.add(recipe.id); // Update global set
                    } else {
                        saveRecipeBtn.classList.remove('bg-gray-400', 'hover:bg-gray-500');
                        saveRecipeBtn.classList.add('bg-blue-500', 'hover:bg-blue-600');
                        saveRecipeBtn.textContent = 'Save';
                        savedRecipeIds.delete(recipe.id); // Update global set
                        // If on "My Saved Recipes" page, re-fetch to remove it
                        if (document.querySelector('#my-saved-recipes-section:not(.hidden)')) {
                            fetchSavedRecipes();
                        }
                    }
                    showMessage(data.message, 'success');
                } else {
                    showMessage(`Error: ${data.message || 'Could not toggle save status.'}`, 'error');
                }
            } catch (error) {
                showMessage(`Network error: ${error.message}`, 'error');
                console.error("Error toggling save:", error);
            }
        });
    }

    if (likeRecipeBtn) {
        likeRecipeBtn.addEventListener('click', async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/api/recipes/${recipe.id}/like`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include'
                });
                const data = await response.json();
                if (response.ok) {
                    currentIsLiked = data.liked; // Update state based on backend
                    currentLikes = data.likes; // Update likes count
                    likesCountSpan.textContent = `Likes: ${currentLikes}`; // Update displayed count

                    if (currentIsLiked) {
                        likeRecipeBtn.classList.remove('bg-red-500', 'hover:bg-red-600');
                        likeRecipeBtn.classList.add('bg-red-400', 'hover:bg-red-500');
                        likeRecipeBtn.textContent = 'Unlike';
                        likedRecipeIds.add(recipe.id); // Update global set
                    } else {
                        likeRecipeBtn.classList.remove('bg-red-400', 'hover:bg-red-500');
                        likeRecipeBtn.classList.add('bg-red-500', 'hover:bg-red-600');
                        likeRecipeBtn.textContent = 'Like';
                        likedRecipeIds.delete(recipe.id); // Update global set
                    }
                    showMessage(data.message, 'success');
                } else {
                    showMessage(`Error: ${data.message || 'Could not toggle like status.'}`, 'error');
                }
            } catch (error) {
                showMessage(`Network error: ${error.message}`, 'error');
                console.error("Error toggling like:", error);
            }
        });
    }

    return card;
}

function renderRecipes(recipes, containerElement) {
    containerElement.innerHTML = ''; // Clear existing recipes
    if (recipes.length === 0) {
        // Handled by specific messages in HTML
        return;
    }
    recipes.forEach(recipe => {
        // Pass initial states from the global sets
        const card = createRecipeCard(recipe, savedRecipeIds.has(recipe.id), likedRecipeIds.has(recipe.id));
        containerElement.appendChild(card);
    });
}

// --- Event Listeners ---

// Navigation
navAllRecipesBtn.addEventListener('click', () => {
    showSection('home-section');
    fetchAllRecipes(); // Re-fetch all recipes to ensure latest data
});

navAddRecipeBtn.addEventListener('click', () => {
    if (currentUser) {
        showSection('add-recipe-section');
    } else {
        showMessage('Please log in to add a recipe.', 'error');
        showSection('auth-section'); // Redirect to auth if not logged in
    }
});

navMySavedRecipesBtn.addEventListener('click', () => {
    if (currentUser) {
        showSection('my-saved-recipes-section');
        fetchSavedRecipes();
    } else {
        showMessage('Please log in to view your saved recipes.', 'error');
        showSection('auth-section'); // Redirect to auth if not logged in
    }
});

navAuthBtn.addEventListener('click', () => {
    showSection('auth-section');
    // Reset auth form to login mode when navigating to it
    isLoginMode = true;
    authTitle.textContent = 'Login';
    authSubmitButton.textContent = 'Login';
    authToggleText.textContent = "Don't have an account?";
    authToggleButton.textContent = 'Register here';
    confirmPasswordGroup.classList.add('hidden');
    authForm.reset(); // Clear form fields
});

navLogoutBtn.addEventListener('click', async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/logout`, {
            method: 'POST',
            credentials: 'include'
        });
        const data = await response.json();
        if (response.ok) {
            currentUser = null;
            savedRecipeIds = new Set(); // Clear saved/liked data on logout
            likedRecipeIds = new Set();
            showMessage(data.message, 'success');
            updateNavVisibility();
            showSection('home-section'); // Go back to home after logout
            fetchAllRecipes(); // Re-fetch all recipes (some buttons might change)
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
            currentUser = { id: data.userId, email: data.userEmail };
            showMessage(data.message, 'success');
            authForm.reset(); // Clear form
            updateNavVisibility();
            showSection('home-section'); // Go to home page after successful auth
            await fetchUserRecipeStatuses(); // Fetch user-specific data
            fetchAllRecipes(); // Re-render all recipes with updated like/save status
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
    isLoginMode = !isLoginMode;
    authTitle.textContent = isLoginMode ? 'Login' : 'Register';
    authSubmitButton.textContent = isLoginMode ? 'Login' : 'Register';
    authToggleText.textContent = isLoginMode ? "Don't have an account?" : "Already have an account?";
    authToggleButton.textContent = isLoginMode ? 'Register here' : 'Login here';
    if (isLoginMode) {
        confirmPasswordGroup.classList.add('hidden');
        authConfirmPasswordInput.removeAttribute('required'); // Remove required for login
    } else {
        confirmPasswordGroup.classList.remove('hidden');
        authConfirmPasswordInput.setAttribute('required', 'required'); // Add required for register
    }
    authForm.reset(); // Clear form fields on toggle
});

// Add Recipe Form Submission
addRecipeForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser) {
        showMessage('You must be logged in to add a recipe.', 'error');
        return;
    }

    // Use FormData for file uploads and other form data
    const formData = new FormData();
    formData.append('title', recipeTitleInput.value);
    formData.append('description', recipeDescriptionInput.value);
    // Ingredients are sent as a comma-separated string
    formData.append('ingredients', recipeIngredientsInput.value.split(',').map(item => item.trim()).filter(item => item !== '').join(','));
    formData.append('instructions', recipeInstructionsInput.value);

    // Append the image file if selected
    if (recipeImageInput.files.length > 0) {
        formData.append('image', recipeImageInput.files[0]);
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/recipes`, {
            method: 'POST',
            // Do NOT set 'Content-Type': 'application/json' when using FormData with files
            // The browser will set the correct 'multipart/form-data' header automatically.
            body: formData,
            credentials: 'include'
        });

        const data = await response.json();

        if (response.ok) {
            showMessage(data.message, 'success');
            addRecipeForm.reset();
            fetchAllRecipes();
            showSection('home-section');
        } else {
            showMessage(`Error adding recipe: ${data.message || 'Unknown error'}`, 'error');
            console.error("Error adding recipe:", data);
        }
    } catch (error) {
        showMessage(`Error adding recipe: ${error.message}`, 'error');
        console.error("Error adding recipe:", error);
    }
});


document.addEventListener('DOMContentLoaded', () => {
    checkAuthStatus();
    showSection('home-section');
});
