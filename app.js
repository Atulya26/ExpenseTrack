// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAse2I0D2TlfyXXzhoHTraG5R6QEphllVE",
  authDomain: "spliy-expense-app.firebaseapp.com",
  projectId: "spliy-expense-app",
  storageBucket: "spliy-expense-app.firebasestorage.app",
  messagingSenderId: "530776942195",
  appId: "1:530776942195:web:5838e23c250d5e721e2c06",
  measurementId: "G-9ZCE53653E"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

let userId = null;
let groups = [];
let activeGroup = null;
let loading = true;
let errorMessage = null;

const appRoot = document.getElementById('app-root');

function showLoading() {
  appRoot.innerHTML = `<div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
    <div class="text-indigo-600 text-xl font-semibold">Loading Expense System...</div>
  </div>`;
}

function showError(message) {
  appRoot.innerHTML = `<div class="min-h-screen flex items-center justify-center bg-red-50">
    <div class="bg-white p-6 rounded-xl shadow-lg text-red-700">
      <h3 class="text-lg font-semibold mb-2">Error:</h3>
      <p>${message}</p>
      <p class="text-sm mt-2">Please ensure Firebase is correctly configured and your network is stable.</p>
    </div>
  </div>`;
}

function renderApp() {
  if (loading) return showLoading();
  if (errorMessage) return showError(errorMessage);

  let groupOptions = groups.map(g => `<option value="${g.id}" ${activeGroup && g.id === activeGroup.id ? 'selected' : ''}>${g.name}</option>`).join('');

  let membersHtml = '';
  if (activeGroup && activeGroup.members && activeGroup.members.length > 0) {
    membersHtml = activeGroup.members.map(member => `
      <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
        <div>
          <div class="font-medium text-gray-900">${member.name}</div>
          <div class="text-sm text-gray-600">${member.email || ''}</div>
        </div>
        <button class="text-red-600 hover:text-red-800 p-1" data-remove-member="${member.id}">
          <i data-lucide="trash-2" class="w-4 h-4"></i>
        </button>
      </div>
    `).join('');
  } else {
    membersHtml = '<div class="text-center text-gray-500 py-4">No members yet. Add some!</div>';
  }

  // Balances and settlements
  const balances = calculateBalances();
  const settlements = calculateSettlements(balances);

  let balancesHtml = balances.map(b => `
    <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
      <span class="font-medium text-gray-900">${b.name}</span>
      <span class="font-bold ${b.balance >= 0 ? 'text-green-600' : 'text-red-600'}">
        $${Math.abs(b.balance).toFixed(2)} ${b.balance >= 0 ? 'gets back' : 'owes'}
      </span>
    </div>
  `).join('');

  let settlementsHtml = settlements.length > 0 ? settlements.map(s => `
    <div class="p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
      <div class="text-sm text-gray-900">
        <span class="font-medium">${s.from}</span> owes <span class="font-medium">${s.to}</span> <span class="font-bold text-blue-600">$${s.amount}</span>
      </div>
    </div>
  `).join('') : '<div class="text-center text-gray-500 py-4">All settled up! 🎉</div>';

  // Expenses
  let expensesHtml = '';
  if (activeGroup && activeGroup.expenses && activeGroup.expenses.length > 0) {
    expensesHtml = activeGroup.expenses.map(expense => `
      <div class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
        <div class="flex items-center justify-between">
          <div class="flex-1">
            <div class="flex items-center justify-between mb-2">
              <h3 class="font-semibold text-gray-900">${expense.description}</h3>
              <div class="flex items-center space-x-2">
                <button class="text-blue-600 hover:text-blue-800 p-1" data-edit-expense="${expense.id}"><i data-lucide="edit-3" class="w-4 h-4"></i></button>
                <button class="text-red-600 hover:text-red-800 p-1" data-delete-expense="${expense.id}"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
              </div>
            </div>
            <div class="flex items-center justify-between text-sm text-gray-600 mb-2">
              <span>Paid by: <span class="font-medium">${getMemberName(expense.paidBy)}</span></span>
              <span class="font-bold text-lg text-gray-900">$${Number(expense.amount).toFixed(2)}</span>
            </div>
            <div class="flex items-center justify-between text-sm text-gray-600">
              <span>Split with: ${expense.splitWith.map(id => getMemberName(id)).join(', ')}</span>
              <span>${expense.date}</span>
            </div>
            ${expense.category ? `<span class="inline-block mt-2 px-2 py-1 bg-indigo-100 text-indigo-800 text-xs rounded-full">${expense.category}</span>` : ''}
          </div>
        </div>
      </div>
    `).join('');
  } else {
    expensesHtml = '<div class="text-center text-gray-500 py-8">No expenses yet. Add your first expense to get started!</div>';
  }

  // Main UI
  appRoot.innerHTML = `
    <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 font-inter">
      <div class="max-w-6xl mx-auto">
        <div class="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <div class="flex items-center justify-between mb-6">
            <div class="flex items-center space-x-3">
              <div class="p-3 bg-indigo-100 rounded-full">
                <i data-lucide="receipt" class="h-8 w-8 text-indigo-600"></i>
              </div>
              <div>
                <h1 class="text-3xl font-bold text-gray-900">Expense Splitter</h1>
                <p class="text-gray-600">Split bills fairly among friends</p>
              </div>
            </div>
            <button id="new-group-btn" class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors">
              <i data-lucide="plus" class="h-5 w-5"></i>
              <span>New Group</span>
            </button>
          </div>
          ${userId ? `<div class="mb-4 text-sm text-gray-700 bg-gray-100 p-3 rounded-lg flex items-center justify-between">
            <span>Your User ID: <span class="font-mono font-semibold text-indigo-700 break-all">${userId}</span></span>
            <span class="text-xs text-gray-500 ml-2">(Share this ID for group identification)</span>
          </div>` : ''}
          <div class="mb-6">
            <label class="block text-sm font-medium text-gray-700 mb-2">Select Group</label>
            <select id="group-select" class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
              <option value="">Choose a group...</option>
              ${groupOptions}
            </select>
          </div>
        </div>
        ${activeGroup ? `
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div class="space-y-6">
            <div class="bg-white rounded-xl shadow-lg p-6">
              <div class="flex items-center justify-between mb-4">
                <div class="flex items-center space-x-2">
                  <i data-lucide="users" class="h-5 w-5 text-indigo-600"></i>
                  <h2 class="text-xl font-semibold text-gray-900">Members</h2>
                </div>
                <button id="add-member-btn" class="bg-green-600 hover:bg-green-700 text-white p-2 rounded-lg transition-colors">
                  <i data-lucide="user-plus" class="h-4 w-4"></i>
                </button>
              </div>
              <div class="space-y-3">${membersHtml}</div>
            </div>
            <div class="bg-white rounded-xl shadow-lg p-6">
              <div class="flex items-center space-x-2 mb-4">
                <i data-lucide="calculator" class="h-5 w-5 text-indigo-600"></i>
                <h2 class="text-xl font-semibold text-gray-900">Balances</h2>
              </div>
              <div class="space-y-3">${balancesHtml}</div>
            </div>
            <div class="bg-white rounded-xl shadow-lg p-6">
              <h2 class="text-xl font-semibold text-gray-900 mb-4">Suggested Settlements</h2>
              <div class="space-y-3">${settlementsHtml}</div>
            </div>
          </div>
          <div class="lg:col-span-2">
            <div class="bg-white rounded-xl shadow-lg p-6">
              <div class="flex items-center justify-between mb-6">
                <h2 class="text-xl font-semibold text-gray-900">Expenses</h2>
                <button id="add-expense-btn" class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors">
                  <i data-lucide="plus" class="h-5 w-5"></i>
                  <span>Add Expense</span>
                </button>
              </div>
              <div class="space-y-4">${expensesHtml}</div>
            </div>
          </div>
        </div>
        ` : `
        <div class="bg-white rounded-xl shadow-lg p-6 text-center text-gray-600">
          <p class="mb-4">Select an existing group or create a new one to start tracking expenses.</p>
          <button id="new-group-btn" class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors mx-auto">
            <i data-lucide="plus" class="h-5 w-5"></i>
            <span>Create New Group</span>
          </button>
        </div>
        `}
      </div>
    </div>
  `;
  lucide.createIcons();
  addEventListeners();
}

