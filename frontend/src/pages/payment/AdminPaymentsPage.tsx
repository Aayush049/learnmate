import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  TrendingUp,
  RotateCcw,
  Users,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Loader2,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import {
  paymentsAPI,
  AdminTransactionItem,
  AdminTransactionsSummary,
} from '../../api/payments';

export const AdminPaymentsPage: React.FC = () => {
  const [stats, setStats] = useState<AdminTransactionsSummary | null>(null);
  const [payments, setPayments] = useState<AdminTransactionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Refund Modal State
  const [selectedPaymentForRefund, setSelectedPaymentForRefund] = useState<AdminTransactionItem | null>(null);
  const [refundReason, setRefundReason] = useState('');
  const [isRefunding, setIsRefunding] = useState(false);
  const [refundError, setRefundError] = useState<string | null>(null);
  const [refundSuccess, setRefundSuccess] = useState<string | null>(null);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const data = await paymentsAPI.adminGetTransactions();
      setStats(data);
      setPayments(data.transactions || []);
    } catch (err) {
      console.error('Failed to load admin payment data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleProcessRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPaymentForRefund || !refundReason.trim()) return;

    try {
      setIsRefunding(true);
      setRefundError(null);
      setRefundSuccess(null);

      await paymentsAPI.adminProcessRefund(selectedPaymentForRefund.id, refundReason);
      setRefundSuccess(`Refund successfully initiated for Payment #${selectedPaymentForRefund.id}. Entitlement revoked.`);
      setSelectedPaymentForRefund(null);
      setRefundReason('');
      await fetchAdminData();
    } catch (err: any) {
      console.error('Refund failed:', err);
      setRefundError(err.response?.data?.detail || 'Failed to process refund. Please verify permissions.');
    } finally {
      setIsRefunding(false);
    }
  };

  const filteredPayments = payments.filter((p) => {
    const matchesSearch =
      (p.user_email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.user_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.provider_order_id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.provider_payment_id || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans p-6 sm:p-10">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-2">
              <ShieldCheck className="w-3.5 h-3.5" />
              Financial Administration
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
              Payment & Revenue Hub
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Live transaction auditing, Razorpay reconciliation, and statutory refund execution.
            </p>
          </div>

          <button
            onClick={fetchAdminData}
            disabled={loading}
            className="self-start sm:self-auto px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-xl shadow-xs flex items-center gap-2 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Records
          </button>
        </div>

        {/* Global Notifications */}
        {refundSuccess && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-emerald-800 text-sm">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>{refundSuccess}</span>
            </div>
            <button onClick={() => setRefundSuccess(null)} className="text-emerald-700 font-bold text-xs hover:underline">
              Dismiss
            </button>
          </div>
        )}

        {/* Revenue Stats KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Gross Revenue */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Gross Revenue</span>
              <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-2xl sm:text-3xl font-black text-gray-900">
                ₹{(stats?.total_revenue_inr || 0).toLocaleString('en-IN')}
              </span>
              <span className="text-xs text-gray-500 block mt-1">Captured via Gateway</span>
            </div>
          </div>

          {/* Successful Transactions */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Captured Orders</span>
              <div className="p-2.5 bg-purple-50 text-primary rounded-xl">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-2xl sm:text-3xl font-black text-gray-900">
                {(stats?.total_transactions_count || 0).toLocaleString()}
              </span>
              <span className="text-xs text-gray-500 block mt-1">Completed successfully</span>
            </div>
          </div>

          {/* Active Subscribers */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Active Entitlements</span>
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-2xl sm:text-3xl font-black text-gray-900">
                {(stats?.active_subscribers_count || 0).toLocaleString()}
              </span>
              <span className="text-xs text-gray-500 block mt-1">Current unlocked accounts</span>
            </div>
          </div>

          {/* Refunds Disbursed */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Refund Cases</span>
              <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
                <RotateCcw className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-2xl sm:text-3xl font-black text-amber-700">
                {(stats?.refunds_count || 0)}
              </span>
              <span className="text-xs text-gray-500 block mt-1">
                Statutory reversals processed
              </span>
            </div>
          </div>
        </div>

        {/* Transactions Table & Filters */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
          {/* Controls Bar */}
          <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by user email, name, order ID..."
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-primary focus:outline-hidden"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-gray-50 border border-gray-200 text-xs font-semibold rounded-xl px-3 py-2 text-gray-700 focus:outline-hidden"
              >
                <option value="all">All Statuses</option>
                <option value="captured">Captured / Success</option>
                <option value="refunded">Refunded</option>
                <option value="created">Pending / Created</option>
                <option value="failed">Failed</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary animate-spin mb-2" />
                <span className="text-xs text-gray-500">Loading audit records...</span>
              </div>
            ) : filteredPayments.length === 0 ? (
              <div className="py-16 text-center text-gray-500 text-xs">
                No matching transactions found in system logs.
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50/75 border-b border-gray-100 text-gray-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3.5 px-4">Tx ID / Date</th>
                    <th className="py-3.5 px-4">Student</th>
                    <th className="py-3.5 px-4">Plan</th>
                    <th className="py-3.5 px-4">Amount</th>
                    <th className="py-3.5 px-4">Gateway Reference</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700 font-medium">
                  {filteredPayments.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-gray-900 block">#{p.id}</span>
                        <span className="text-[11px] text-gray-400">
                          {p.created_at ? new Date(p.created_at).toLocaleDateString('en-IN') : 'N/A'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-bold text-gray-900 block">{p.user_name || 'Student'}</span>
                        <span className="text-[11px] text-gray-500">{p.user_email || `User #${p.user_id}`}</span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-full bg-purple-50 text-primary text-[11px] font-bold">
                          {p.plan_name || 'Custom'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-bold text-gray-900">
                        ₹{p.amount.toLocaleString('en-IN')}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <code className="text-[10px] text-gray-600 block">
                            Ord: {p.provider_order_id ? p.provider_order_id.substring(0, 16) + '...' : 'N/A'}
                          </code>
                          <code className="text-[10px] text-gray-400 block">
                            Pay: {p.provider_payment_id ? p.provider_payment_id.substring(0, 16) + '...' : 'N/A'}
                          </code>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        {p.status === 'captured' ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full text-[11px] font-bold">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Captured
                          </span>
                        ) : p.status === 'refunded' ? (
                          <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full text-[11px] font-bold">
                            <RotateCcw className="w-3 h-3 text-amber-600" />
                            Refunded
                          </span>
                        ) : p.status === 'failed' ? (
                          <span className="inline-flex items-center gap-1 text-red-700 bg-red-50 px-2.5 py-1 rounded-full text-[11px] font-bold">
                            <XCircle className="w-3 h-3 text-red-600" />
                            Failed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-gray-700 bg-gray-100 px-2.5 py-1 rounded-full text-[11px] font-bold">
                            <Clock className="w-3 h-3 text-gray-500" />
                            {p.status}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        {p.status === 'captured' ? (
                          <button
                            onClick={() => {
                              setSelectedPaymentForRefund(p);
                              setRefundError(null);
                            }}
                            className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 font-bold rounded-lg text-[11px] transition-colors"
                          >
                            Refund
                          </button>
                        ) : (
                          <span className="text-[11px] text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Statutory Refund Confirmation Modal */}
      {selectedPaymentForRefund && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2.5 text-red-600 mb-3">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="font-bold text-base text-gray-900">Execute Statutory Refund</h3>
            </div>

            <p className="text-xs text-gray-600 mb-4">
              Refunding Payment <strong>#{selectedPaymentForRefund.id}</strong> (₹{selectedPaymentForRefund.amount}) for student <strong>{selectedPaymentForRefund.user_email}</strong> will immediately reverse payment on the gateway and revoke all premium entitlements.
            </p>

            {refundError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                {refundError}
              </div>
            )}

            <form onSubmit={handleProcessRefund} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Reason for Statutory Refund:
                </label>
                <select
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  required
                  className="w-full text-xs p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 focus:outline-hidden focus:ring-2 focus:ring-primary"
                >
                  <option value="">Select legitimate reason...</option>
                  <option value="Duplicate Transaction Charge">Duplicate Transaction Charge</option>
                  <option value="Access Provisioning Failure">Access Provisioning Failure</option>
                  <option value="Material Technical Defect">Material Technical Defect</option>
                  <option value="Customer Cancellation Before Activation">Customer Cancellation Before Activation</option>
                  <option value="Administrative Courtesy Exception">Administrative Courtesy Exception</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={isRefunding}
                  onClick={() => {
                    setSelectedPaymentForRefund(null);
                    setRefundReason('');
                  }}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-xs rounded-xl transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isRefunding || !refundReason}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                >
                  {isRefunding ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Disbursing...
                    </>
                  ) : (
                    'Confirm & Revoke Access'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
