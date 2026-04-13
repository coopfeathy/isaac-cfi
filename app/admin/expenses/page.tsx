'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/app/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Account {
  id: string
  name: string
  type: 'student' | 'client' | 'business'
  email: string | null
  phone: string | null
  notes: string | null
  created_at: string
}

interface Transaction {
  id: string
  account_id: string
  date: string
  item: string
  direction: 'income' | 'expense'
  price: number
  notes: string | null
  created_at: string
}

type Tab = 'ledger' | 'accounts' | 'summary'

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

const today = () => new Date().toISOString().slice(0, 10)

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function ExpensesPage() {
  const { user, isAdmin, loading: authLoading } = useAuth()
  const router = useRouter()

  /* ---- auth guard ---- */
  useEffect(() => {
    if (!authLoading && !user) router.push('/login')
    else if (!authLoading && user && !isAdmin) router.push('/')
  }, [user, isAdmin, authLoading, router])

  /* ---- data state ---- */
  const [accounts, setAccounts] = useState<Account[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loadingData, setLoadingData] = useState(true)

  /* ---- UI state ---- */
  const [activeTab, setActiveTab] = useState<Tab>('ledger')
  const [selectedAccountId, setSelectedAccountId] = useState<string>('all')
  const [status, setStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  /* ---- new-account form ---- */
  const [showNewAccount, setShowNewAccount] = useState(false)
  const [newAccount, setNewAccount] = useState({ name: '', type: 'student' as Account['type'], email: '', phone: '', notes: '' })

  /* ---- new-transaction form ---- */
  const [showNewTx, setShowNewTx] = useState(false)
  const [newTx, setNewTx] = useState({
    account_id: '',
    date: today(),
    item: '',
    direction: 'expense' as Transaction['direction'],
    price: '',
    notes: '',
  })

  /* ---- editing transaction ---- */
  const [editingTxId, setEditingTxId] = useState<string | null>(null)
  const [editTx, setEditTx] = useState({
    date: '',
    item: '',
    direction: 'expense' as Transaction['direction'],
    price: '',
    notes: '',
    account_id: '',
  })

  /* ---- fetch data ---- */
  const fetchData = useCallback(async () => {
    setLoadingData(true)
    const [aRes, tRes] = await Promise.all([
      supabase.from('expense_accounts').select('*').order('name'),
      supabase.from('expense_transactions').select('*').order('date', { ascending: false }),
    ])
    if (aRes.data) setAccounts(aRes.data)
    if (tRes.data) setTransactions(tRes.data)
    setLoadingData(false)
  }, [])

  useEffect(() => {
    if (user && isAdmin) fetchData()
  }, [user, isAdmin, fetchData])

  /* ---- filtered transactions ---- */
  const filteredTx = useMemo(
    () =>
      selectedAccountId === 'all'
        ? transactions
        : transactions.filter((t) => t.account_id === selectedAccountId),
    [transactions, selectedAccountId],
  )

  /* ---- summary calculations ---- */
  const summaryByAccount = useMemo(() => {
    const map: Record<string, { income: number; expense: number }> = {}
    for (const a of accounts) {
      map[a.id] = { income: 0, expense: 0 }
    }
    for (const t of transactions) {
      if (!map[t.account_id]) continue
      const bucket = map[t.account_id]
      if (t.direction === 'income') {
        bucket.income += Number(t.price)
      } else {
        bucket.expense += Number(t.price)
      }
    }
    return map
  }, [accounts, transactions])

  const grandTotals = useMemo(() => {
    let income = 0, expense = 0
    for (const v of Object.values(summaryByAccount)) {
      income += v.income
      expense += v.expense
    }
    return { income, expense, net: income - expense }
  }, [summaryByAccount])

  /* ---- account name lookup ---- */
  const accountName = useCallback(
    (id: string) => accounts.find((a) => a.id === id)?.name ?? 'Unknown',
    [accounts],
  )

  /* ---- handlers ---- */

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus(null)
    const { error } = await supabase.from('expense_accounts').insert({
      name: newAccount.name.trim(),
      type: newAccount.type,
      email: newAccount.email.trim() || null,
      phone: newAccount.phone.trim() || null,
      notes: newAccount.notes.trim() || null,
    })
    if (error) {
      setStatus({ type: 'error', text: error.message })
    } else {
      setStatus({ type: 'success', text: `Account "${newAccount.name}" created.` })
      setNewAccount({ name: '', type: 'student', email: '', phone: '', notes: '' })
      setShowNewAccount(false)
      fetchData()
    }
  }

  const handleDeleteAccount = async (id: string) => {
    if (!confirm('Delete this account and ALL its transactions? This cannot be undone.')) return
    const { error } = await supabase.from('expense_accounts').delete().eq('id', id)
    if (error) setStatus({ type: 'error', text: error.message })
    else {
      setStatus({ type: 'success', text: 'Account deleted.' })
      if (selectedAccountId === id) setSelectedAccountId('all')
      fetchData()
    }
  }

  const handleCreateTransaction = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus(null)
    if (!newTx.account_id) {
      setStatus({ type: 'error', text: 'Please select an account.' })
      return
    }
    const { error } = await supabase.from('expense_transactions').insert({
      account_id: newTx.account_id,
      date: newTx.date,
      item: newTx.item.trim(),
      direction: newTx.direction,
      price: parseFloat(newTx.price) || 0,
      notes: newTx.notes.trim() || null,
    })
    if (error) {
      setStatus({ type: 'error', text: error.message })
    } else {
      setStatus({ type: 'success', text: 'Transaction added.' })
      setNewTx({ account_id: newTx.account_id, date: today(), item: '', direction: 'expense', price: '', notes: '' })
      setShowNewTx(false)
      fetchData()
    }
  }

  const handleDeleteTransaction = async (id: string) => {
    if (!confirm('Delete this transaction?')) return
    const { error } = await supabase.from('expense_transactions').delete().eq('id', id)
    if (error) setStatus({ type: 'error', text: error.message })
    else {
      setStatus({ type: 'success', text: 'Transaction deleted.' })
      fetchData()
    }
  }

  const startEditTransaction = (t: Transaction) => {
    setEditingTxId(t.id)
    setEditTx({
      date: t.date,
      item: t.item,
      direction: t.direction,
      price: String(t.price),
      notes: t.notes ?? '',
      account_id: t.account_id,
    })
  }

  const handleUpdateTransaction = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingTxId) return
    const { error } = await supabase.from('expense_transactions').update({
      account_id: editTx.account_id,
      date: editTx.date,
      item: editTx.item.trim(),
      direction: editTx.direction,
      price: parseFloat(editTx.price) || 0,
      notes: editTx.notes.trim() || null,
    }).eq('id', editingTxId)
    if (error) {
      setStatus({ type: 'error', text: error.message })
    } else {
      setStatus({ type: 'success', text: 'Transaction updated.' })
      setEditingTxId(null)
      fetchData()
    }
  }

  /* ---- auth loading / guard ---- */
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    )
  }
  if (!user || !isAdmin) return null

  /* ================================================================ */
  /*  RENDER                                                           */
  /* ================================================================ */

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Back link */}
      <div className="mb-6">
        <Link href="/admin" className="text-sm text-gray-500 hover:text-gray-700">
          ← Back to Admin
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Expense Tracker</h1>
      </div>

      {/* Status banner */}
      {status && (
        <div
          className={`mb-6 p-4 rounded-lg border ${
            status.type === 'success'
              ? 'bg-green-50 text-green-800 border-green-200'
              : 'bg-red-50 text-red-800 border-red-200'
          }`}
        >
          {status.text}
          <button onClick={() => setStatus(null)} className="ml-4 underline text-sm">
            dismiss
          </button>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        <SummaryCard label="Total Income" value={fmt(grandTotals.income)} color="green" />
        <SummaryCard label="Total Expenses" value={fmt(grandTotals.expense)} color="red" />
        <SummaryCard label="Net" value={fmt(grandTotals.net)} color={grandTotals.net >= 0 ? 'green' : 'red'} />
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 rounded-lg p-1 mb-6">
        {(['ledger', 'accounts', 'summary'] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab === 'ledger' ? 'Ledger' : tab === 'accounts' ? 'Accounts' : 'Summary'}
          </button>
        ))}
      </div>

      {loadingData ? (
        <p className="text-gray-500 text-center py-12">Loading data...</p>
      ) : (
        <>
          {/* ===================== LEDGER TAB ===================== */}
          {activeTab === 'ledger' && (
            <div>
              {/* Controls row */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
                <select
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="all">All Accounts</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.type})
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => { setShowNewTx(!showNewTx); setShowNewAccount(false) }}
                  className="bg-golden text-darkText font-semibold text-sm py-2 px-4 rounded-lg hover:bg-opacity-90 transition-colors"
                >
                  {showNewTx ? 'Cancel' : '+ Add Transaction'}
                </button>
              </div>

              {/* New transaction form */}
              {showNewTx && (
                <form onSubmit={handleCreateTransaction} className="bg-white rounded-lg shadow-md p-5 mb-6 space-y-4">
                  <h3 className="font-semibold text-gray-800">New Transaction</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Account *</label>
                      <select
                        value={newTx.account_id}
                        onChange={(e) => setNewTx({ ...newTx, account_id: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        required
                      >
                        <option value="">Select account...</option>
                        {accounts.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name} ({a.type})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Date *</label>
                      <input type="date" value={newTx.date} onChange={(e) => setNewTx({ ...newTx, date: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" required />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Direction *</label>
                      <select value={newTx.direction} onChange={(e) => setNewTx({ ...newTx, direction: e.target.value as 'income' | 'expense' })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                        <option value="income">Income (money in)</option>
                        <option value="expense">Expense (money out)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Item *</label>
                      <input type="text" value={newTx.item} onChange={(e) => setNewTx({ ...newTx, item: e.target.value })} placeholder="e.g. 1.5hr flight lesson" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" required />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Price ($) *</label>
                      <input type="number" step="0.01" min="0" value={newTx.price} onChange={(e) => setNewTx({ ...newTx, price: e.target.value })} placeholder="0.00" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" required />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                    <input type="text" value={newTx.notes} onChange={(e) => setNewTx({ ...newTx, notes: e.target.value })} placeholder="Optional notes" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <button type="submit" className="bg-golden text-darkText font-semibold text-sm py-2 px-6 rounded-lg hover:bg-opacity-90 transition-colors">
                    Save Transaction
                  </button>
                </form>
              )}

              {/* Transactions table */}
              {filteredTx.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  No transactions yet. {accounts.length === 0 && 'Create an account first under the Accounts tab.'}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 text-left text-gray-500 text-xs uppercase tracking-wider">
                        <th className="py-3 px-3">Date</th>
                        <th className="py-3 px-3">Account</th>
                        <th className="py-3 px-3">Item</th>
                        <th className="py-3 px-3">Type</th>
                        <th className="py-3 px-3 text-right">Price</th>
                        <th className="py-3 px-3">Notes</th>
                        <th className="py-3 px-3 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredTx.map((t) =>
                        editingTxId === t.id ? (
                          /* ---- inline edit row ---- */
                          <tr key={t.id} className="bg-yellow-50">
                            <td className="py-2 px-3"><input type="date" value={editTx.date} onChange={(e) => setEditTx({ ...editTx, date: e.target.value })} className="border rounded px-2 py-1 text-sm w-full" /></td>
                            <td className="py-2 px-3">
                              <select value={editTx.account_id} onChange={(e) => setEditTx({ ...editTx, account_id: e.target.value })} className="border rounded px-2 py-1 text-sm w-full">
                                {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                              </select>
                            </td>
                            <td className="py-2 px-3"><input type="text" value={editTx.item} onChange={(e) => setEditTx({ ...editTx, item: e.target.value })} className="border rounded px-2 py-1 text-sm w-full" /></td>
                            <td className="py-2 px-3">
                              <select value={editTx.direction} onChange={(e) => setEditTx({ ...editTx, direction: e.target.value as 'income' | 'expense' })} className="border rounded px-2 py-1 text-sm w-full">
                                <option value="income">Income</option>
                                <option value="expense">Expense</option>
                              </select>
                            </td>
                            <td className="py-2 px-3"><input type="number" step="0.01" value={editTx.price} onChange={(e) => setEditTx({ ...editTx, price: e.target.value })} className="border rounded px-2 py-1 text-sm w-24 text-right" /></td>
                            <td className="py-2 px-3"><input type="text" value={editTx.notes} onChange={(e) => setEditTx({ ...editTx, notes: e.target.value })} className="border rounded px-2 py-1 text-sm w-full" /></td>
                            <td className="py-2 px-3 text-center whitespace-nowrap">
                              <button onClick={handleUpdateTransaction} className="text-green-600 hover:underline text-xs mr-2">Save</button>
                              <button onClick={() => setEditingTxId(null)} className="text-gray-500 hover:underline text-xs">Cancel</button>
                            </td>
                          </tr>
                        ) : (
                          /* ---- normal display row ---- */
                          <tr key={t.id} className="hover:bg-gray-50">
                            <td className="py-3 px-3 whitespace-nowrap">{t.date}</td>
                            <td className="py-3 px-3 whitespace-nowrap">{accountName(t.account_id)}</td>
                            <td className="py-3 px-3">{t.item}</td>
                            <td className="py-3 px-3">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${t.direction === 'income' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                {t.direction === 'income' ? 'In' : 'Out'}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right font-mono">{fmt(Number(t.price))}</td>
                            <td className="py-3 px-3 text-gray-500 text-xs">{t.notes || '—'}</td>
                            <td className="py-3 px-3 text-center whitespace-nowrap">
                              <button onClick={() => startEditTransaction(t)} className="text-blue-600 hover:underline text-xs mr-2">Edit</button>
                              <button onClick={() => handleDeleteTransaction(t.id)} className="text-red-500 hover:underline text-xs">Del</button>
                            </td>
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ===================== ACCOUNTS TAB ===================== */}
          {activeTab === 'accounts' && (
            <div>
              <button
                onClick={() => { setShowNewAccount(!showNewAccount); setShowNewTx(false) }}
                className="mb-4 bg-golden text-darkText font-semibold text-sm py-2 px-4 rounded-lg hover:bg-opacity-90 transition-colors"
              >
                {showNewAccount ? 'Cancel' : '+ New Account'}
              </button>

              {showNewAccount && (
                <form onSubmit={handleCreateAccount} className="bg-white rounded-lg shadow-md p-5 mb-6 space-y-4">
                  <h3 className="font-semibold text-gray-800">Create Account</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Name *</label>
                      <input type="text" value={newAccount.name} onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })} placeholder="e.g. John Smith" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" required />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Type *</label>
                      <select value={newAccount.type} onChange={(e) => setNewAccount({ ...newAccount, type: e.target.value as Account['type'] })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                        <option value="student">Student</option>
                        <option value="client">Client</option>
                        <option value="business">Business (General)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                      <input type="email" value={newAccount.email} onChange={(e) => setNewAccount({ ...newAccount, email: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
                      <input type="tel" value={newAccount.phone} onChange={(e) => setNewAccount({ ...newAccount, phone: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                      <input type="text" value={newAccount.notes} onChange={(e) => setNewAccount({ ...newAccount, notes: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                    </div>
                  </div>
                  <button type="submit" className="bg-golden text-darkText font-semibold text-sm py-2 px-6 rounded-lg hover:bg-opacity-90 transition-colors">
                    Create Account
                  </button>
                </form>
              )}

              {accounts.length === 0 ? (
                <div className="text-center py-12 text-gray-400">No accounts yet. Click "+ New Account" to create one.</div>
              ) : (
                <div className="grid gap-4">
                  {accounts.map((a) => {
                    const s = summaryByAccount[a.id] || { income: 0, expense: 0 }
                    const net = s.income - s.expense
                    return (
                      <div key={a.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div>
                            <h3 className="font-semibold text-gray-900">{a.name}</h3>
                            <div className="flex flex-wrap gap-2 mt-1">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${a.type === 'student' ? 'bg-blue-100 text-blue-800' : a.type === 'client' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'}`}>
                                {a.type}
                              </span>
                              {a.email && <span className="text-xs text-gray-500">{a.email}</span>}
                              {a.phone && <span className="text-xs text-gray-500">{a.phone}</span>}
                            </div>
                            {a.notes && <p className="text-xs text-gray-400 mt-1">{a.notes}</p>}
                          </div>
                          <div className="flex items-center gap-6 text-sm">
                            <div className="text-right">
                              <div className="text-green-700 font-medium">{fmt(s.income)} in</div>
                              <div className="text-red-600 font-medium">{fmt(s.expense)} out</div>
                              <div className={`font-semibold ${net >= 0 ? 'text-green-800' : 'text-red-800'}`}>Net: {fmt(net)}</div>
                            </div>
                            <div className="flex flex-col gap-1">
                              <button
                                onClick={() => { setSelectedAccountId(a.id); setActiveTab('ledger') }}
                                className="text-blue-600 hover:underline text-xs"
                              >
                                View Ledger
                              </button>
                              <button onClick={() => handleDeleteAccount(a.id)} className="text-red-500 hover:underline text-xs">
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ===================== SUMMARY TAB ===================== */}
          {activeTab === 'summary' && (
            <div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left text-gray-500 text-xs uppercase tracking-wider">
                      <th className="py-3 px-3">Account</th>
                      <th className="py-3 px-3">Type</th>
                      <th className="py-3 px-3 text-right">Income</th>
                      <th className="py-3 px-3 text-right">Expenses</th>
                      <th className="py-3 px-3 text-right">Net</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {accounts.map((a) => {
                      const s = summaryByAccount[a.id] || { income: 0, expense: 0 }
                      const net = s.income - s.expense
                      return (
                        <tr key={a.id} className="hover:bg-gray-50">
                          <td className="py-3 px-3 font-medium">{a.name}</td>
                          <td className="py-3 px-3">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${a.type === 'student' ? 'bg-blue-100 text-blue-800' : a.type === 'client' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'}`}>
                              {a.type}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-green-700">{fmt(s.income)}</td>
                          <td className="py-3 px-3 text-right font-mono text-red-600">{fmt(s.expense)}</td>
                          <td className={`py-3 px-3 text-right font-mono font-semibold ${net >= 0 ? 'text-green-800' : 'text-red-800'}`}>{fmt(net)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-gray-300 font-semibold">
                      <td className="py-3 px-3" colSpan={2}>Totals</td>
                      <td className="py-3 px-3 text-right font-mono text-green-700">{fmt(grandTotals.income)}</td>
                      <td className="py-3 px-3 text-right font-mono text-red-600">{fmt(grandTotals.expense)}</td>
                      <td className={`py-3 px-3 text-right font-mono ${grandTotals.net >= 0 ? 'text-green-800' : 'text-red-800'}`}>{fmt(grandTotals.net)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Summary Card                                                       */
/* ------------------------------------------------------------------ */

function SummaryCard({ label, value, color }: { label: string; value: string; color: 'green' | 'red' }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-lg font-bold ${color === 'green' ? 'text-green-700' : 'text-red-600'}`}>{value}</p>
    </div>
  )
}