function addEventListeners() {
  // Group selection
  const groupSelect = document.getElementById('group-select');
  if (groupSelect) {
    groupSelect.onchange = (e) => {
      const group = groups.find(g => g.id === e.target.value);
      activeGroup = group || null;
      fetchMembersAndExpenses();
    };
  }
  // New group
  document.querySelectorAll('#new-group-btn').forEach(btn => {
    btn.onclick = showCreateGroupModal;
  });
  // Add member
  const addMemberBtn = document.getElementById('add-member-btn');
  if (addMemberBtn) addMemberBtn.onclick = showAddMemberModal;
  // Remove member
  document.querySelectorAll('[data-remove-member]').forEach(btn => {
    btn.onclick = (e) => {
      const memberId = btn.getAttribute('data-remove-member');
      removeMember(memberId);
    };
  });
  // Add expense
  const addExpenseBtn = document.getElementById('add-expense-btn');
  if (addExpenseBtn) addExpenseBtn.onclick = showAddExpenseModal;
  // Edit/delete expense
  document.querySelectorAll('[data-edit-expense]').forEach(btn => {
    btn.onclick = () => {
      const expenseId = btn.getAttribute('data-edit-expense');
      const expense = activeGroup.expenses.find(e => e.id === expenseId);
      showExpenseModal(expense);
    };
  });
  document.querySelectorAll('[data-delete-expense]').forEach(btn => {
    btn.onclick = () => {
      const expenseId = btn.getAttribute('data-delete-expense');
      deleteExpense(expenseId);
    };
  });
}

