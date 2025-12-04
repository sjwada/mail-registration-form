import { 
  handleModeChange, 
  authenticateEdit, 
  requestMagicLink, 
  handleSubmit, 
  searchAddress, 
  toggleAddress,
  handleBack,
  handleFinalSubmit
} from './ui/form.js';
import { addGuardian, removeGuardian, handlePriorityChange } from './ui/components/guardian.js';
import { addStudent, removeStudent } from './ui/components/student.js';

// Expose functions to global scope for HTML onclick attributes
window.addGuardian = addGuardian;
window.addStudent = addStudent;
window.authenticateEdit = authenticateEdit;
window.requestMagicLink = requestMagicLink;
window.handleBack = handleBack;
window.handleFinalSubmit = handleFinalSubmit;

document.addEventListener('DOMContentLoaded', () => {
  // Mode selection
  document.querySelectorAll('input[name="mode"]').forEach(radio => {
    radio.addEventListener('change', handleModeChange);
  });

  // Initial mode setup
  handleModeChange();

  // Form submission
  const form = document.getElementById('registrationForm');
  if (form) {
    form.addEventListener('submit', handleSubmit);
  }

  // Global address search (Household)
  const searchBtn = document.getElementById('searchAddressBtn');
  if (searchBtn) {
    searchBtn.addEventListener('click', () => {
      searchAddress('postalCode', 'prefecture', 'city', 'street');
    });
  }

  // Event Delegation for dynamic elements
  document.addEventListener('click', (e) => {
    const target = e.target;

    // Remove Guardian
    if (target.matches('[data-remove-guardian]')) {
      const id = target.getAttribute('data-remove-guardian');
      removeGuardian(id);
    }

    // Remove Student
    if (target.matches('[data-remove-student]')) {
      const id = target.getAttribute('data-remove-student');
      removeStudent(id);
    }

    // Search Address (Dynamic)
    if (target.matches('[data-search-address]')) {
      const id = target.getAttribute('data-search-address');
      // Check if it's a student address (s_ prefix) or guardian
      if (id.startsWith('s_')) {
          searchAddress(`postalCode_${id}`, `prefecture_${id}`, `city_${id}`, `street_${id}`);
      } else {
          searchAddress(`postalCode_${id}`, `prefecture_${id}`, `city_${id}`, `street_${id}`);
      }
    }
  });

  // Event Delegation for checkboxes (Toggle Address)
  document.addEventListener('change', (e) => {
    const target = e.target;
    if (target.matches('[data-toggle-address]')) {
      const id = target.getAttribute('data-toggle-address');
      toggleAddress(id);
    }
    
    // Priority Swap
    if (target.matches('.priority-select')) {
      handlePriorityChange(e);
    }
  });
});
