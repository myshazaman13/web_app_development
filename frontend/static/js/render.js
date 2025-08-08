// render.js
// This module handles all the logic for creating and rendering recipe cards.
import {
    API_BASE_URL,
    allRecipes,
    currentUser,
    savedRecipeIds,
    likedRecipeIds,
    setAllRecipes,
    setSavedRecipeIds,
    setLikedRecipeIds,
    setRecipeToDeleteId,
    getAllRecipes,
    getRecipeToDeleteId 
} from './state.js';
import {
    showMessage,
    showSection
} from './utils.js';
import {
    addRecipeSectionTitle,
    submitRecipeBtn,
    cancelEditBtn,
    recipeIdInput,
    recipeTitleInput,
    recipeDescriptionInput,
    recipeIngredientsInput,
    recipeInstructionsInput,
    deleteModal,
    recipeListContainer
} from './domElements.js';
import {
    fetchSavedRecipes,
    fetchAllRecipes
} from './api.js';

/**
 * Creates a single recipe card DOM element.
 * @param {Object} recipe The recipe data.
 * @returns {HTMLElement} The created recipe card element.
 */
export function createRecipeCard(recipe) {
    const card = document.createElement('div');
    card.className = 'recipe-card bg-white rounded-lg shadow-lg overflow-hidden transform transition-transform hover:scale-105 duration-300';
    card.dataset.id = recipe.id;

    const currentIsSaved = savedRecipeIds.has(recipe.id);
    const currentIsLiked = likedRecipeIds.has(recipe.id);
    let currentLikes = recipe.likes;

    // --- DEBUGGING LOGS ---
    console.log('--- Image Source Check ---');
    console.log('Recipe ID:', recipe.id);
    console.log('Image filename:', recipe.image_filename);
    
    const imageElement = document.createElement('img');
    imageElement.className = 'w-full h-48 object-contain rounded-md mb-4 shadow-sm';
    imageElement.alt = recipe.title;
    
    // Set the image source based on whether a filename exists.
    let imageUrl;
    if (recipe.image_filename) {
        imageUrl = `${API_BASE_URL}/uploads/${recipe.image_filename}`;
    } else {
        imageUrl = 'https://placehold.co/400x200/cccccc/333333?text=No+Image';
    }
    imageElement.src = imageUrl;
    console.log('Final image URL:', imageUrl);
    // --- END DEBUGGING LOGS ---

    const isCreator = currentUser && currentUser.id === recipe.creatorId;
    
    const ingredientsArray = Array.isArray(recipe.ingredients) ?
        recipe.ingredients.map(item => item.trim()).filter(item => item !== '') :
        (recipe.ingredients ? String(recipe.ingredients).split(',').map(item => item.trim()).filter(item => item !== '') : []);

    const mainContentDiv = document.createElement('div');
    mainContentDiv.className = 'p-5';
    
    mainContentDiv.innerHTML = `
        <h3 class="text-xl font-bold text-red-800 mb-2">${recipe.title}</h3>
        <p class="text-gray-600 text-sm mb-3 line-clamp-3">${recipe.description}</p>
        <div class="flex justify-between items-center text-sm text-gray-500 mb-3">
            <span>By: ${recipe.creatorEmail || 'Unknown'}</span>
            <span data-likes-count="${recipe.id}">Likes: ${currentLikes}</span>
        </div>
        <div class="flex gap-2 mt-4 flex-wrap">
            <button class="view-details-btn flex-1 px-3 py-1 bg-red-800 text-white rounded-md hover:bg-red-900 transition-colors text-sm shadow-sm">
                View Details
            </button>
            ${currentUser ? `
                <button class="save-recipe-btn flex-1 px-3 py-1 rounded-md transition-colors text-sm shadow-sm ${currentIsSaved ? 'bg-gray-400 hover:bg-gray-500 text-white' : 'bg-blue-300 hover:bg-blue-400 text-white'}">
                    ${currentIsSaved ? 'Unsave' : 'Save'}
                </button>
                <button 
                    class="like-recipe-btn flex items-center justify-center p-2 rounded-md transition-colors text-sm shadow-sm"
                    aria-pressed="${currentIsLiked}" 
                    aria-label="${currentIsLiked ? 'Unlike recipe' : 'Like recipe'}"
                >
                    <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        class="h-6 w-6 transition-colors duration-300" 
                        fill="${currentIsLiked ? '#a21f1f' : 'none'}" 
                        viewBox="0 0 24 24" 
                        stroke="#a21f1f" 
                        stroke-width="2"
                    >
                        <path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 0 1 6.364 0L12 7.636l1.318-1.318a4.5 4.5 0 1 1 6.364 6.364L12 21.364l-7.682-7.682a4.5 4.5 0 0 1 0-6.364z" />
                    </svg>
                </button>
            ` : ''}
        </div>
        ${isCreator ? `
            <div class="flex gap-2 mt-2">
                <button class="edit-recipe-btn flex-1 px-3 py-1 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition-colors text-sm shadow-sm">
                    Edit
                </button>
                <button class="delete-recipe-btn flex-1 px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors text-sm shadow-sm">
                    Delete
                </button>
            </div>
        ` : ''}
    `;
    card.appendChild(imageElement);
    card.appendChild(mainContentDiv);

    const detailsSection = document.createElement('div');
    detailsSection.className = 'recipe-card-details hidden p-5 border-t border-gray-200';
    const ingredientsTitle = document.createElement('h4');
    ingredientsTitle.className = 'text-lg font-semibold text-red-800 mb-2';
    ingredientsTitle.textContent = 'Ingredients:';
    detailsSection.appendChild(ingredientsTitle);

    const ingredientsList = document.createElement('ul');
    ingredientsList.className = 'list-none text-gray-700 mb-4 space-y-1';

    if (ingredientsArray.length > 0) {
        ingredientsArray.forEach((ing) => {
            const listItem = document.createElement('li');
            listItem.className = 'flex items-center';
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'form-checkbox h-4 w-4 text-red-800 rounded-sm';
            const span = document.createElement('span');
            span.className = 'ml-2 text-gray-700';
            span.textContent = ing;
            const label = document.createElement('label');
            label.className = 'inline-flex items-center';
            label.appendChild(checkbox);
            label.appendChild(span);
            listItem.appendChild(label);
            ingredientsList.appendChild(listItem);
        });
    } else {
        const noIngredientsItem = document.createElement('li');
        noIngredientsItem.textContent = 'No ingredients listed.';
        ingredientsList.appendChild(noIngredientsItem);
    }
    detailsSection.appendChild(ingredientsList);

    const instructionsTitle = document.createElement('h4');
    instructionsTitle.className = 'text-lg font-semibold text-red-800 mb-2';
    instructionsTitle.textContent = 'Instructions:';
    detailsSection.appendChild(instructionsTitle);

    const instructionsText = document.createElement('p');
    instructionsText.className = 'text-gray-700 whitespace-pre-wrap';
    instructionsText.textContent = recipe.instructions;
    detailsSection.appendChild(instructionsText);
    card.appendChild(detailsSection);

    const viewDetailsBtn = card.querySelector('.view-details-btn');
    const saveRecipeBtn = card.querySelector('.save-recipe-btn');
    const likeRecipeBtn = card.querySelector('.like-recipe-btn');
    const likesCountSpan = card.querySelector(`[data-likes-count="${recipe.id}"]`);
    const editRecipeBtn = card.querySelector('.edit-recipe-btn');
    const deleteRecipeBtn = card.querySelector('.delete-recipe-btn');


    // Add event listeners for dynamic interactions
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
                    const currentIsSaved = data.saved;
                    if (currentIsSaved) {
                        saveRecipeBtn.classList.remove('bg-blue-300', 'hover:bg-blue-400');
                        saveRecipeBtn.classList.add('bg-gray-400', 'hover:bg-gray-500');
                        saveRecipeBtn.textContent = 'Unsave';
                        savedRecipeIds.add(recipe.id);
                    } else {
                        saveRecipeBtn.classList.remove('bg-gray-400', 'hover:bg-gray-500');
                        saveRecipeBtn.classList.add('bg-blue-300', 'hover:bg-blue-400');
                        saveRecipeBtn.textContent = 'Save';
                        savedRecipeIds.delete(recipe.id);
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
                    const currentIsLiked = data.liked;
                    const newLikes = data.likes;
                    likesCountSpan.textContent = `Likes: ${newLikes}`;
                    const svg = likeRecipeBtn.querySelector('svg');
                    if (currentIsLiked) {
                        svg.setAttribute('fill', '#a21f1f');
                        likedRecipeIds.add(recipe.id);
                    } else {
                        svg.setAttribute('fill', 'none');
                        likedRecipeIds.delete(recipe.id);
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

    if (editRecipeBtn) {
        editRecipeBtn.addEventListener('click', () => {
            recipeIdInput.value = recipe.id;
            recipeTitleInput.value = recipe.title;
            recipeDescriptionInput.value = recipe.description;
            recipeIngredientsInput.value = Array.isArray(recipe.ingredients) ?
                recipe.ingredients.join(', ') :
                recipe.ingredients;
            recipeInstructionsInput.value = recipe.instructions;
            addRecipeSectionTitle.textContent = 'Update Recipe';
            submitRecipeBtn.textContent = 'Update Recipe';
            cancelEditBtn.classList.remove('hidden');
            document.getElementById('image-upload-status').textContent = 'Leave blank to keep existing image.';
            showSection('add-recipe-section');
        });
    }

    if (deleteRecipeBtn) {
        deleteRecipeBtn.addEventListener('click', () => {
            setRecipeToDeleteId(recipe.id);
            deleteModal.classList.remove('hidden');
        });
    }

    return card;
}

/**
 * Renders an array of recipes into a specified container element.
 * @param {Array<Object>} recipes The array of recipe objects to render.
 * @param {HTMLElement} containerElement The container to render the cards into.
 */
export function renderRecipes(recipes, containerElement) {
    containerElement.innerHTML = ''; // Clear existing recipes
    if (recipes.length === 0) {
        return;
    }
    recipes.forEach(recipe => {
        const card = createRecipeCard(recipe);
        containerElement.appendChild(card);
    });
}

/**
 * Resets the add/edit recipe form to its default 'Add' state.
 */
export function resetAddEditForm() {
    document.getElementById('add-recipe-form').reset();
    recipeIdInput.value = '';
    addRecipeSectionTitle.textContent = 'Add New Recipe';
    submitRecipeBtn.textContent = 'Add Recipe';
    cancelEditBtn.classList.add('hidden');
    document.getElementById('image-upload-status').textContent = '';
}

export async function confirmDeleteRecipe() {
    const recipeToDeleteId = getRecipeToDeleteId();
    try {
        if (!recipeToDeleteId) return;

        const response = await fetch(`${API_BASE_URL}/api/recipes/${recipeToDeleteId}`, {
            method: 'DELETE',
            credentials: 'include'
        });

        const data = await response.json();

        if (response.ok) {
            showMessage(data.message, 'success');
            // Remove the card from the DOM without a full refresh
            const cardToRemove = document.querySelector(`.recipe-card[data-id="${recipeToDeleteId}"]`);
            if (cardToRemove) {
                cardToRemove.remove();
            }
            // Hide the modal and clear the ID
            deleteModal.classList.add('hidden');
            setRecipeToDeleteId(null);
            // Also update the allRecipes array
            const newRecipes = allRecipes.filter(r => r.id !== recipeToDeleteId);
            setAllRecipes(newRecipes);
            // Re-render to update the "no recipes" message if needed
            renderRecipes(allRecipes, recipeListContainer);

        } else {
            showMessage(`Error deleting recipe: ${data.message || 'Unknown error'}`, 'error');
        }
    } catch (error) {
        showMessage(`Network error: ${error.message}`, 'error');
        console.error("Error deleting recipe:", error);
    }
}