function showCreateGroupModal() {
  showModal('Create New Group', `
    <div class="mb-4">
      <label class="block text-sm font-medium text-gray-700 mb-2">Group Name</label>
      <input id="group-name" type="text" class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" placeholder="e.g., Weekend Trip, Flatmates" />
    </div>
    <div class="mb-6">
      <label class="block text-sm font-medium text-gray-700 mb-2">Description (Optional)</label>
      <textarea id="group-desc" class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-y" placeholder="Brief description of the group" rows="3"></textarea>
    </div>
  `, 'Create Group', async () => {
    const name = document.getElementById('group-name').value.trim();
    const description = document.getElementById('group-desc').value.trim();
    if (name) {
      await createGroup({ name, description });
      closeModal();
    }
  });
}

function showAddMemberModal() {
  showModal('Add Member', `
    <div class="mb-4">
      <label class="block text-sm font-medium text-gray-700 mb-2">Name</label>
      <input id="member-name" type="text" class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" placeholder="Member's name" />
    </div>
    <div class="mb-6">
      <label class="block text-sm font-medium text-gray-700 mb-2">Email</label>
      <input id="member-email" type="email" class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" placeholder="Member's email (optional)" />
    </div>
  `, 'Add Member', async () => {
    const name = document.getElementById('member-name').value.trim();
    const email = document.getElementById('member-email').value.trim();
    if (name) {
      await addMemberToGroup({ name, email });
      closeModal();
    }
  });
}

function showAddExpenseModal() {
  showExpenseModal();
}

