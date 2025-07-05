// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAse2I0D2TlfyXXzhoHTraG5R6QEphllVE",
  authDomain: "spliy-expense-app.firebaseapp.com",
  projectId: "spliy-expense-app",
  storageBucket: "spliy-expense-app.firebasestorage.app",
  messagingSenderId: "530776942195",
  appId: "1:530776942195:web:5838e23c250d5e721e2c06",
  measurementId: "G-9ZCE53653E"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

let userId = null;
let groups = [];
let activeGroup = null;
let loading = true;
let errorMessage = null;

const appRoot = document.getElementById('app-root');
const sidebarRoot = document.getElementById('sidebar-root');

/**
 * Renders the sidebar content dynamically.
 * Includes group selection, new group button, and user ID display.
 */
function renderSidebar() {
  sidebarRoot.innerHTML = `
    <div>
      <h1 class="text-2xl font-bold mb-2">Expense Splitter</h1>
      <p class="text-gray-600 mb-4">Split bills fairly among friends</p>
      <button id="new-group-btn" class="btn-primary w-full mb-3 flex items-center justify-center gap-2"><i data-lucide="plus" class="h-5 w-5"></i> New Group</button>
      <div class="mb-2 text-xs text-gray-700 bg-gray-100 p-2 rounded-lg">
        <span>Your User ID:</span>
        <span class="font-mono font-semibold text-indigo-700 break-all">${userId || ''}</span>
      </div>
      <div class="mb-2">
        <label class="block text-xs font-medium text-gray-700 mb-1">Select Group</label>
        <select id="group-select" class="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
          <option value="">Choose a group...</option>
          ${groups.map(g => `<option value="${g.id}" ${activeGroup && g.id === activeGroup.id ? 'selected' : ''}>${g.name}</option>`).join('')}
        </select>
      </div>
    </div>
  `;
  lucide.createIcons();
  // Sidebar event listeners
  const newGroupBtn = document.getElementById('new-group-btn');
  if (newGroupBtn) newGroupBtn.onclick = showCreateGroupForm;
  const groupSelect = document.getElementById('group-select');
  if (groupSelect) groupSelect.onchange = (e) => {
    const group = groups.find(g => g.id === e.target.value);
    activeGroup = group || null;
    fetchMembersAndExpenses();
    renderSidebar();
    renderApp();
  };
}

/**
 * Renders the main application content based on loading state, errors, and active group.
 * This function structures the dashboard into a grid layout.
 */
function renderApp() {
  if (loading) {
    appRoot.innerHTML = `<div class="flex items-center justify-center min-h-[60vh]"><div class="text-indigo-600 text-xl font-semibold">Loading...</div></div>`;
    return;
  }
  if (errorMessage) {
    appRoot.innerHTML = `<div class="flex items-center justify-center min-h-[60vh]"><div class="bg-white p-6 rounded-xl shadow-lg text-red-700"><h3 class="text-lg font-semibold mb-2">Error:</h3><p>${errorMessage}</p></div></div>`;
    return;
  }
  if (!activeGroup) {
    appRoot.innerHTML = `<div class="flex items-center justify-center min-h-[60vh] col-span-full row-span-full"><div class="card text-center text-gray-600"><p class="mb-4">Select an existing group or create a new one to start tracking expenses.</p><button id="create-group-prompt-btn" class="btn-primary">Create New Group</button></div></div>`;
    document.getElementById('create-group-prompt-btn').onclick = showCreateGroupForm;
    return;
  }

  // Generate HTML for each section (members, expenses, balances, settlements)
  const membersHtml = generateMembersSection();
  const expensesHtml = generateExpensesSection();
  const addExpenseHtml = generateAddExpenseForm();
  const balancesHtml = generateBalancesSection();
  const settlementsHtml = generateSettlementsSection();

  // Render the main dashboard layout (previous working version)
  appRoot.innerHTML = `
    <div class="main-dashboard">
      <div class="dashboard-row">
        <div class="dashboard-col">${membersHtml}</div>
        <div class="dashboard-col">${addExpenseHtml}</div>
      </div>
      <div class="dashboard-row">
        <div class="dashboard-col">${expensesHtml}</div>
      </div>
      <div class="dashboard-row">
        <div class="dashboard-col">${balancesHtml}</div>
        <div class="dashboard-col">${settlementsHtml}</div>
      </div>
    </div>
  `;
  lucide.createIcons();
  addEventListeners();
}

