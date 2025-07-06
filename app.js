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
      <div class="h-full flex flex-col">
        <!-- Header -->
        <div class="p-6 border-b border-gray-200">
          <div class="flex items-center gap-3 mb-2">
            <div class="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
              <i data-lucide="calculator" class="h-5 w-5 text-white"></i>
            </div>
            <div>
              <h1 class="text-xl font-bold text-gray-900">SplitWise</h1>
              <p class="text-sm text-gray-600">Split expenses easily</p>
            </div>
          </div>
          
          <!-- User ID Display -->
          <div class="mt-4 p-3 bg-gray-50 rounded-lg">
            <p class="text-xs text-gray-500 mb-1">Your User ID</p>
            <p class="text-xs font-mono text-gray-800 break-all">${userId || 'Loading...'}</p>
          </div>
        </div>
  
        <!-- Groups Section -->
        <div class="flex-1 p-6 overflow-y-auto">
          <div class="mb-6">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-lg font-semibold text-gray-900">Groups</h2>
              <button id="new-group-btn" class="inline-flex items-center px-3 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors">
                <i data-lucide="plus" class="h-4 w-4 mr-1"></i>
                New
              </button>
            </div>
            
            <div class="space-y-2">
              ${groups.length > 0 ? groups.map(g => `
                <div class="p-3 rounded-lg border cursor-pointer transition-all hover:bg-gray-50 ${activeGroup && g.id === activeGroup.id ? 'border-indigo-200 bg-indigo-50 ring-1 ring-indigo-200' : 'border-gray-200'}" 
                     data-group-id="${g.id}">
                  <div class="flex items-center justify-between">
                    <div class="flex-1">
                      <h3 class="font-medium text-gray-900 text-sm">${g.name}</h3>
                      ${g.description ? `<p class="text-xs text-gray-500 mt-1">${g.description}</p>` : ''}
                    </div>
                    ${activeGroup && g.id === activeGroup.id ? `
                      <div class="w-2 h-2 bg-indigo-500 rounded-full ml-2"></div>
                    ` : ''}
                  </div>
                </div>
              `).join('') : `
                <div class="text-center py-8 text-gray-500">
                  <i data-lucide="users" class="h-12 w-12 mx-auto mb-3 text-gray-300"></i>
                  <p class="text-sm">No groups yet</p>
                  <p class="text-xs">Create your first group to get started</p>
                </div>
              `}
            </div>
          </div>
        </div>
      </div>
    `;
    
    lucide.createIcons();
    
    // Sidebar event listeners
    const newGroupBtn = document.getElementById('new-group-btn');
    if (newGroupBtn) newGroupBtn.onclick = showCreateGroupForm;
    
    // Group selection listeners
    document.querySelectorAll('[data-group-id]').forEach(groupEl => {
      groupEl.onclick = () => {
        const groupId = groupEl.getAttribute('data-group-id');
        const group = groups.find(g => g.id === groupId);
        if (group) {
          activeGroup = group;
          fetchMembersAndExpenses();
          renderSidebar();
          renderApp();
        }
      };
    });
  }
  
  /**
   * Renders the main application content based on loading state, errors, and active group.
   * This function structures the dashboard into a modern grid layout.
   */
  function renderApp() {
    if (loading) {
      appRoot.innerHTML = `
        <div class="flex items-center justify-center h-full">
          <div class="text-center">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p class="text-gray-600">Loading...</p>
          </div>
        </div>
      `;
      return;
    }
    
    if (errorMessage) {
      appRoot.innerHTML = `
        <div class="flex items-center justify-center h-full">
          <div class="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
            <div class="flex items-center mb-3">
              <i data-lucide="alert-circle" class="h-5 w-5 text-red-500 mr-2"></i>
              <h3 class="text-lg font-medium text-red-800">Error</h3>
            </div>
            <p class="text-red-700">${errorMessage}</p>
          </div>
        </div>
      `;
      lucide.createIcons();
      return;
    }
    
    if (!activeGroup) {
      appRoot.innerHTML = `
        <div class="flex items-center justify-center h-full">
          <div class="text-center max-w-md mx-auto">
            <div class="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <i data-lucide="users" class="h-12 w-12 text-gray-400"></i>
            </div>
            <h2 class="text-2xl font-bold text-gray-900 mb-2">Welcome to SplitWise</h2>
            <p class="text-gray-600 mb-6">Create or select a group to start splitting expenses with your friends.</p>
            <button onclick="showCreateGroupForm()" class="inline-flex items-center px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors">
              <i data-lucide="plus" class="h-5 w-5 mr-2"></i>
              Create Your First Group
            </button>
          </div>
        </div>
      `;
      lucide.createIcons();
      return;
    }
  
    const stats = getGroupStats();
    
    appRoot.innerHTML = `
      <div class="h-full overflow-y-auto">
        <!-- Header -->
        <div class="bg-white border-b border-gray-200 px-8 py-6">
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-2xl font-bold text-gray-900">${activeGroup.name}</h1>
              ${activeGroup.description ? `<p class="text-gray-600 mt-1">${activeGroup.description}</p>` : ''}
            </div>
            <div class="flex items-center gap-3">
              <div class="text-right">
                <p class="text-sm text-gray-500">Total Expenses</p>
                <p class="text-2xl font-bold text-gray-900">${formatINR(stats.totalExpenses)}</p>
              </div>
            </div>
          </div>
        </div>
  
        <!-- Stats Cards -->
        <div class="px-8 py-6 bg-gray-50 border-b border-gray-200">
          <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div class="bg-white rounded-lg p-4 shadow-sm">
              <div class="flex items-center">
                <div class="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                  <i data-lucide="users" class="h-4 w-4 text-blue-600"></i>
                </div>
                <div>
                  <p class="text-sm text-gray-500">Members</p>
                  <p class="text-xl font-semibold text-gray-900">${stats.memberCount}</p>
                </div>
              </div>
            </div>
            <div class="bg-white rounded-lg p-4 shadow-sm">
              <div class="flex items-center">
                <div class="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                  <i data-lucide="receipt" class="h-4 w-4 text-green-600"></i>
                </div>
                <div>
                  <p class="text-sm text-gray-500">Expenses</p>
                  <p class="text-xl font-semibold text-gray-900">${stats.expenseCount}</p>
                </div>
              </div>
            </div>
            <div class="bg-white rounded-lg p-4 shadow-sm">
              <div class="flex items-center">
                <div class="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                  <i data-lucide="trending-up" class="h-4 w-4 text-purple-600"></i>
                </div>
                <div>
                  <p class="text-sm text-gray-500">Average</p>
                  <p class="text-xl font-semibold text-gray-900">${formatINR(stats.averageExpense)}</p>
                </div>
              </div>
            </div>
            <div class="bg-white rounded-lg p-4 shadow-sm">
              <div class="flex items-center">
                <div class="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center mr-3">
                  <i data-lucide="alert-circle" class="h-4 w-4 text-yellow-600"></i>
                </div>
                <div>
                  <p class="text-sm text-gray-500">Settlements</p>
                  <p class="text-xl font-semibold text-gray-900">${stats.settlementCount}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
  
        <!-- Main Content -->
        <div class="px-8 py-6">
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- Left Column -->
            <div class="lg:col-span-2 space-y-6">
              <!-- Add Expense Card -->
              <div class="bg-white rounded-lg shadow-sm border border-gray-200">
                <div class="p-6 border-b border-gray-200">
                  <h2 class="text-lg font-semibold text-gray-900 flex items-center">
                    <i data-lucide="plus-circle" class="h-5 w-5 text-indigo-600 mr-2"></i>
                    Add New Expense
                  </h2>
                </div>
                <div class="p-6">
                  ${generateAddExpenseForm()}
                </div>
              </div>
  
              <!-- Expenses List -->
              <div class="bg-white rounded-lg shadow-sm border border-gray-200">
                <div class="p-6 border-b border-gray-200">
                  <h2 class="text-lg font-semibold text-gray-900 flex items-center">
                    <i data-lucide="receipt" class="h-5 w-5 text-indigo-600 mr-2"></i>
                    Recent Expenses
                  </h2>
                </div>
                <div class="p-6">
                  ${generateExpensesSection()}
                </div>
              </div>
            </div>
  
            <!-- Right Column -->
            <div class="space-y-6">
              <!-- Members Card -->
              <div class="bg-white rounded-lg shadow-sm border border-gray-200">
                <div class="p-6 border-b border-gray-200">
                  <h2 class="text-lg font-semibold text-gray-900 flex items-center">
                    <i data-lucide="users" class="h-5 w-5 text-indigo-600 mr-2"></i>
                    Members
                  </h2>
                </div>
                <div class="p-6">
                  ${generateMembersSection()}
                </div>
              </div>
  
              <!-- Balances Card -->
              <div class="bg-white rounded-lg shadow-sm border border-gray-200">
                <div class="p-6 border-b border-gray-200">
                  <h2 class="text-lg font-semibold text-gray-900 flex items-center">
                    <i data-lucide="calculator" class="h-5 w-5 text-indigo-600 mr-2"></i>
                    Balances
                  </h2>
                </div>
                <div class="p-6">
                  ${generateBalancesSection()}
                </div>
              </div>
  
              <!-- Settlements Card -->
              <div class="bg-white rounded-lg shadow-sm border border-gray-200">
                <div class="p-6 border-b border-gray-200">
                  <h2 class="text-lg font-semibold text-gray-900 flex items-center">
                    <i data-lucide="hand-coins" class="h-5 w-5 text-indigo-600 mr-2"></i>
                    Settlements
                  </h2>
                </div>
                <div class="p-6">
                  ${generateSettlementsSection()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  
    lucide.createIcons();
    addEventListeners();
  }
  
  /**
   * Get group statistics for dashboard
   */
  function getGroupStats() {
    const members = activeGroup.members || [];
    const expenses = activeGroup.expenses || [];
    const balances = calculateBalances();
    const settlements = calculateSettlements(balances);
    
    const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const averageExpense = expenses.length > 0 ? totalExpenses / expenses.length : 0;
    
    return {
      memberCount: members.length,
      expenseCount: expenses.length,
      totalExpenses,
      averageExpense,
      settlementCount: settlements.length
    };
  }
  
  /**
   * Generates the HTML for the Members section.
   * @returns {string} HTML string for the members section.
   */
  function generateMembersSection() {
    const members = activeGroup.members || [];
    return `
      <form id="add-member-form" class="mb-6">
        <div class="flex gap-2">
          <input type="text" id="member-name" placeholder="Member name" required 
                 class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
          <button type="submit" class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
            <i data-lucide="plus" class="h-4 w-4"></i>
          </button>
        </div>
        <input type="email" id="member-email" placeholder="Email (optional)" 
               class="w-full mt-2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
      </form>
      
      <div class="space-y-2 max-h-64 overflow-y-auto">
        ${members.length > 0 ? members.map(member => `
          <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div class="flex items-center">
              <div class="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center mr-3">
                <span class="text-sm font-medium text-indigo-700">${member.name.charAt(0).toUpperCase()}</span>
              </div>
              <div>
                <p class="font-medium text-gray-900">${member.name}</p>
                ${member.email ? `<p class="text-sm text-gray-500">${member.email}</p>` : ''}
              </div>
            </div>
            <button class="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50 transition-colors" 
                    data-remove-member="${member.id}" title="Remove Member">
              <i data-lucide="x" class="w-4 h-4"></i>
            </button>
          </div>
        `).join('') : `
          <div class="text-center py-8 text-gray-500">
            <i data-lucide="user-plus" class="h-12 w-12 mx-auto mb-3 text-gray-300"></i>
            <p class="text-sm">No members yet</p>
            <p class="text-xs">Add members to start splitting expenses</p>
          </div>
        `}
      </div>
    `;
  }
  
  /**
   * Generates the HTML for the Expense Directory section.
   * @returns {string} HTML string for the expense directory.
   */
  function generateExpensesSection() {
    const expenses = activeGroup.expenses || [];
    const recentExpenses = expenses.slice(-5).reverse(); // Show 5 most recent
    
    return `
      <div class="space-y-3 max-h-96 overflow-y-auto">
        ${recentExpenses.length > 0 ? recentExpenses.map(expense => `
          <div class="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
            <div class="flex items-start justify-between">
              <div class="flex-1">
                <div class="flex items-center justify-between mb-2">
                  <h3 class="font-medium text-gray-900">${expense.description}</h3>
                  <div class="flex items-center gap-2">
                    <button class="text-blue-600 hover:text-blue-800 p-1 rounded-full hover:bg-blue-50 transition-colors" 
                            data-edit-expense="${expense.id}" title="Edit Expense">
                      <i data-lucide="edit-3" class="w-4 h-4"></i>
                    </button>
                    <button class="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50 transition-colors" 
                            data-delete-expense="${expense.id}" title="Delete Expense">
                      <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                  </div>
                </div>
                <div class="flex items-center gap-4 text-sm text-gray-600 mb-2">
                  <span class="flex items-center">
                    <i data-lucide="user" class="h-4 w-4 mr-1"></i>
                    ${getMemberName(expense.paidBy)}
                  </span>
                  <span class="flex items-center font-semibold text-green-600">
                    <i data-lucide="dollar-sign" class="h-4 w-4 mr-1"></i>
                    ${formatINR(Number(expense.amount))}
                  </span>
                  <span class="flex items-center">
                    <i data-lucide="calendar" class="h-4 w-4 mr-1"></i>
                    ${expense.date}
                  </span>
                </div>
                <div class="flex items-center gap-2 text-sm text-gray-500">
                  <span>Split with: ${(expense.splitWith || []).map(id => getMemberName(id)).join(', ')}</span>
                  ${expense.category ? `
                    <span class="px-2 py-1 bg-indigo-100 text-indigo-800 text-xs rounded-full">
                      ${expense.category}
                    </span>
                  ` : ''}
                </div>
              </div>
            </div>
          </div>
        `).join('') : `
          <div class="text-center py-8 text-gray-500">
            <i data-lucide="receipt" class="h-12 w-12 mx-auto mb-3 text-gray-300"></i>
            <p class="text-sm">No expenses yet</p>
            <p class="text-xs">Add your first expense to get started</p>
          </div>
        `}
      </div>
      
      ${expenses.length > 5 ? `
        <div class="mt-4 text-center">
          <button class="text-indigo-600 hover:text-indigo-800 text-sm font-medium">
            View All ${expenses.length} Expenses
          </button>
        </div>
      ` : ''}
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
    
    if (members.length === 0) {
      return `
        <div class="text-center py-8 text-gray-500">
          <i data-lucide="user-plus" class="h-12 w-12 mx-auto mb-3 text-gray-300"></i>
          <p class="text-sm">Add members first</p>
          <p class="text-xs">You need at least one member to add expenses</p>
        </div>
      `;
    }
    
    return `
      <form id="add-expense-form" class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="md:col-span-2">
            <label for="expense-desc" class="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input type="text" id="expense-desc" placeholder="What was this expense for?" required 
                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
          </div>
          
          <div>
            <label for="expense-amount" class="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label>
            <input type="number" id="expense-amount" step="0.01" placeholder="0.00" required 
                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
          </div>
          
          <div>
            <label for="expense-date" class="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input type="date" id="expense-date" value="${today}" required 
                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
          </div>
          
          <div>
            <label for="expense-paidby" class="block text-sm font-medium text-gray-700 mb-1">Paid By</label>
            <select id="expense-paidby" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
              ${members.map(m => `<option value="${m.id}">${m.name}</option>`).join('')}
            </select>
          </div>
          
          <div>
            <label for="expense-category" class="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select id="expense-category" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
              <option value="">Select category...</option>
              <option value="Food">🍽️ Food</option>
              <option value="Accommodation">🏠 Accommodation</option>
              <option value="Transportation">🚗 Transportation</option>
              <option value="Entertainment">🎉 Entertainment</option>
              <option value="Utilities">💡 Utilities</option>
              <option value="Other">📦 Other</option>
            </select>
          </div>
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">Split With</label>
          <div class="grid grid-cols-2 gap-2 p-3 border border-gray-200 rounded-lg bg-gray-50 max-h-32 overflow-y-auto">
            ${members.map(m => `
              <label class="flex items-center space-x-2 cursor-pointer">
                <input type="checkbox" class="expense-splitwith h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded" 
                       value="${m.id}" checked />
                <span class="text-sm text-gray-700">${m.name}</span>
              </label>
            `).join('')}
          </div>
        </div>
        
        <div class="flex gap-3">
          <button type="submit" class="flex-1 bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors font-medium">
            Add Expense
          </button>
          <button type="reset" class="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors font-medium">
            Clear
          </button>
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
      <div class="space-y-3 max-h-64 overflow-y-auto">
        ${balances.length > 0 ? balances.map(b => `
          <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div class="flex items-center">
              <div class="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center mr-3">
                <span class="text-sm font-medium text-gray-700">${b.name.charAt(0).toUpperCase()}</span>
              </div>
              <span class="font-medium text-gray-900">${b.name}</span>
            </div>
            <div class="text-right">
              <span class="font-bold ${b.balance >= 0 ? 'text-green-600' : 'text-red-600'}">
                ${formatINR(Math.abs(b.balance))}
              </span>
              <p class="text-xs text-gray-500">
                ${b.balance >= 0 ? 'gets back' : 'owes'}
              </p>
            </div>
          </div>
        `).join('') : `
          <div class="text-center py-8 text-gray-500">
            <i data-lucide="calculator" class="h-12 w-12 mx-auto mb-3 text-gray-300"></i>
            <p class="text-sm">No balances yet</p>
            <p class="text-xs">Add expenses to see balances</p>
          </div>
        `}
      </div>
    `;
  }
  
  /**
   * Generates the HTML for the Suggested Settlements section.
   * @returns {string} HTML string for the settlements section.
   */
  function generateSettlementsSection() {
    const balances = calculateBalances();
    const settlements = calculateSettlements(balances);
    
    return `
      <div class="space-y-3 max-h-64 overflow-y-auto">
        ${settlements.length > 0 ? settlements.map(s => `
          <div class="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div class="flex items-center justify-between">
              <div class="flex items-center">
                <i data-lucide="arrow-right" class="h-4 w-4 text-blue-600 mr-2"></i>
                <span class="text-sm text-gray-700">
                  <span class="font-medium">${s.from}</span> pays <span class="font-medium">${s.to}</span>
                </span>
              </div>
              <span class="font-bold text-blue-600">${formatINR(s.amount)}</span>
            </div>
          </div>
        `).join('') : `
          <div class="text-center py-8 text-gray-500">
            <i data-lucide="hand-coins" class="h-12 w-12 mx-auto mb-3 text-gray-300"></i>
            <p class="text-sm">No settlements needed</p>
            <p class="text-xs">All balances are settled</p>
          </div>
        `}
      </div>
    `;
  }
  
  /**
   * Shows the create group form modal
   */
  function showCreateGroupForm() {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
      <div class="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-xl font-bold text-gray-900">Create New Group</h2>
          <button class="text-gray-400 hover:text-gray-600" onclick="this.closest('.fixed').remove()">
            <i data-lucide="x" class="h-6 w-6"></i>
          </button>
        </div>
        
        <form id="create-group-form">
          <div class="space-y-4">
            <div>
              <label for="group-name" class="block text-sm font-medium text-gray-700 mb-1">Group Name</label>
              <input type="text" id="group-name" placeholder="Enter group name" required 
                     class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
            </div>
            
            <div>
              <label for="group-description" class="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
              <textarea id="group-description" placeholder="Describe your group" rows="3"
                        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"></textarea>
            </div>
          </div>
          
          <div class="flex gap-3 mt-6">
            <button type="submit" class="flex-1 bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors font-medium">
              Create Group
            </button>
            <button type="button" onclick="this.closest('.fixed').remove()" 
                    class="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors font-medium">
              Cancel
            </button>
          </div>
        </form>
      </div>
    `;
    
    document.body.appendChild(modal);
    lucide.createIcons();
    
    // Handle form submission
    const form = modal.querySelector('#create-group-form');
    form.onsubmit = async (e) => {
      e.preventDefault();
      const name = document.getElementById('group-name').value.trim();
      const description = document.getElementById('group-description').value.trim();
      
      if (!name) return;
      
      try {
        const groupData = {
          name,
          description: description || null,
          createdBy: userId,
          createdAt: new Date().toISOString(),
          members: [{ id: userId, name: 'You', email: null }],
          expenses: []
        };
        
        const docRef = await db.collection('groups').add(groupData);
        groupData.id = docRef.id;
        
        groups.push(groupData);
        activeGroup = groupData;
        
        modal.remove();
        renderSidebar();
        renderApp();
      } catch (error) {
        console.error('Error creating group:', error);
        alert('Failed to create group. Please try again.');
      }
    };
  }
  
  /**
   * Adds event listeners to the main app
   */
  function addEventListeners() {
    // Add member form
    const addMemberForm = document.getElementById('add-member-form');
    if (addMemberForm) {
      addMemberForm.onsubmit = async (e) => {
        e.preventDefault();
        const name = document.getElementById('member-name').value.trim();
        const email = document.getElementById('member-email').value.trim();
        
        if (!name) return;
        
        const member = {
          id: Date.now().toString(),
          name,
          email: email || null
        };
        
        activeGroup.members.push(member);
        await updateGroup();
        
        document.getElementById('member-name').value = '';
        document.getElementById('member-email').value = '';
        renderApp();
      };
    }
    
    // Remove member buttons
    document.querySelectorAll('[data-remove-member]').forEach(btn => {
      btn.onclick = async () => {
        const memberId = btn.getAttribute('data-remove-member');
        activeGroup.members = activeGroup.members.filter(m => m.id !== memberId);
        await updateGroup();
        renderApp();
      };
    });
    
    // Add expense form
    const addExpenseForm = document.getElementById('add-expense-form');
    if (addExpenseForm) {
      addExpenseForm.onsubmit = async (e) => {
        e.preventDefault();
        
        const description = document.getElementById('expense-desc').value.trim();
        const amount = parseFloat(document.getElementById('expense-amount').value);
        const date = document.getElementById('expense-date').value;
        const paidBy = document.getElementById('expense-paidby').value;
        const category = document.getElementById('expense-category').value;
        const splitWith = Array.from(document.querySelectorAll('.expense-splitwith:checked')).map(cb => cb.value);
        
        if (!description || !amount || !paidBy || splitWith.length === 0) return;
        
        const expense = {
          id: Date.now().toString(),
          description,
          amount,
          date,
          paidBy,
          category: category || null,
          splitWith,
          createdAt: new Date().toISOString()
        };
        
        activeGroup.expenses.push(expense);
        await updateGroup();
        
        addExpenseForm.reset();
        renderApp();
      };
    }
    
    // Edit expense buttons
    document.querySelectorAll('[data-edit-expense]').forEach(btn => {
      btn.onclick = () => {
        const expenseId = btn.getAttribute('data-edit-expense');
        showEditExpenseForm(expenseId);
      };
    });
    
    // Delete expense buttons
    document.querySelectorAll('[data-delete-expense]').forEach(btn => {
      btn.onclick = async () => {
        const expenseId = btn.getAttribute('data-delete-expense');
        if (confirm('Are you sure you want to delete this expense?')) {
          activeGroup.expenses = activeGroup.expenses.filter(e => e.id !== expenseId);
          await updateGroup();
          renderApp();
        }
      };
    });
  }
  
  /**
   * Shows the edit expense form modal
   */
  function showEditExpenseForm(expenseId) {
    const expense = activeGroup.expenses.find(e => e.id === expenseId);
    if (!expense) return;
    
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
      <div class="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-xl font-bold text-gray-900">Edit Expense</h2>
          <button class="text-gray-400 hover:text-gray-600" onclick="this.closest('.fixed').remove()">
            <i data-lucide="x" class="h-6 w-6"></i>
          </button>
        </div>
        
        <form id="edit-expense-form">
          <div class="space-y-4">
            <div>
              <label for="edit-expense-desc" class="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input type="text" id="edit-expense-desc" value="${expense.description}" required 
                     class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
            </div>
            
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label for="edit-expense-amount" class="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label>
                <input type="number" id="edit-expense-amount" value="${expense.amount}" step="0.01" required 
                       class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
              </div>
              
              <div>
                <label for="edit-expense-date" class="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input type="date" id="edit-expense-date" value="${expense.date}" required 
                       class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
              </div>
            </div>
            
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label for="edit-expense-paidby" class="block text-sm font-medium text-gray-700 mb-1">Paid By</label>
                <select id="edit-expense-paidby" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                  ${activeGroup.members.map(m => `<option value="${m.id}" ${m.id === expense.paidBy ? 'selected' : ''}>${m.name}</option>`).join('')}
                </select>
              </div>
              
              <div>
                <label for="edit-expense-category" class="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select id="edit-expense-category" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                  <option value="">Select category...</option>
                  <option value="Food" ${expense.category === 'Food' ? 'selected' : ''}>🍽️ Food</option>
                  <option value="Accommodation" ${expense.category === 'Accommodation' ? 'selected' : ''}>🏠 Accommodation</option>
                  <option value="Transportation" ${expense.category === 'Transportation' ? 'selected' : ''}>🚗 Transportation</option>
                  <option value="Entertainment" ${expense.category === 'Entertainment' ? 'selected' : ''}>🎉 Entertainment</option>
                  <option value="Utilities" ${expense.category === 'Utilities' ? 'selected' : ''}>💡 Utilities</option>
                  <option value="Other" ${expense.category === 'Other' ? 'selected' : ''}>📦 Other</option>
                </select>
              </div>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Split With</label>
              <div class="grid grid-cols-2 gap-2 p-3 border border-gray-200 rounded-lg bg-gray-50 max-h-32 overflow-y-auto">
                ${activeGroup.members.map(m => `
                  <label class="flex items-center space-x-2 cursor-pointer">
                    <input type="checkbox" class="edit-expense-splitwith h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded" 
                           value="${m.id}" ${expense.splitWith.includes(m.id) ? 'checked' : ''} />
                    <span class="text-sm text-gray-700">${m.name}</span>
                  </label>
                `).join('')}
              </div>
            </div>
          </div>
          
          <div class="flex gap-3 mt-6">
            <button type="submit" class="flex-1 bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors font-medium">
              Update Expense
            </button>
            <button type="button" onclick="this.closest('.fixed').remove()" 
                    class="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors font-medium">
              Cancel
            </button>
          </div>
        </form>
      </div>
    `;
    
    document.body.appendChild(modal);
    lucide.createIcons();
    
    // Handle form submission
    const form = modal.querySelector('#edit-expense-form');
    form.onsubmit = async (e) => {
      e.preventDefault();
      
      const description = document.getElementById('edit-expense-desc').value.trim();
      const amount = parseFloat(document.getElementById('edit-expense-amount').value);
      const date = document.getElementById('edit-expense-date').value;
      const paidBy = document.getElementById('edit-expense-paidby').value;
      const category = document.getElementById('edit-expense-category').value;
      const splitWith = Array.from(document.querySelectorAll('.edit-expense-splitwith:checked')).map(cb => cb.value);
      
      if (!description || !amount || !paidBy || splitWith.length === 0) return;
      
      const expenseIndex = activeGroup.expenses.findIndex(e => e.id === expenseId);
      if (expenseIndex !== -1) {
        activeGroup.expenses[expenseIndex] = {
          ...activeGroup.expenses[expenseIndex],
          description,
          amount,
          date,
          paidBy,
          category: category || null,
          splitWith
        };
        
        await updateGroup();
        modal.remove();
        renderApp();
      }
    };
  }
  
  /**
   * Updates the current group in Firestore
   */
  async function updateGroup() {
    if (!activeGroup) return;
    
    try {
      await db.collection('groups').doc(activeGroup.id).update({
        members: activeGroup.members,
        expenses: activeGroup.expenses
      });
    } catch (error) {
      console.error('Error updating group:', error);
      alert('Failed to update group. Please try again.');
    }
  }
  
  /**
   * Fetches members and expenses for the active group
   */
  async function fetchMembersAndExpenses() {
    if (!activeGroup) return;
    
    try {
      const doc = await db.collection('groups').doc(activeGroup.id).get();
      if (doc.exists) {
        const data = doc.data();
        activeGroup.members = data.members || [];
        activeGroup.expenses = data.expenses || [];
        renderApp();
      }
    } catch (error) {
      console.error('Error fetching group data:', error);
    }
  }
  
  /**
   * Calculates balances for all members in the active group
   */
  function calculateBalances() {
    if (!activeGroup || !activeGroup.members || !activeGroup.expenses) return [];
    
    const balances = {};
    
    // Initialize balances
    activeGroup.members.forEach(member => {
      balances[member.id] = 0;
    });
    
    // Calculate balances from expenses
    activeGroup.expenses.forEach(expense => {
      const paidBy = expense.paidBy;
      const splitWith = expense.splitWith || [];
      const amountPerPerson = expense.amount / splitWith.length;
      
      // Person who paid gets credited
      balances[paidBy] += expense.amount;
      
      // People who split pay their share
      splitWith.forEach(memberId => {
        balances[memberId] -= amountPerPerson;
      });
    });
    
    // Convert to array format
    return activeGroup.members.map(member => ({
      id: member.id,
      name: member.name,
      balance: balances[member.id] || 0
    })).sort((a, b) => b.balance - a.balance);
  }
  
  /**
   * Calculates optimal settlements to minimize transactions
   */
  function calculateSettlements(balances) {
    const settlements = [];
    const positiveBalances = balances.filter(b => b.balance > 0).sort((a, b) => b.balance - a.balance);
    const negativeBalances = balances.filter(b => b.balance < 0).sort((a, b) => a.balance - b.balance);
    
    let posIndex = 0;
    let negIndex = 0;
    
    while (posIndex < positiveBalances.length && negIndex < negativeBalances.length) {
      const positive = positiveBalances[posIndex];
      const negative = negativeBalances[negIndex];
      
      const amount = Math.min(positive.balance, Math.abs(negative.balance));
      
      if (amount > 0.01) { // Only create settlement if amount is significant
        settlements.push({
          from: negative.name,
          to: positive.name,
          amount: amount
        });
      }
      
      positive.balance -= amount;
      negative.balance += amount;
      
      if (Math.abs(positive.balance) < 0.01) posIndex++;
      if (Math.abs(negative.balance) < 0.01) negIndex++;
    }
    
    return settlements;
  }
  
  /**
   * Gets member name by ID
   */
  function getMemberName(memberId) {
    if (!activeGroup || !activeGroup.members) return 'Unknown';
    const member = activeGroup.members.find(m => m.id === memberId);
    return member ? member.name : 'Unknown';
  }
  
  /**
   * Formats amount as Indian Rupees
   */
  function formatINR(amount) {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }
  
  /**
   * Initializes the application
   */
  async function initApp() {
    try {
      // Check authentication
      auth.onAuthStateChanged(async (user) => {
        if (user) {
          userId = user.uid;
          await loadGroups();
          loading = false;
          renderSidebar();
          renderApp();
        } else {
          // Create anonymous user if not authenticated
          await auth.signInAnonymously();
        }
      });
    } catch (error) {
      console.error('Error initializing app:', error);
      errorMessage = 'Failed to initialize application. Please refresh the page.';
      loading = false;
      renderApp();
    }
  }
  
  /**
   * Loads user's groups from Firestore
   */
  async function loadGroups() {
    try {
      const snapshot = await db.collection('groups')
        .where('createdBy', '==', userId)
        .orderBy('createdAt', 'desc')
        .get();
      
      groups = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      if (groups.length > 0 && !activeGroup) {
        activeGroup = groups[0];
        await fetchMembersAndExpenses();
      }
    } catch (error) {
      console.error('Error loading groups:', error);
    }
  }
  
  // Initialize the app when the page loads
  document.addEventListener('DOMContentLoaded', initApp);