function showExpenseModal(expense = null) {
  const members = activeGroup.members || [];
  let formData = {
    description: expense?.description || '',
    amount: expense?.amount || '',
    paidBy: expense?.paidBy || (members[0]?.id || ''),
    splitWith: expense?.splitWith || members.map(m => m.id),
    splitType: expense?.splitType || 'equal',
    date: expense?.date || new Date().toISOString().split('T')[0],
    category: expense?.category || ''
  };
  let splitWithHtml = members.map(m => `
    <label class="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50">
      <input type="checkbox" class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded" value="${m.id}" ${formData.splitWith.includes(m.id) ? 'checked' : ''} />
      <span class="text-gray-900">${m.name}</span>
    </label>
  `).join('');
  showModal(expense ? 'Edit Expense' : 'Add Expense', `
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
      <div class="md:col-span-2">
        <label class="block text-sm font-medium text-gray-700 mb-2">Description</label>
        <input id="expense-desc" type="text" value="${formData.description}" class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" placeholder="What was this expense for?" />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">Amount ($)</label>
        <input id="expense-amount" type="number" step="0.01" value="${formData.amount}" class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" placeholder="0.00" />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">Date</label>
        <input id="expense-date" type="date" value="${formData.date}" class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">Paid By</label>
        <select id="expense-paidby" class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
          ${members.map(m => `<option value="${m.id}" ${formData.paidBy === m.id ? 'selected' : ''}>${m.name}</option>`).join('')}
        </select>
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">Category</label>
        <select id="expense-category" class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
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
    <div class="mb-4">
      <label class="block text-sm font-medium text-gray-700 mb-2">Split With</label>
      <div id="split-with-list" class="space-y-2 max-h-32 overflow-y-auto">${splitWithHtml}</div>
    </div>
  `, expense ? 'Update Expense' : 'Add Expense', async () => {
    formData.description = document.getElementById('expense-desc').value.trim();
    formData.amount = document.getElementById('expense-amount').value;
    formData.date = document.getElementById('expense-date').value;
    formData.paidBy = document.getElementById('expense-paidby').value;
    formData.category = document.getElementById('expense-category').value;
    formData.splitWith = Array.from(document.querySelectorAll('#split-with-list input[type=checkbox]:checked')).map(cb => cb.value);
    if (formData.description && formData.amount && formData.splitWith.length > 0) {
      if (expense) {
        await updateExpense(expense.id, formData);
      } else {
        await addExpense(formData);
      }
      closeModal();
    }
  });
}

