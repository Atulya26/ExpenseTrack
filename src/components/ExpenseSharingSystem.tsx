"use client"

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Users, Receipt, Calculator, UserPlus, Trash2, Edit3, Check, X } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc, addDoc, setDoc, updateDoc, deleteDoc, onSnapshot, collection, query, where, getDocs } from 'firebase/firestore';

// --- Begin ExpenseSharingSystem and modal components ---

// (Full code from user message starts here)

const ExpenseSharingSystem = () => {
  const [groups, setGroups] = useState<any[]>([]);
  const [activeGroup, setActiveGroup] = useState<any | null>(null);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any | null>(null);
  const [db, setDb] = useState<any>(null);
  const [auth, setAuth] = useState<any>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize Firebase and authenticate user
  useEffect(() => {
    try {
      // Your Firebase Configuration (hardcoded for direct use)
      const firebaseConfig = {
        apiKey: "AIzaSyAse2I0D2TlfyXXzhoHTraG5R6QEphllVE",
        authDomain: "spliy-expense-app.firebaseapp.com",
        projectId: "spliy-expense-app",
        storageBucket: "spliy-expense-app.firebasestorage.app",
        messagingSenderId: "530776942195",
        appId: "1:530776942195:web:5838e23c250d5e721e2c06",
        measurementId: "G-9ZCE53653E"
      };

      // Your App ID (hardcoded for direct use)
      const appId = "spliy-expense-app";

      if (!Object.keys(firebaseConfig).length || !firebaseConfig.apiKey) {
        setErrorMessage("Firebase configuration is missing or incomplete. Please check the hardcoded values.");
        setLoading(false);
        return;
      }

      const app = initializeApp(firebaseConfig);
      const firestore = getFirestore(app);
      const firebaseAuth = getAuth(app);

      setDb(firestore);
      setAuth(firebaseAuth);

      const unsubscribeAuth = onAuthStateChanged(firebaseAuth, async (user) => {
        if (user) {
          setUserId(user.uid);
          setLoading(false);
        } else {
          // If no user, try to sign in anonymously
          try {
            await signInAnonymously(firebaseAuth);
          } catch (error: any) {
            console.error("Firebase authentication error:", error);
            setErrorMessage(`Authentication failed: ${error.message}`);
            setLoading(false);
          }
        }
      });

      return () => unsubscribeAuth();
    } catch (error: any) {
      console.error("Error initializing Firebase:", error);
      setErrorMessage(`Firebase initialization failed: ${error.message}`);
      setLoading(false);
    }
  }, []);

  // Fetch groups from Firestore
  useEffect(() => {
    if (!db || !userId) return;

    setLoading(true);
    // Your App ID (hardcoded for direct use)
    const appId = "spliy-expense-app";
    const groupsCollectionRef = collection(db, `artifacts/${appId}/public/data/groups`);

    const unsubscribeGroups = onSnapshot(groupsCollectionRef, (snapshot) => {
      const fetchedGroups = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setGroups(fetchedGroups);
      if (!activeGroup && fetchedGroups.length > 0) {
        setActiveGroup(fetchedGroups[0]); // Set first group as active by default
      } else if (activeGroup) {
        // Update active group if its data changed
        const updatedActive = fetchedGroups.find(g => g.id === activeGroup.id);
        if (updatedActive) {
          setActiveGroup(updatedActive);
        } else {
          // If active group was deleted, clear it
          setActiveGroup(null);
        }
      }
      setLoading(false);
    }, (error) => {
      console.error("Error fetching groups:", error);
      setErrorMessage(`Failed to load groups: ${error.message}`);
      setLoading(false);
    });

    return () => unsubscribeGroups();
  }, [db, userId, activeGroup?.id]); // Re-run if db or userId changes, or if activeGroup ID changes

  // Fetch members and expenses for the active group
  useEffect(() => {
    if (!db || !activeGroup?.id) {
      setActiveGroup((prev: any) => prev ? { ...prev, members: [], expenses: [] } : null); // Clear members/expenses if no active group
      return;
    }

    // Your App ID (hardcoded for direct use)
    const appId = "spliy-expense-app";
    const groupDocRef = doc(db, `artifacts/${appId}/public/data/groups`, activeGroup.id);
    const membersCollectionRef = collection(groupDocRef, 'members');
    const expensesCollectionRef = collection(groupDocRef, 'expenses');

    const unsubscribeMembers = onSnapshot(membersCollectionRef, (snapshot) => {
      const fetchedMembers = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setActiveGroup((prev: any) => ({ ...prev, members: fetchedMembers }));
    }, (error) => {
      console.error("Error fetching members:", error);
      setErrorMessage(`Failed to load members: ${error.message}`);
    });

    const unsubscribeExpenses = onSnapshot(expensesCollectionRef, (snapshot) => {
      const fetchedExpenses = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setActiveGroup((prev: any) => ({ ...prev, expenses: fetchedExpenses }));
    }, (error) => {
      console.error("Error fetching expenses:", error);
      setErrorMessage(`Failed to load expenses: ${error.message}`);
    });

    return () => {
      unsubscribeMembers();
      unsubscribeExpenses();
    };
  }, [db, activeGroup?.id]);

  // Group management
  const createGroup = async (groupData: { name: string; description: string }) => {
    if (!db || !userId) return;
    try {
      setLoading(true);
      // Your App ID (hardcoded for direct use)
      const appId = "spliy-expense-app";
      const groupsCollectionRef = collection(db, `artifacts/${appId}/public/data/groups`);
      const newGroupRef = await addDoc(groupsCollectionRef, {
        name: groupData.name,
        description: groupData.description,
        createdAt: new Date().toISOString(),
        createdBy: userId,
      });
      // Add the creator as the first member
      const membersCollectionRef = collection(newGroupRef, 'members');
      await addDoc(membersCollectionRef, {
        name: `User ${userId.substring(0, 5)}`, // Default name for creator
        email: '', // No email for anonymous users
        userId: userId,
      });
      setShowCreateGroup(false);
      setLoading(false);
    } catch (error: any) {
      console.error("Error creating group:", error);
      setErrorMessage(`Failed to create group: ${error.message}`);
      setLoading(false);
    }
  };

  const addMemberToGroup = async (memberData: { name: string; email: string }) => {
    if (!db || !activeGroup?.id) return;
    try {
      setLoading(true);
      // Your App ID (hardcoded for direct use)
      const appId = "spliy-expense-app";
      const membersCollectionRef = collection(db, `artifacts/${appId}/public/data/groups/${activeGroup.id}/members`);
      await addDoc(membersCollectionRef, {
        name: memberData.name,
        email: memberData.email,
        // Optionally, add a field to link to a Firebase User ID if they are authenticated
      });
      setShowAddMember(false);
      setLoading(false);
    } catch (error: any) {
      console.error("Error adding member:", error);
      setErrorMessage(`Failed to add member: ${error.message}`);
      setLoading(false);
    }
  };

  const removeMember = async (memberId: string) => {
    if (!db || !activeGroup?.id) return;
    try {
      setLoading(true);
      // Your App ID (hardcoded for direct use)
      const appId = "spliy-expense-app";
      const memberDocRef = doc(db, `artifacts/${appId}/public/data/groups/${activeGroup.id}/members`, memberId);
      await deleteDoc(memberDocRef);
      setLoading(false);
    } catch (error: any) {
      console.error("Error removing member:", error);
      setErrorMessage(`Failed to remove member: ${error.message}`);
      setLoading(false);
    }
  };

  // Expense management
  const addExpense = async (expenseData: any) => {
    if (!db || !activeGroup?.id) return;
    try {
      setLoading(true);
      // Your App ID (hardcoded for direct use)
      const appId = "spliy-expense-app";
      const expensesCollectionRef = collection(db, `artifacts/${appId}/public/data/groups/${activeGroup.id}/expenses`);
      await addDoc(expensesCollectionRef, {
        description: expenseData.description,
        amount: parseFloat(expenseData.amount),
        paidBy: expenseData.paidBy,
        splitType: expenseData.splitType,
        splitWith: expenseData.splitWith,
        date: expenseData.date,
        category: expenseData.category,
        createdAt: new Date().toISOString(),
        createdBy: userId,
      });
      setShowAddExpense(false);
      setLoading(false);
    } catch (error: any) {
      console.error("Error adding expense:", error);
      setErrorMessage(`Failed to add expense: ${error.message}`);
      setLoading(false);
    }
  };

  const updateExpense = async (expenseData: any) => {
    if (!db || !activeGroup?.id || !editingExpense?.id) return;
    try {
      setLoading(true);
      // Your App ID (hardcoded for direct use)
      const appId = "spliy-expense-app";
      const expenseDocRef = doc(db, `artifacts/${appId}/public/data/groups/${activeGroup.id}/expenses`, editingExpense.id);
      await updateDoc(expenseDocRef, {
        description: expenseData.description,
        amount: parseFloat(expenseData.amount),
        paidBy: expenseData.paidBy,
        splitType: expenseData.splitType,
        splitWith: expenseData.splitWith,
        date: expenseData.date,
        category: expenseData.category,
      });
      setEditingExpense(null);
      setLoading(false);
    } catch (error: any) {
      console.error("Error updating expense:", error);
      setErrorMessage(`Failed to update expense: ${error.message}`);
      setLoading(false);
    }
  };

  const deleteExpense = async (expenseId: string) => {
    if (!db || !activeGroup?.id) return;
    try {
      setLoading(true);
      // Your App ID (hardcoded for direct use)
      const appId = "spliy-expense-app";
      const expenseDocRef = doc(db, `artifacts/${appId}/public/data/groups/${activeGroup.id}/expenses`, expenseId);
      await deleteDoc(expenseDocRef);
      setLoading(false);
    } catch (error: any) {
      console.error("Error deleting expense:", error);
      setErrorMessage(`Failed to delete expense: ${error.message}`);
      setLoading(false);
    }
  };

  // Calculate balances (client-side for now)
  const calculateBalances = useCallback(() => {
    if (!activeGroup || !activeGroup.members || !activeGroup.expenses) return [];

    const balances: { [key: string]: { name: string; balance: number; paid: number; owes: number } } = {};
    activeGroup.members.forEach((member: any) => {
      balances[member.id] = { name: member.name, balance: 0, paid: 0, owes: 0 };
    });

    activeGroup.expenses.forEach((expense: any) => {
      const { paidBy, amount, splitWith, splitType } = expense;

      // Add to paid amount
      if (balances[paidBy]) {
        balances[paidBy].paid += amount;
      }

      // Calculate split amount based on type
      let splitAmount: number = 0;
      if (splitType === 'equal') {
        splitAmount = amount / splitWith.length;
      } else if (splitType === 'custom') {
        // For custom splits, we'd need additional data structure
        splitAmount = amount / splitWith.length; // Fallback to equal
      }

      // Subtract from each person's balance
      splitWith.forEach((memberId: string) => {
        if (balances[memberId]) {
          balances[memberId].owes += splitAmount;
          balances[memberId].balance = balances[memberId].paid - balances[memberId].owes;
        }
      });
    });

    return Object.values(balances);
  }, [activeGroup]);

  // Calculate settlements (client-side for now)
  const calculateSettlements = useCallback(() => {
    const balances = calculateBalances();
    const creditors = balances.filter(b => b.balance > 0.01).sort((a, b) => b.balance - a.balance);
    const debtors = balances.filter(b => b.balance < -0.01).sort((a, b) => a.balance - b.balance);

    const settlements: { from: string; to: string; amount: string }[] = [];
    let i = 0, j = 0;

    while (i < creditors.length && j < debtors.length) {
      const creditor = creditors[i];
      const debtor = debtors[j];
      const amount = Math.min(creditor.balance, -debtor.balance);

      if (amount > 0.01) {
        settlements.push({
          from: debtor.name,
          to: creditor.name,
          amount: amount.toFixed(2)
        });
      }

      creditor.balance -= amount;
      debtor.balance += amount;

      if (creditor.balance < 0.01) i++;
      if (debtor.balance > -0.01) j++;
    }

    return settlements;
  }, [calculateBalances]);

  const getMemberName = useCallback((memberId: string) => {
    const member = activeGroup?.members.find((m: any) => m.id === memberId);
    return member ? member.name : 'Unknown';
  }, [activeGroup?.members]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-indigo-600 text-xl font-semibold">Loading Expense System...</div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50">
        <div className="bg-white p-6 rounded-xl shadow-lg text-red-700">
          <h3 className="text-lg font-semibold mb-2">Error:</h3>
          <p>{errorMessage}</p>
          <p className="text-sm mt-2">Please ensure Firebase is correctly configured and your network is stable.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 font-inter">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-indigo-100 rounded-full">
                <Receipt className="h-8 w-8 text-indigo-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Expense Splitter</h1>
                <p className="text-gray-600">Split bills fairly among friends</p>
              </div>
            </div>
            <button
              onClick={() => setShowCreateGroup(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <Plus className="h-5 w-5" />
              <span>New Group</span>
            </button>
          </div>

          {/* User ID Display */}
          {userId && (
            <div className="mb-4 text-sm text-gray-700 bg-gray-100 p-3 rounded-lg flex items-center justify-between">
              <span>Your User ID: <span className="font-mono font-semibold text-indigo-700 break-all">{userId}</span></span>
              <span className="text-xs text-gray-500 ml-2">(Share this ID for group identification)</span>
            </div>
          )}

          {/* Group Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Group</label>
            <select
              value={activeGroup?.id || ''}
              onChange={(e) => setActiveGroup(groups.find(g => g.id === e.target.value))}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="">Choose a group...</option>
              {groups.map(group => (
                <option key={group.id} value={group.id}>{group.name}</option>
              ))}
            </select>
          </div>
        </div>

        {activeGroup ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Members and Controls */}
            <div className="space-y-6">
              {/* Members */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <Users className="h-5 w-5 text-indigo-600" />
                    <h2 className="text-xl font-semibold text-gray-900">Members</h2>
                  </div>
                  <button
                    onClick={() => setShowAddMember(true)}
                    className="bg-green-600 hover:bg-green-700 text-white p-2 rounded-lg transition-colors"
                  >
                    <UserPlus className="h-4 w-4" />
                  </button>
                </div>
                <div className="space-y-3">
                  {activeGroup.members && activeGroup.members.length > 0 ? (
                    activeGroup.members.map((member: any) => (
                      <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <div className="font-medium text-gray-900">{member.name}</div>
                          <div className="text-sm text-gray-600">{member.email}</div>
                        </div>
                        <button
                          onClick={() => removeMember(member.id)}
                          className="text-red-600 hover:text-red-800 p-1"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-gray-500 py-4">No members yet. Add some!</div>
                  )}
                </div>
              </div>

              {/* Balances */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center space-x-2 mb-4">
                  <Calculator className="h-5 w-5 text-indigo-600" />
                  <h2 className="text-xl font-semibold text-gray-900">Balances</h2>
                </div>
                <div className="space-y-3">
                  {calculateBalances().map((balance, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="font-medium text-gray-900">{balance.name}</span>
                      <span className={`font-bold ${balance.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ${Math.abs(balance.balance).toFixed(2)} {balance.balance >= 0 ? 'gets back' : 'owes'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Settlements */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Suggested Settlements</h2>
                <div className="space-y-3">
                  {calculateSettlements().map((settlement, index) => (
                    <div key={index} className="p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                      <div className="text-sm text-gray-900">
                        <span className="font-medium">{settlement.from}</span> owes{' '}
                        <span className="font-medium">{settlement.to}</span>{' '}
                        <span className="font-bold text-blue-600">${settlement.amount}</span>
                      </div>
                    </div>
                  ))}
                  {calculateSettlements().length === 0 && (
                    <div className="text-center text-gray-500 py-4">All settled up! 🎉</div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column - Expenses */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">Expenses</h2>
                  <button
                    onClick={() => setShowAddExpense(true)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
                  >
                    <Plus className="h-5 w-5" />
                    <span>Add Expense</span>
                  </button>
                </div>

                <div className="space-y-4">
                  {activeGroup.expenses && activeGroup.expenses.length > 0 ? (
                    activeGroup.expenses.map((expense: any) => (
                      <div key={expense.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <h3 className="font-semibold text-gray-900">{expense.description}</h3>
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => setEditingExpense(expense)}
                                  className="text-blue-600 hover:text-blue-800 p-1"
                                >
                                  <Edit3 className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => deleteExpense(expense.id)}
                                  className="text-red-600 hover:text-red-800 p-1"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                            <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                              <span>Paid by: <span className="font-medium">{getMemberName(expense.paidBy)}</span></span>
                              <span className="font-bold text-lg text-gray-900">${expense.amount.toFixed(2)}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm text-gray-600">
                              <span>Split with: {expense.splitWith.map((id: string) => getMemberName(id)).join(', ')}</span>
                              <span>{expense.date}</span>
                            </div>
                            {expense.category && (
                              <span className="inline-block mt-2 px-2 py-1 bg-indigo-100 text-indigo-800 text-xs rounded-full">
                                {expense.category}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-gray-500 py-8">
                      No expenses yet. Add your first expense to get started!
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-lg p-6 text-center text-gray-600">
            <p className="mb-4">Select an existing group or create a new one to start tracking expenses.</p>
            <button
              onClick={() => setShowCreateGroup(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors mx-auto"
            >
              <Plus className="h-5 w-5" />
              <span>Create New Group</span>
            </button>
          </div>
        )}

        {/* Create Group Modal */}
        {showCreateGroup && <CreateGroupModal onSubmit={createGroup} onClose={() => setShowCreateGroup(false)} />}

        {/* Add Member Modal */}
        {showAddMember && activeGroup && <AddMemberModal onSubmit={addMemberToGroup} onClose={() => setShowAddMember(false)} />}

        {/* Add/Edit Expense Modal */}
        {(showAddExpense || editingExpense) && (
          <ExpenseModal
            members={activeGroup?.members || []}
            expense={editingExpense}
            onSubmit={editingExpense ? updateExpense : addExpense}
            onClose={() => {
              setShowAddExpense(false);
              setEditingExpense(null);
            }}
          />
        )}
      </div>
    </div>
  );
};

const CreateGroupModal = ({ onSubmit, onClose }: { onSubmit: (data: { name: string; description: string }) => void; onClose: () => void }) => {
  const [formData, setFormData] = useState({ name: '', description: '' });

  const handleSubmit = () => {
    if (formData.name.trim()) {
      onSubmit(formData);
      setFormData({ name: '', description: '' });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Group</h3>
        <div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Group Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="e.g., Weekend Trip, Flatmates"
            />
          </div>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Description (Optional)</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-y"
              placeholder="Brief description of the group"
              rows={3}
            ></textarea>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleSubmit}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-lg transition-colors"
            >
              Create Group
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-2 px-4 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const AddMemberModal = ({ onSubmit, onClose }: { onSubmit: (data: { name: string; email: string }) => void; onClose: () => void }) => {
  const [formData, setFormData] = useState({ name: '', email: '' });

  const handleSubmit = () => {
    if (formData.name.trim() && formData.email.trim()) {
      onSubmit(formData);
      setFormData({ name: '', email: '' });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Member</h3>
        <div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Member's name"
            />
          </div>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Member's email (optional)"
            />
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleSubmit}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-lg transition-colors"
            >
              Add Member
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-2 px-4 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ExpenseModal = ({ members, expense, onSubmit, onClose }: { members: any[]; expense: any; onSubmit: (data: any) => void; onClose: () => void }) => {
  const [formData, setFormData] = useState({
    description: expense?.description || '',
    amount: expense?.amount || '',
    paidBy: expense?.paidBy || (members[0]?.id || ''),
    splitWith: expense?.splitWith || members.map(m => m.id),
    splitType: expense?.splitType || 'equal',
    date: expense?.date || new Date().toISOString().split('T')[0],
    category: expense?.category || ''
  });

  useEffect(() => {
    // Ensure paidBy and splitWith are valid member IDs when members list changes
    if (members.length > 0) {
      if (!formData.paidBy || !members.some(m => m.id === formData.paidBy)) {
        setFormData(prev => ({ ...prev, paidBy: members[0].id }));
      }
      const validSplitWith = formData.splitWith.filter((id: string) => members.some(m => m.id === id));
      if (validSplitWith.length !== formData.splitWith.length) {
        setFormData(prev => ({ ...prev, splitWith: validSplitWith }));
      }
    }
  }, [members, formData.paidBy, formData.splitWith]);

  const handleSplitWithChange = (memberId: string) => {
    setFormData({
      ...formData,
      splitWith: formData.splitWith.includes(memberId)
        ? formData.splitWith.filter((id: string) => id !== memberId)
        : [...formData.splitWith, memberId]
    });
  };

  const handleSubmit = () => {
    if (formData.description.trim() && formData.amount && formData.splitWith.length > 0) {
      onSubmit(formData);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {expense ? 'Edit Expense' : 'Add Expense'}
        </h3>
        <div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="What was this expense for?"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Amount ($)</label>
              <input
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Paid By</label>
              <select
                value={formData.paidBy}
                onChange={(e) => setFormData({ ...formData, paidBy: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                {members.map(member => (
                  <option key={member.id} value={member.id}>{member.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">Select category...</option>
                <option value="Food">Food</option>
                <option value="Accommodation">Accommodation</option>
                <option value="Transportation">Transportation</option>
                <option value="Entertainment">Entertainment</option>
                <option value="Utilities">Utilities</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Split With</label>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {members.map(member => (
                <label key={member.id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={formData.splitWith.includes(member.id)}
                    onChange={() => handleSplitWithChange(member.id)}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <span className="text-gray-900">{member.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={handleSubmit}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-lg transition-colors"
            >
              {expense ? 'Update Expense' : 'Add Expense'}
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-2 px-4 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// (Full code from user message ends here)

// --- End ExpenseSharingSystem and modal components ---

export default ExpenseSharingSystem;
