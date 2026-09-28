import React, { useEffect, useMemo, useState } from 'react';

import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Icons } from '../../assets/icons';
import { adminAPI, AdminUser, AdminUserProgress, UserQueryParams } from '../../api/admin';

/** Turn an axios failure into something an admin can act on, not a generic string. */
const describeError = (err: any, fallback: string): string => {
  const detail = err?.response?.data?.detail;
  if (typeof detail === 'string' && detail) return detail;
  if (err?.code === 'ECONNABORTED') return 'Request timed out.';
  if (err?.request && !err?.response) {
    return 'Cannot reach the API. Is the backend running on the configured API URL?';
  }
  if (err?.response) return `${fallback} (HTTP ${err.response.status})`;
  return fallback;
};

export const AdminUsersPage: React.FC = () => {
  const PAGE_SIZE = 20;

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedUser, setSelectedUser] = useState<number | null>(null);
  const [userProgress, setUserProgress] = useState<AdminUserProgress | null>(null);
  const [progressLoading, setProgressLoading] = useState(false);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const [searchDraft, setSearchDraft] = useState('');
  const [searchTerm, setSearchTerm] = useState<string | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<UserQueryParams['status_filter'] | undefined>(undefined);
  const [sortBy, setSortBy] = useState<UserQueryParams['sort_by']>('created_at');
  const [sortOrder, setSortOrder] = useState<UserQueryParams['sort_order']>('desc');

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const envelope = await adminAPI.getUsers({
        page,
        page_size: PAGE_SIZE,
        search: searchTerm,
        status_filter: statusFilter,
        sort_by: sortBy,
        sort_order: sortOrder,
      });

      setUsers(envelope.items);
      setTotalItems(envelope.total);
      setTotalPages(envelope.total_pages);

      // If the selected user disappears from the current page, close the sidebar.
      if (selectedUser && !envelope.items.some((u) => u.id === selectedUser)) {
        setSelectedUser(null);
        setUserProgress(null);
      }
    } catch (err: any) {
      console.error('[AdminUsers] getUsers failed', err);
      setError(describeError(err, 'Failed to fetch users'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, searchTerm, statusFilter, sortBy, sortOrder]);

  const handleDelete = async (user: AdminUser) => {
    if (user.is_admin) {
      alert('Cannot delete an admin user.');
      return;
    }

    if (window.confirm(`Are you sure you want to permanently delete user ${user.full_name}?`)) {
      try {
        await adminAPI.deleteUser(user.id);
        // Keep page, re-fetch.
        await fetchUsers();
        if (selectedUser === user.id) {
          setSelectedUser(null);
          setUserProgress(null);
        }
      } catch {
        alert('Failed to delete user.');
      }
    }
  };

  const handleViewProgress = async (userId: number) => {
    if (selectedUser === userId) {
      setSelectedUser(null);
      setUserProgress(null);
      return;
    }

    setSelectedUser(userId);
    setProgressLoading(true);
    try {
      const progress = await adminAPI.getUserProgress(userId);
      setUserProgress(progress);
    } catch {
      alert('Failed to fetch user progress');
    } finally {
      setProgressLoading(false);
    }
  };

  const handleToggleActive = async (user: AdminUser) => {
    if (user.is_admin) return;

    const nextActive = !user.is_active;
    const actionText = nextActive ? 'reactivate' : 'disable';

    if (!window.confirm(`Are you sure you want to ${actionText} ${user.full_name}?`)) return;

    try {
      await adminAPI.updateUserStatus(user.id, nextActive);
      await fetchUsers();
    } catch {
      alert('Failed to update user status');
    }
  };

  const canPrev = page > 1;
  const canNext = page < totalPages;

  const roleLabel = (u: AdminUser) => (u.is_admin ? 'Admin' : 'Student');

  const totalLabel = useMemo(() => {
    if (!totalItems) return '';
    return `Showing page ${page} of ${totalPages} (${totalItems} total)`;
  }, [page, totalItems, totalPages]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center gap-4 flex-wrap">
        <h1 className="text-2xl font-bold text-slate-800">User Management</h1>

        <div className="flex items-center gap-2 flex-wrap">
          <Button onClick={() => fetchUsers()} variant="outline" className="flex items-center gap-2">
            <Icons.RefreshCw className="w-4 h-4" /> Refresh
          </Button>

          <div className="text-xs text-slate-500">{totalLabel}</div>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <div>
              <div className="text-xs font-medium text-slate-600 mb-1">Search</div>
              <div className="flex items-center gap-2">
                <input
                  value={searchDraft}
                  onChange={(e) => setSearchDraft(e.target.value)}
                  placeholder="Name or email"
                  className="w-64 max-w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                />
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setPage(1);
                    const trimmed = searchDraft.trim();
                    setSearchTerm(trimmed ? trimmed : undefined);
                  }}
                >
                  Search
                </Button>
              </div>
            </div>

            <div>
              <div className="text-xs font-medium text-slate-600 mb-1">Status</div>
              <select
                value={statusFilter ?? ''}
                onChange={(e) => {
                  setPage(1);
                  const v = e.target.value;
                  setStatusFilter(v ? (v as UserQueryParams['status_filter']) : undefined);
                }}
                className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                <option value="">All</option>
                <option value="active">Active</option>
                <option value="disabled">Disabled</option>
                <option value="admin">Admin</option>
                <option value="student">Student</option>
              </select>
            </div>

            <div>
              <div className="text-xs font-medium text-slate-600 mb-1">Sort</div>
              <div className="flex items-center gap-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as UserQueryParams['sort_by'])}
                  className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                >
                  <option value="created_at">Created</option>
                  <option value="full_name">Name</option>
                  <option value="email">Email</option>
                </select>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as UserQueryParams['sort_order'])}
                  className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                >
                  <option value="asc">Asc</option>
                  <option value="desc">Desc</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex items-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setPage(1);
                setSearchDraft('');
                setSearchTerm(undefined);
                setStatusFilter(undefined);
                setSortBy('created_at');
                setSortOrder('desc');
              }}
            >
              Reset
            </Button>
          </div>
        </div>
      </Card>

      {error ? (
        <div className="p-4 bg-red-50 text-red-600 rounded-lg">{error}</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className={`lg:col-span-${selectedUser ? '2' : '3'}`}>
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-sm">
                      <th className="p-4 font-medium">Name & Email</th>
                      <th className="p-4 font-medium">Role</th>
                      <th className="p-4 font-medium">Tests Attempted</th>
                      <th className="p-4 font-medium">Joined</th>
                      <th className="p-4 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-500">
                          Loading users...
                        </td>
                      </tr>
                    ) : users.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-500">
                          No users found.
                        </td>
                      </tr>
                    ) : (
                      users.map((user) => (
                        <tr
                          key={user.id}
                          className={`hover:bg-slate-50 transition-colors ${selectedUser === user.id ? 'bg-blue-100/50' : ''}`}
                        >
                          <td className="p-4">
                            <div className="font-medium text-slate-800">{user.full_name}</div>
                            <div className="text-sm text-slate-500">{user.email}</div>
                            <div className="mt-2">
                              <span
                                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                  user.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                                }`}
                              >
                                {user.is_active ? 'Active' : 'Disabled'}
                              </span>
                            </div>
                          </td>

                          <td className="p-4">
                            <span
                              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                user.is_admin ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {roleLabel(user)}
                            </span>
                          </td>

                          <td className="p-4 text-slate-600">{user.total_attempts} tests</td>

                          <td className="p-4 text-slate-600 text-sm">{new Date(user.created_at).toLocaleDateString()}</td>

                          <td className="p-4 text-right space-x-2">
                            <Button
                              size="sm"
                              variant={selectedUser === user.id ? 'primary' : 'outline'}
                              onClick={() => handleViewProgress(user.id)}
                            >
                              Progress
                            </Button>

                            {!user.is_admin && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleToggleActive(user)}
                              >
                                {user.is_active ? 'Disable' : 'Activate'}
                              </Button>
                            )}

                            {!user.is_admin && (
                              <Button size="sm" variant="danger" onClick={() => handleDelete(user)}>
                                Delete
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="p-4 flex items-center justify-between border-t border-slate-100">
                <div className="text-sm text-slate-600">
                  Page <span className="font-semibold">{page}</span> of <span className="font-semibold">{totalPages}</span>
                </div>

                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" disabled={!canPrev} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                    Prev
                  </Button>
                  <Button size="sm" variant="outline" disabled={!canNext} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                    Next
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          {/* User Progress Sidebar */}
          {selectedUser && (
            <div className="lg:col-span-1">
              <Card className="p-6 sticky top-6">
                {progressLoading ? (
                  <div className="flex justify-center items-center h-48 text-slate-500">
                    Loading progress analytics...
                  </div>
                ) : userProgress ? (
                  <div className="space-y-6">
                    <div>
                      <div className="flex justify-between items-start">
                        <h3 className="text-lg font-bold text-slate-800 break-all">{userProgress.user.full_name}</h3>
                        <button
                          onClick={() => {
                            setSelectedUser(null);
                            setUserProgress(null);
                          }}
                          className="text-slate-400 hover:text-slate-600"
                        >
                          <Icons.X className="w-5 h-5" />
                        </button>
                      </div>
                      <p className="text-sm text-slate-500">{userProgress.user.email}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-center">
                        <div className="text-2xl font-bold text-slate-800">{userProgress.overall.total_questions_attempted}</div>
                        <div className="text-xs text-slate-500 mt-1 uppercase font-semibold">Qs Attempted</div>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-center">
                        <div className="text-2xl font-bold text-blue-600">{userProgress.overall.overall_accuracy}%</div>
                        <div className="text-xs text-slate-500 mt-1 uppercase font-semibold">Avg Accuracy</div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold text-slate-800 mb-3 text-sm uppercase">Subject Proficiency</h4>
                      {userProgress.subject_stats.length === 0 ? (
                        <p className="text-sm text-slate-500 italic">No subject data available.</p>
                      ) : (
                        <div className="space-y-3">
                          {userProgress.subject_stats.map((sub, idx) => (
                            <div key={idx}>
                              <div className="flex justify-between text-sm mb-1">
                                <span className="font-medium text-slate-700">{sub.subject}</span>
                                <span
                                  className={
                                    sub.accuracy >= 70
                                      ? 'text-emerald-600'
                                      : sub.accuracy >= 40
                                      ? 'text-amber-600'
                                      : 'text-red-500'
                                  }
                                >
                                  {sub.accuracy}%
                                </span>
                              </div>
                              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className={
                                    sub.accuracy >= 70
                                      ? 'h-full rounded-full bg-emerald-500'
                                      : sub.accuracy >= 40
                                      ? 'h-full rounded-full bg-amber-500'
                                      : 'h-full rounded-full bg-red-500'
                                  }
                                  style={{ width: `${Math.max(sub.accuracy, 5)}%` }}
                                ></div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <h4 className="font-semibold text-slate-800 mb-3 text-sm uppercase">Recent Mock Tests</h4>
                      {userProgress.test_history.length === 0 ? (
                        <p className="text-sm text-slate-500 italic">No mock tests completed.</p>
                      ) : (
                        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                          {userProgress.test_history.map((test) => (
                            <div key={test.id} className="p-3 border border-slate-100 rounded-lg bg-slate-50">
                              <div className="font-medium text-slate-800 text-sm truncate">{test.test_name}</div>
                              <div className="flex justify-between items-center mt-2 text-xs">
                                <span className="text-slate-500">{new Date(test.completed_at).toLocaleDateString()}</span>
                                <span className="font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                                  {test.score} / {test.total_questions}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