/**
 * Generates the HTML for the Members section.
 * @returns {string} HTML string for the members section.
 */
function generateMembersSection() {
  const members = activeGroup.members || [];
  return `
    <div class="card-header"><i data-lucide="users" class="h-5 w-5 text-indigo-600"></i> Members</div>
    <form id="add-member-form" class="flex flex-col gap-2 mb-2">
      <input type="text" id="member-name" placeholder="Member Name" required class="w-full" />
      <input type="email" id="member-email" placeholder="Email (optional)" class="w-full" />
      <button type="submit" class="btn-primary w-full">Add Member</button>
    </form>
    <div class="member-list max-h-48 overflow-y-auto">
      ${members.length > 0 ? members.map(member => `
        <div class="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
          <span>${member.name}</span>
          <button class="btn-danger p-1 rounded-full" data-remove-member="${member.id}" title="Remove Member">
            <i data-lucide="trash-2" class="w-4 h-4"></i>
          </button>
        </div>
      `).join('') : '<div class="text-center text-gray-500 py-4">No members yet. Add some!</div>'}
    </div>
  `;
}

/**
 * Generates the HTML for the Expense Directory section.
 * @returns {string} HTML string for the expense directory.
 */
function generateExpensesSection() {
  const expenses = activeGroup.expenses || [];
  return `
    <div class="card-header"><i data-lucide="file-text" class="h-5 w-5 text-indigo-600"></i> Expense Directory</div>
    <div class="expense-list flex-1 overflow-y-auto max-h-64">
      ${expenses.length > 0 ? expenses.map(expense => `
        <div class="border border-gray-200 rounded-lg p-3 flex flex-col gap-1">
          <div class="flex items-center justify-between w-full">
            <span class="font-semibold text-gray-800">${expense.description}</span>
            <div class="flex gap-2">
              <button class="text-blue-600 hover:text-blue-800 p-1 rounded-full" data-edit-expense="${expense.id}" title="Edit Expense">
                <i data-lucide="edit-3" class="w-4 h-4"></i>
              </button>
              <button class="btn-danger p-1 rounded-full" data-delete-expense="${expense.id}" title="Delete Expense">
                <i data-lucide="trash-2" class="w-4 h-4"></i>
              </button>
            </div>
          </div>
          <div class="text-xs text-gray-600">Paid by: <span class="font-medium">${getMemberName(expense.paidBy)}</span> | <span class="font-bold text-green-700">$${Number(expense.amount).toFixed(2)}</span> | ${expense.date}</div>
          <div class="text-xs text-gray-600">Split with: ${(expense.splitWith || []).map(id => getMemberName(id)).join(', ')}</div>
          ${expense.category ? `<span class="inline-block mt-1 px-2 py-1 bg-indigo-100 text-indigo-800 text-xs rounded-full">${expense.category}</span>` : ''}
        </div>
      `).join('') : '<div class="text-center text-gray-500 py-8">No expenses yet. Add your first expense to get started!</div>'}
    </div>
  `;
}

/**
 * Generates the HTML for the Add Expense form.
 * This form is part of the main dashboard, not a modal.
 * @returns {string} HTML string for the add expense form.
 */
