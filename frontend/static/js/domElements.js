// domElements.js
// This module exports all the DOM elements, centralizing all selectors.
// This makes it easy to find and manage element references.

// Global Elements
export const messageDisplay = document.getElementById('message-display');
export const currentUserIdSpan = document.getElementById('current-user-id');
export const deleteModal = document.getElementById('delete-modal');
export const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
export const cancelDeleteBtn = document.getElementById('cancel-delete-btn');

// Navigation Buttons
export const navAllRecipesBtn = document.getElementById('nav-all-recipes');
export const navAddRecipeBtn = document.getElementById('nav-add-recipe');
export const navMySavedRecipesBtn = document.getElementById('nav-my-saved-recipes');
export const navAuthBtn = document.getElementById('nav-auth');
export const navLogoutBtn = document.getElementById('nav-logout');

// Sections
export const homeSection = document.getElementById('home-section');
export const addRecipeSection = document.getElementById('add-recipe-section');
export const mySavedRecipesSection = document.getElementById('my-saved-recipes-section');
export const authSection = document.getElementById('auth-section');

// Recipe List Elements
export const recipeListContainer = document.getElementById('recipe-list-container');
export const noRecipesMessage = document.getElementById('no-recipes-message');

// Add/Edit Recipe Form Elements
export const addRecipeSectionTitle = document.getElementById('add-edit-recipe-title');
export const addRecipeForm = document.getElementById('add-recipe-form');
export const recipeIdInput = document.getElementById('recipe-id-input');
export const recipeTitleInput = document.getElementById('recipe-title');
export const recipeDescriptionInput = document.getElementById('recipe-description');
export const recipeIngredientsInput = document.getElementById('recipe-ingredients');
export const recipeInstructionsInput = document.getElementById('recipe-instructions');
export const recipeImageInput = document.getElementById('recipe-image');
export const submitRecipeBtn = document.getElementById('submit-recipe-btn');
export const cancelEditBtn = document.getElementById('cancel-edit-btn');

// Saved Recipes Elements
export const savedRecipeListContainer = document.getElementById('saved-recipe-list-container');
export const noSavedRecipesMessage = document.getElementById('no-saved-recipes-message');
export const loginToViewSavedMessage = document.getElementById('login-to-view-saved-message');

// Auth Form Elements
export const authTitle = document.getElementById('auth-title');
export const authForm = document.getElementById('auth-form');
export const authEmailInput = document.getElementById('auth-email');
export const authPasswordInput = document.getElementById('auth-password');
export const confirmPasswordGroup = document.getElementById('confirm-password-group');
export const authConfirmPasswordInput = document.getElementById('auth-confirm-password');
export const authSubmitButton = document.getElementById('auth-submit-button');
export const authToggleText = document.getElementById('auth-toggle-text');
export const authToggleButton = document.getElementById('auth-toggle-button');
