// utils.js
// This module contains general utility functions that can be used across the application.
import {
    messageDisplay
} from './domElements.js';

/**
 * Displays a temporary message to the user.
 * @param {string} text The message to display.
 * @param {string} type The type of message ('info', 'success', 'error').
 */
export function showMessage(text, type = 'info') {
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

/**
 * Shows a specific section of the page and hides all others.
 * @param {string} sectionId The ID of the section to show.
 */
export function showSection(sectionId) {
    const sections = document.querySelectorAll('.page-section');
    sections.forEach(section => {
        if (section.id === sectionId) {
            section.classList.remove('hidden');
        } else {
            section.classList.add('hidden');
        }
    });
}