function generateAddExpenseForm() {
  const members = activeGroup.members || [];
  const today = new Date().toISOString().split('T')[0];
  return `
    <div class="card-header"><i data-lucide="plus-circle" class="h-5 w-5 text-indigo-600"></i> Add Expense</div>
    <form id="add-expense-form" class="flex flex-col gap-3">
      <div class="form-group">
        <label for="expense-desc" class="block text-sm font-medium text-gray-700">Description</label>
        <input type="text" id="expense-desc" placeholder="What was this expense for?" required />
      </div>
      <div class="form-group">
        <label for="expense-amount" class="block text-sm font-medium text-gray-700">Amount ($)</label>
        <input type="number" id="expense-amount" step="0.01" placeholder="0.00" required />
      </div>
      <div class="form-group">
        <label for="expense-date" class="block text-sm font-medium text-gray-700">Date</label>
        <input type="date" id="expense-date" value="${today}" required />
      </div>
      <div class="form-group">
        <label for="expense-paidby" class="block text-sm font-medium text-gray-700">Paid By</label>
        <select id="expense-paidby" class="w-full">
          ${members.map(m => `<option value="${m.id}">${m.name}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label for="expense-category" class="block text-sm font-medium text-gray-700">Category</label>
        <select id="expense-category" class="w-full">
          <option value="">Select category...</option>
          <option value="Food">Food</option>
          <option value="Accommodation">Accommodation</option>
          <option value="Travel">Travel</option>
          <option value="Other">Other</option>
        </select>
      </div>
      <div class="form-group">
        <label class="block text-sm font-medium text-gray-700 mb-1">Split With</label>
        <div class="flex flex-wrap gap-4">
          ${members.map(m => `
            <label class="flex items-center gap-2">
              <input type="checkbox" class="accent-indigo-600" name="splitWith" value="${m.id}" checked />
              <span>${m.name}</span>
            </label>
          `).join('')}
        </div>
      </div>
      <div class="flex gap-2 mt-2">
        <button type="submit" class="btn-primary flex-1">Add Expense</button>
        <button type="button" id="clear-expense-form" class="btn-secondary flex-1">Clear Form</button>
      </div>
    </form>
  `;
}

/**
 * Generates the HTML for the Balances section.
 * @returns {string} HTML string for the balances section.
 */
function generateBalancesSection() {
  const balances = calculateBalances();
  return `
    <div class="card-header"><i data-lucide="file-text" class="h-5 w-5 text-indigo-600"></i> Balances</div>
    <div class="balance-list">
      ${Object.keys(balances).length > 0 ? Object.entries(balances).map(([memberId, balance]) => `
        <div>${getMemberName(memberId)}: $${balance.toFixed(2)} ${balance === 0 ? 'gets back' : balance > 0 ? 'gets back' : 'owes'}</div>
      `).join('') : '<div class="text-gray-500">No balances yet.</div>'}
    </div>
  `;
}

/**
 * Generates the HTML for the Suggested Settlements section.
 * @returns {string} HTML string for the settlements section.
 */
function generateSettlementsSection() {
  const balances = calculateBalances(); // Recalculate balances for settlements
  const settlements = calculateSettlements(balances);
  return `
    <div class="card-header"><i data-lucide="handshake" class="h-5 w-5 text-indigo-600"></i> Suggested Settlements</div>
    <div class="settlement-list">
      ${settlements.length > 0 ? settlements.map(s => `<div>${getMemberName(s.from)} pays ${getMemberName(s.to)} <span class="font-semibold text-green-700">$${s.amount.toFixed(2)}</span></div>`).join('') : '<div class="text-gray-500">All settled up! 🎉</div>'}
    </div>
  `;
}

/**
 * Attaches all necessary event listeners to dynamically rendered elements.
 * This function is called after `renderApp` to ensure elements exist.
 */
function addEventListeners() {
  console.log('Attaching event listeners.');
  // Add Member Form Submission (inside the Members card)
  const addMemberForm = document.getElementById('add-member-form');
  if (addMemberForm) {
    addMemberForm.onsubmit = async (e) => {
      e.preventDefault();
      const name = document.getElementById('member-name').value.trim();
      const email = document.getElementById('member-email').value.trim();
      if (name) {
        await addMemberToGroup({ name, email });
        // No need to call renderApp() here, onSnapshot will handle it
        addMemberForm.reset(); // Clear the form
      } else {
        console.warn('Member name is required.');
      }
    };
  }

  // Remove Member Buttons
  document.querySelectorAll('[data-remove-member]').forEach(btn => {
    btn.onclick = async (e) => {
      const memberId = btn.getAttribute('data-remove-member');
      console.log('Attempting to remove member:', memberId);
      await removeMember(memberId);
      // No need to call renderApp() here, onSnapshot will handle it
    };
  });

  // Add Expense Form Submission (inside the Add Expense card)
  const addExpenseForm = document.getElementById('add-expense-form');
  if (addExpenseForm) {
    addExpenseForm.onsubmit = async (e) => {
      e.preventDefault();
      const description = document.getElementById('expense-desc').value.trim();
      const amount = document.getElementById('expense-amount').value;
      const date = document.getElementById('expense-date').value;
      const paidBy = document.getElementById('expense-paidby').value;
      const category = document.getElementById('expense-category').value;
      const splitWith = Array.from(document.querySelectorAll('#add-expense-form input[name=splitWith]:checked')).map(cb => cb.value);

      if (description && amount && splitWith.length > 0) {
        await addExpense({ description, amount, date, paidBy, category, splitWith });
        // No need to call renderApp() here, onSnapshot will handle it
        addExpenseForm.reset(); // Clear the form
        document.getElementById('expense-date').value = new Date().toISOString().split('T')[0]; // Reset date
        // Re-check all splitWith checkboxes by default
        document.querySelectorAll('#add-expense-form input[name=splitWith]').forEach(cb => cb.checked = true);
      } else {
        console.warn('Expense description, amount, and at least one split recipient are required.');
      }
    };
  }

  // Clear Expense Form Button
  const clearExpenseFormBtn = document.getElementById('clear-expense-form');
  if (clearExpenseFormBtn) {
    clearExpenseFormBtn.onclick = () => {
      document.getElementById('add-expense-form').reset();
      document.getElementById('expense-date').value = new Date().toISOString().split('T')[0];
      document.querySelectorAll('#add-expense-form input[name=splitWith]').forEach(cb => cb.checked = true);
    };
  }

  // Edit Expense Buttons (in Expense Directory)
  document.querySelectorAll('[data-edit-expense]').forEach(btn => {
    btn.onclick = async () => {
      const expenseId = btn.getAttribute('data-edit-expense');
      const expense = activeGroup.expenses.find(e => e.id === expenseId);
      if (expense) {
        console.log('Editing expense:', expenseId, expense);
        showExpenseModal(expense); // Open modal for editing
      } else {
        console.warn('Expense not found for editing:', expenseId);
      }
    };
  });

  // Delete Expense Buttons (in Expense Directory)
  document.querySelectorAll('[data-delete-expense]').forEach(btn => {
    btn.onclick = async () => {
      const expenseId = btn.getAttribute('data-delete-expense');
      console.log('Attempting to delete expense:', expenseId);
      await deleteExpense(expenseId);
      // No need to call renderApp() here, onSnapshot will handle it
    };
  });
}

/**
 * Displays a modal for creating a new group.
 */
function showCreateGroupForm() {
  console.log('Showing create group form modal.');
  showModal('Create New Group', `
    <div class="mb-4 modal-content">
      <label class="block text-sm font-medium text-gray-700 mb-2">Group Name</label>
      <input id="group-name" type="text" class="w-full" placeholder="e.g., Weekend Trip, Flatmates" required />
    </div>
    <div class="mb-6 modal-content">
      <label class="block text-sm font-medium text-gray-700 mb-2">Description (Optional)</label>
      <textarea id="group-desc" class="w-full resize-y" placeholder="Brief description of the group" rows="3"></textarea>
    </div>
  `, 'Create Group', async () => {
    const name = document.getElementById('group-name').value.trim();
    const description = document.getElementById('group-desc').value.trim();
    if (name) {
      await createGroup({ name, description });
      closeModal();
    } else {
      console.error('Group name is required!'); // Log error instead of alert
      // Implement a custom message box here instead of alert()
    }
  });
}

/**
 * Displays a modal for adding or editing an expense.
 * @param {object} [expense=null] - The expense object to edit, or null for a new expense.
 */
function showExpenseModal(expense = null) {
  console.log('Showing expense modal. Expense:', expense);
  const members = activeGroup.members || [];
  // Default form data for new expense or pre-fill for editing
  let formData = {
    description: expense?.description || '',
    amount: expense?.amount || '',
    paidBy: expense?.paidBy || (members[0]?.id || ''), // Default to first member
    splitWith: expense?.splitWith || members.map(m => m.id), // Default to all members
    splitType: expense?.splitType || 'equal', // Default split type
    date: expense?.date || new Date().toISOString().split('T')[0],
    category: expense?.category || ''
  };

  // Generate checkboxes for "Split With" section
  let splitWithHtml = members.map(m => `
    <label class="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
      <input type="checkbox" class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded" value="${m.id}" ${formData.splitWith.includes(m.id) ? 'checked' : ''} />
      <span class="text-gray-900">${m.name}</span>
    </label>
  `).join('');

  showModal(expense ? 'Edit Expense' : 'Add Expense', `
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 modal-content">
      <div class="md:col-span-2">
        <label for="modal-expense-desc" class="block text-sm font-medium text-gray-700 mb-2">Description</label>
        <input id="modal-expense-desc" type="text" value="${formData.description}" class="w-full" placeholder="What was this expense for?" required />
      </div>
      <div>
        <label for="modal-expense-amount" class="block text-sm font-medium text-gray-700 mb-2">Amount ($)</label>
        <input id="modal-expense-amount" type="number" step="0.01" value="${formData.amount}" class="w-full" placeholder="0.00" required />
      </div>
      <div>
        <label for="modal-expense-date" class="block text-sm font-medium text-gray-700 mb-2">Date</label>
        <input id="modal-expense-date" type="date" value="${formData.date}" class="w-full" required />
      </div>
      <div>
        <label for="modal-expense-paidby" class="block text-sm font-medium text-gray-700 mb-2">Paid By</label>
        <select id="modal-expense-paidby" class="w-full">
          ${members.map(m => `<option value="${m.id}" ${formData.paidBy === m.id ? 'selected' : ''}>${m.name}</option>`).join('')}
        </select>
      </div>
      <div>
        <label for="modal-expense-category" class="block text-sm font-medium text-gray-700 mb-2">Category</label>
        <select id="modal-expense-category" class="w-full">
          <option value="">Select category...</option>
          <option value="Food" ${formData.category === 'Food' ? 'selected' : ''}>Food</option>
          <option value="Accommodation" ${formData.category === 'Accommodation' ? 'selected' : ''}>Accommodation</option>
          <option value="Transportation" ${formData.category === 'Transportation' ? 'selected' : ''}>Transportation</option>
          <option value="Entertainment" ${formData.category === 'Entertainment' ? 'selected' : ''}>Entertainment</option>
          <option value="Utilities" ${formData.category === 'Utilities' ? 'selected' : ''}>Utilities</option>
          <option value="Other" ${formData.category === 'Other' ? 'selected' : ''}>Other</option>
        </select>
      </div>
    </div>
    <div class="mb-4 modal-content">
      <label class="block text-sm font-medium text-gray-700 mb-2">Split With</label>
      <div id="modal-split-with-list" class="space-y-2 max-h-32 overflow-y-auto p-2 border border-gray-200 rounded-lg bg-white">
        ${splitWithHtml}
      </div>
    </div>
  `, expense ? 'Update Expense' : 'Add Expense', async () => {
    // Get values from modal inputs
    formData.description = document.getElementById('modal-expense-desc').value.trim();
    formData.amount = document.getElementById('modal-expense-amount').value;
    formData.date = document.getElementById('modal-expense-date').value;
    formData.paidBy = document.getElementById('modal-expense-paidby').value;
    formData.category = document.getElementById('modal-expense-category').value;
    formData.splitWith = Array.from(document.querySelectorAll('#modal-split-with-list input[type=checkbox]:checked')).map(cb => cb.value);

    if (formData.description && formData.amount && formData.splitWith.length > 0) {
      if (expense) {
        await updateExpense(expense.id, formData);
      } else {
        await addExpense(formData);
      }
      closeModal();
    } else {
      console.error('Please fill in all required fields and select at least one person to split with.'); // Log error instead of alert
      // Implement a custom message box here instead of alert()
    }
  });
}

/**
 * Creates and displays a generic modal with custom content and action.
 * @param {string} title - The title of the modal.
 * @param {string} bodyHtml - The HTML content for the modal body.
 * @param {string} actionText - The text for the primary action button.
 * @param {Function} onAction - The callback function to execute when the action button is clicked.
 */
function showModal(title, bodyHtml, actionText, onAction) {
  // Remove any existing modals to prevent duplicates
  closeModal();

  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 modal';
  modal.innerHTML = `
    <div class="bg-white rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto flex flex-col">
      <h3 class="text-xl font-semibold text-gray-900 mb-4">${title}</h3>
      <div>${bodyHtml}</div>
      <div class="flex space-x-3 mt-6">
        <button id="modal-action-btn" class="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-lg transition-colors">${actionText}</button>
        <button id="modal-cancel-btn" class="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-2 px-4 rounded-lg transition-colors">Cancel</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  // Attach event listeners for modal buttons
  document.getElementById('modal-action-btn').onclick = async () => {
    await onAction();
  };
  document.getElementById('modal-cancel-btn').onclick = closeModal;
}

