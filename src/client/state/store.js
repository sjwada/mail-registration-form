/**
 * Simple Store for managing application state.
 */
export class Store {
  constructor(initialState = {}) {
    this.state = initialState;
    this.listeners = [];
  }

  /**
   * Get the current state.
   * @returns {object} The current state.
   */
  getState() {
    return this.state;
  }

  /**
   * Update the state.
   * @param {object} newState - Partial state to update.
   */
  setState(newState) {
    this.state = { ...this.state, ...newState };
    this.notify();
  }

  /**
   * Subscribe to state changes.
   * @param {function} listener - Callback function.
   * @returns {function} Unsubscribe function.
   */
  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Notify all listeners of state changes.
   */
  notify() {
    this.listeners.forEach(listener => listener(this.state));
  }
}

// Singleton instance
export const store = new Store({
  mode: 'new', // 'new' or 'edit'
  guardianCount: 0,
  studentCount: 0,
  household: {},
  guardians: [],
  students: []
});
