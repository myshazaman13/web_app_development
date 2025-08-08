// state.js
// This module manages all the global state variables for the application.
// We use 'export' to make them accessible to other modules.

export const API_BASE_URL = window.location.origin;

export let currentUser = null; // Stores { id, email } of the logged-in user
export let allRecipes = []; // Cache for all recipes
export let savedRecipeIds = new Set(); // Set of IDs of recipes saved by the current user
export let likedRecipeIds = new Set(); // Set of IDs of recipes liked by the current user
export let recipeToDeleteId = null; // Stores the ID of the recipe to be deleted
export let isLoginMode = true; // State for the authentication form (login or register)

// Functions to update the state variables.
// This is a cleaner way to modify state from other modules.
export function setCurrentUser(user) {
    currentUser = user;
}

export function setAllRecipes(recipes) {
    allRecipes = recipes;
}

export function setSavedRecipeIds(ids) {
    savedRecipeIds = ids;
}

export function setLikedRecipeIds(ids) {
    likedRecipeIds = ids;
}

export function setRecipeToDeleteId(id) {
    recipeToDeleteId = id;
}

export function setIsLoginMode(mode) {
    isLoginMode = mode;
}
export function getAllRecipes() {
    return allRecipes;
}

export function getRecipeToDeleteId() {
    return recipeToDeleteId;
}