/**
 * Closes all active modals.
 */
function closeModal() {
  document.querySelectorAll('.modal').forEach(m => m.remove());
}

// --- Firebase CRUD Operations ---

/**
 * Creates a new group in Firestore and adds the current user as an initial member.
 * @param {object} data - Group data (name, description).
 */
async function createGroup(data) {
  loading = true;
  errorMessage = null;
  renderApp(); // Show loading state
  try {
    const groupRef = await db.collection(`artifacts/spliy-expense-app/public/data/groups`).add({
      name: data.name,
      description: data.description,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(), // Use server timestamp
      createdBy: userId,
    });
    // Add the current user as the first member of the new group
    await db.collection(`artifacts/spliy-expense-app/public/data/groups/${groupRef.id}/members`).add({
      name: `User ${userId.substring(0, 5)}`, // A simple name for the user
      email: '',
      userId: userId, // Store Firebase UID for this member
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    console.log('Group created with ID:', groupRef.id);
  } catch (e) {
    errorMessage = 'Failed to create group: ' + e.message;
    console.error("Error creating group: ", e);
  } finally {
    loading = false;
    // onSnapshot listeners will re-render, no need to call renderApp() here
  }
}

/**
 * Adds a new member to the active group.
 * @param {object} data - Member data (name, email).
 */
async function addMemberToGroup(data) {
  if (!activeGroup) {
    errorMessage = 'No active group selected to add members to.';
    renderApp();
    return;
  }
  loading = true;
  errorMessage = null;
  renderApp();
  try {
    await db.collection(`artifacts/spliy-expense-app/public/data/groups/${activeGroup.id}/members`).add({
      name: data.name,
      email: data.email,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    console.log('Member added to group:', activeGroup.id, data.name);
  } catch (e) {
    errorMessage = 'Failed to add member: ' + e.message;
    console.error("Error adding member: ", e);
  } finally {
    loading = false;
  }
}

/**
 * Removes a member from the active group.
 * @param {string} memberId - The ID of the member to remove.
 */
async function removeMember(memberId) {
  if (!activeGroup) {
    errorMessage = 'No active group selected.';
    renderApp();
    return;
  }
  loading = true;
  errorMessage = null;
  renderApp();
  try {
    await db.collection(`artifacts/spliy-expense-app/public/data/groups/${activeGroup.id}/members`).doc(memberId).delete();
    console.log('Member removed:', memberId);
  } catch (e) {
    errorMessage = 'Failed to remove member: ' + e.message;
    console.error("Error removing member: ", e);
  } finally {
    loading = false;
  }
}

/**
 * Adds a new expense to the active group.
 * @param {object} data - Expense data.
 */
async function addExpense(data) {
  if (!activeGroup) {
    errorMessage = 'No active group selected to add expenses to.';
    renderApp();
    return;
  }
  loading = true;
  errorMessage = null;
  renderApp();
  try {
    await db.collection(`artifacts/spliy-expense-app/public/data/groups/${activeGroup.id}/expenses`).add({
      description: data.description,
      amount: parseFloat(data.amount),
      paidBy: data.paidBy,
      splitType: data.splitType || 'equal', // Default to 'equal' if not provided
      splitWith: data.splitWith,
      date: data.date,
      category: data.category,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      createdBy: userId,
    });
    console.log('Expense added to group:', activeGroup.id, data.description);
  } catch (e) {
    errorMessage = 'Failed to add expense: ' + e.message;
    console.error("Error adding expense: ", e);
  } finally {
    loading = false;
  }
}

/**
 * Updates an existing expense in the active group.
 * @param {string} expenseId - The ID of the expense to update.
 * @param {object} data - Updated expense data.
 */
async function updateExpense(expenseId, data) {
  if (!activeGroup) {
    errorMessage = 'No active group selected.';
    renderApp();
    return;
  }
  loading = true;
  errorMessage = null;
  renderApp();
  try {
    await db.collection(`artifacts/spliy-expense-app/public/data/groups/${activeGroup.id}/expenses`).doc(expenseId).update({
      description: data.description,
      amount: parseFloat(data.amount),
      paidBy: data.paidBy,
      splitType: data.splitType || 'equal',
      splitWith: data.splitWith,
      date: data.date,
      category: data.category,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(), // Add update timestamp
    });
    console.log('Expense updated:', expenseId, data.description);
  } catch (e) {
    errorMessage = 'Failed to update expense: ' + e.message;
    console.error("Error updating expense: ", e);
  } finally {
    loading = false;
  }
}

/**
 * Deletes an expense from the active group.
 * @param {string} expenseId - The ID of the expense to delete.
 */
async function deleteExpense(expenseId) {
  if (!activeGroup) {
    errorMessage = 'No active group selected.';
    renderApp();
    return;
  }
  loading = true;
  errorMessage = null;
  renderApp();
  try {
    await db.collection(`artifacts/spliy-expense-app/public/data/groups/${activeGroup.id}/expenses`).doc(expenseId).delete();
    console.log('Expense deleted:', expenseId);
  } catch (e) {
    errorMessage = 'Failed to delete expense: ' + e.message;
    console.error("Error deleting expense: ", e);
  } finally {
    loading = false;
  }
}

/**
 * Retrieves the name of a member given their ID.
 * @param {string} memberId - The ID of the member.
 * @returns {string} The member's name or 'Unknown' if not found.
 */
function getMemberName(memberId) {
  const member = activeGroup && activeGroup.members ? activeGroup.members.find(m => m.id === memberId) : null;
  return member ? member.name : 'Unknown';
}

/**
 * Calculates the net balance for each member in the active group.
 * @returns {Array<object>} An array of member objects with their calculated balances.
 */
function calculateBalances() {
  if (!activeGroup || !activeGroup.members || !activeGroup.expenses) return {};

  const balances = {};
  activeGroup.members.forEach(member => {
    balances[member.id] = { name: member.name, balance: 0, paid: 0, owes: 0, id: member.id };
  });

  activeGroup.expenses.forEach(expense => {
    const { paidBy, amount, splitWith } = expense;

    // Add amount paid by the 'paidBy' member
    if (balances[paidBy]) {
      balances[paidBy].paid += amount;
    }

    // Distribute the expense among 'splitWith' members
    const numSplitWith = splitWith.length;
    if (numSplitWith > 0) {
      const splitAmount = amount / numSplitWith;
      splitWith.forEach(memberId => {
        if (balances[memberId]) {
          balances[memberId].owes += splitAmount;
        }
      });
    }
  });

  // Calculate final balance for each member
  Object.values(balances).forEach(b => {
    b.balance = b.paid - b.owes;
  });

  return balances;
}

/**
 * Calculates suggested settlements to balance debts among members.
 * @param {Array<object>} balances - An array of member balance objects.
 * @returns {Array<object>} An array of settlement objects (from, to, amount).
 */
function calculateSettlements(balances) {
  // Filter out members who are already settled (balance close to zero)
  const creditors = Object.entries(balances).filter(([, balance]) => balance > 0.01).sort(([, a], [, b]) => b - a); // Those who are owed money
  const debtors = Object.entries(balances).filter(([, balance]) => balance < -0.01).sort(([, a], [, b]) => a - b); // Those who owe money

  const settlements = [];
  let i = 0, j = 0; // Pointers for creditors and debtors arrays

  while (i < creditors.length && j < debtors.length) {
    const [creditorId, creditorBalance] = creditors[i];
    const [debtorId, debtorBalance] = debtors[j];

    // Amount to settle is the minimum of what creditor is owed and what debtor owes
    const amountToSettle = Math.min(creditorBalance, -debtorBalance);

    if (amountToSettle > 0.01) { // Only add settlement if amount is significant
      settlements.push({
        from: getMemberName(debtorId),
        to: getMemberName(creditorId),
        amount: amountToSettle.toFixed(2) // Format to 2 decimal places
      });
    }

    // Update balances after settlement
    balances[creditorId].balance -= amountToSettle;
    balances[debtorId].balance += amountToSettle;

    // Move to next creditor/debtor if their balance is settled
    if (balances[creditorId].balance < 0.01) i++;
    if (balances[debtorId].balance > -0.01) j++;
  }
  return settlements;
}

/**
 * Fetches members and expenses for the currently active group from Firestore.
 * This function uses onSnapshot to listen for real-time updates.
 */
function fetchMembersAndExpenses() {
  console.log('Fetching members and expenses for active group:', activeGroup?.id);
  if (!activeGroup) {
    renderSidebar();
    renderApp();
    return;
  }

  // Listen for real-time updates to members of the active group
  db.collection(`artifacts/spliy-expense-app/public/data/groups/${activeGroup.id}/members`).onSnapshot((snapshot) => {
    activeGroup.members = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    console.log('Members updated:', activeGroup.members);

    // Listen for real-time updates to expenses of the active group
    db.collection(`artifacts/spliy-expense-app/public/data/groups/${activeGroup.id}/expenses`).onSnapshot((expSnapshot) => {
      activeGroup.expenses = expSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      console.log('Expenses updated:', activeGroup.expenses);
      loading = false;
      errorMessage = null; // Clear any previous errors
      renderSidebar(); // Re-render sidebar to update group select
      renderApp(); // Re-render main app to update lists and calculations
    }, (err) => {
      errorMessage = 'Failed to load expenses: ' + err.message;
      loading = false;
      renderSidebar();
      renderApp();
      console.error("Error fetching expenses: ", err);
    });
  }, (err) => {
    errorMessage = 'Failed to load members: ' + err.message;
    loading = false;
    renderSidebar();
    renderApp();
    console.error("Error fetching members: ", err);
  });
}

/**
 * Listens for Firebase authentication state changes.
 * Initializes user ID and starts listening for group data once authenticated.
 */
function listenAuth() {
  console.log('Listening for auth state changes.');
  auth.onAuthStateChanged(async (user) => {
    if (user) {
      userId = user.uid;
      console.log('User authenticated:', userId);
      // Listen for real-time updates to the list of groups
      db.collection(`artifacts/spliy-expense-app/public/data/groups`).onSnapshot((snapshot) => {
        groups = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log('Groups updated:', groups);

        // If no active group is selected, or the active group was deleted,
        // try to set the first available group as active.
        if (!activeGroup || !groups.some(g => g.id === activeGroup.id)) {
          activeGroup = groups.length > 0 ? groups[0] : null;
          console.log('Setting active group to:', activeGroup);
        } else {
          // If active group exists, ensure its data is up-to-date
          const updated = groups.find(g => g.id === activeGroup.id);
          if (updated) {
            activeGroup = { ...activeGroup, ...updated }; // Merge to keep existing sub-collections data
            console.log('Updating active group data:', activeGroup);
          } else {
            activeGroup = null; // Active group no longer exists
            console.log('Active group no longer exists, setting to null.');
          }
        }
        fetchMembersAndExpenses(); // Fetch data for the active group
      }, (error) => {
        errorMessage = 'Failed to load groups: ' + error.message;
        loading = false;
        renderSidebar();
        renderApp();
        console.error("Error fetching groups: ", error);
      });
    } else {
      console.log('User not authenticated. Attempting anonymous sign-in.');
      // If no user is signed in, try to sign in anonymously using the provided token
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await auth.signInWithCustomToken(__initial_auth_token);
          console.log('Signed in with custom token.');
        } else {
          await auth.signInAnonymously();
          console.log('Signed in anonymously.');
        }
      } catch (e) {
        errorMessage = 'Authentication failed: ' + e.message;
        loading = false;
        renderSidebar();
        renderApp();
        console.error("Authentication error: ", e);
      }
    }
  });
}

// Start listening for authentication state when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM Content Loaded. Initializing app.');
  renderSidebar();
  renderApp();
  listenAuth();
});