function showModal(title, bodyHtml, actionText, onAction) {
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 modal';
  modal.innerHTML = `
    <div class="bg-white rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
      <h3 class="text-lg font-semibold text-gray-900 mb-4">${title}</h3>
      <div>${bodyHtml}</div>
      <div class="flex space-x-3 mt-6">
        <button id="modal-action-btn" class="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-lg transition-colors">${actionText}</button>
        <button id="modal-cancel-btn" class="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-2 px-4 rounded-lg transition-colors">Cancel</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  document.getElementById('modal-action-btn').onclick = async () => {
    await onAction();
  };
  document.getElementById('modal-cancel-btn').onclick = closeModal;
}

function closeModal() {
  document.querySelectorAll('.modal').forEach(m => m.remove());
}

// --- Firebase CRUD ---
async function createGroup(data) {
  loading = true;
  renderApp();
  const ref = await db.collection('artifacts/spliy-expense-app/public/data/groups').add({
    name: data.name,
    description: data.description,
    createdAt: new Date().toISOString(),
    createdBy: userId,
  });
  await ref.collection('members').add({
    name: `User ${userId.substring(0, 5)}`,
    email: '',
    userId: userId,
  });
  loading = false;
}

async function addMemberToGroup(data) {
  loading = true;
  renderApp();
  await db.collection(`artifacts/spliy-expense-app/public/data/groups/${activeGroup.id}/members`).add({
    name: data.name,
    email: data.email,
  });
  loading = false;
}

async function removeMember(memberId) {
  loading = true;
  renderApp();
  await db.collection(`artifacts/spliy-expense-app/public/data/groups/${activeGroup.id}/members`).doc(memberId).delete();
  loading = false;
}

async function addExpense(data) {
  loading = true;
  renderApp();
  await db.collection(`artifacts/spliy-expense-app/public/data/groups/${activeGroup.id}/expenses`).add({
    description: data.description,
    amount: parseFloat(data.amount),
    paidBy: data.paidBy,
    splitType: data.splitType,
    splitWith: data.splitWith,
    date: data.date,
    category: data.category,
    createdAt: new Date().toISOString(),
    createdBy: userId,
  });
  loading = false;
}

async function updateExpense(expenseId, data) {
  loading = true;
  renderApp();
  await db.collection(`artifacts/spliy-expense-app/public/data/groups/${activeGroup.id}/expenses`).doc(expenseId).update({
    description: data.description,
    amount: parseFloat(data.amount),
    paidBy: data.paidBy,
    splitType: data.splitType,
    splitWith: data.splitWith,
    date: data.date,
    category: data.category,
  });
  loading = false;
}

async function deleteExpense(expenseId) {
  loading = true;
  renderApp();
  await db.collection(`artifacts/spliy-expense-app/public/data/groups/${activeGroup.id}/expenses`).doc(expenseId).delete();
  loading = false;
}

function getMemberName(memberId) {
  const member = activeGroup && activeGroup.members ? activeGroup.members.find(m => m.id === memberId) : null;
  return member ? member.name : 'Unknown';
}

function calculateBalances() {
  if (!activeGroup || !activeGroup.members || !activeGroup.expenses) return [];
  const balances = {};
  activeGroup.members.forEach(member => {
    balances[member.id] = { name: member.name, balance: 0, paid: 0, owes: 0 };
  });
  activeGroup.expenses.forEach(expense => {
    const { paidBy, amount, splitWith, splitType } = expense;
    if (balances[paidBy]) balances[paidBy].paid += amount;
    let splitAmount = amount / splitWith.length;
    splitWith.forEach(memberId => {
      if (balances[memberId]) {
        balances[memberId].owes += splitAmount;
        balances[memberId].balance = balances[memberId].paid - balances[memberId].owes;
      }
    });
  });
  return Object.values(balances);
}

function calculateSettlements(balances) {
  const creditors = balances.filter(b => b.balance > 0.01).sort((a, b) => b.balance - a.balance);
  const debtors = balances.filter(b => b.balance < -0.01).sort((a, b) => a.balance - b.balance);
  const settlements = [];
  let i = 0, j = 0;
  while (i < creditors.length && j < debtors.length) {
    const creditor = creditors[i];
    const debtor = debtors[j];
    const amount = Math.min(creditor.balance, -debtor.balance);
    if (amount > 0.01) {
      settlements.push({ from: debtor.name, to: creditor.name, amount: amount.toFixed(2) });
    }
    creditor.balance -= amount;
    debtor.balance += amount;
    if (creditor.balance < 0.01) i++;
    if (debtor.balance > -0.01) j++;
  }
  return settlements;
}

function fetchMembersAndExpenses() {
  if (!activeGroup) return renderApp();
  // Members
  db.collection(`artifacts/spliy-expense-app/public/data/groups/${activeGroup.id}/members`).onSnapshot((snapshot) => {
    activeGroup.members = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    // Expenses
    db.collection(`artifacts/spliy-expense-app/public/data/groups/${activeGroup.id}/expenses`).onSnapshot((expSnapshot) => {
      activeGroup.expenses = expSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      loading = false;
      errorMessage = null;
      renderApp();
    }, (err) => {
      errorMessage = 'Failed to load expenses: ' + err.message;
      loading = false;
      renderApp();
    });
  }, (err) => {
    errorMessage = 'Failed to load members: ' + err.message;
    loading = false;
    renderApp();
  });
}

function listenAuth() {
  showLoading();
  auth.onAuthStateChanged(async (user) => {
    if (user) {
      userId = user.uid;
      db.collection('artifacts/spliy-expense-app/public/data/groups').onSnapshot((snapshot) => {
        groups = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (!activeGroup && groups.length > 0) {
          activeGroup = groups[0];
        } else if (activeGroup) {
          const updated = groups.find(g => g.id === activeGroup.id);
          activeGroup = updated || null;
        }
        fetchMembersAndExpenses();
      }, (error) => {
        errorMessage = 'Failed to load groups: ' + error.message;
        loading = false;
        renderApp();
      });
    } else {
      try {
        await auth.signInAnonymously();
      } catch (e) {
        errorMessage = 'Authentication failed: ' + e.message;
        loading = false;
        renderApp();
      }
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  listenAuth();
}); 