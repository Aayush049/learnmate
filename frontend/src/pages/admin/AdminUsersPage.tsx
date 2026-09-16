import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Icons } from '../../assets/icons';
import { adminAPI, AdminUser, AdminUserProgress } from '../../api/admin';

export const AdminUsersPage: React.FC = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<number | null>(null);
  const [userProgress, setUserProgress] = useState<AdminUserProgress | null>(null);
  const [progressLoading, setProgressLoading] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await adminAPI.getUsers();
      setUsers(data);
    } catch (err: any) {
      setError('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (user: AdminUser) => {
    if (user.is_admin) {
      alert("Cannot delete an admin user.");
      return;
    }
    if (window.confirm(`Are you sure you want to permanently delete user ${user.full_name}?`)) {
      try {
        await adminAPI.deleteUser(user.id);
        fetchUsers();
        if (selectedUser === user.id) {
          setSelectedUser(null);
          setUserProgress(null);
        }
      } catch (err) {
        alert("Failed to delete user.");
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
    } catch (err) {
      alert("Failed to fetch user progress");
    } finally {
      setProgressLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-800">User Management</h1>
        <Button onClick={fetchUsers} variant="outline" className="flex items-center gap-2">
          <Icons.RefreshCw className="w-4 h-4" /> Refresh
        </Button>
      </div>

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
                          </td>
                          <td className="p-4">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${user.is_admin ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-700'}`}>
                              {user.is_admin ? 'Admin' : 'Student'}
                            </span>
                          </td>
                          <td className="p-4 text-slate-600">
                            {user.total_attempts} tests
                          </td>
                          <td className="p-4 text-slate-600 text-sm">
                            {new Date(user.created_at).toLocaleDateString()}
                          </td>
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
                                variant="danger"
                                onClick={() => handleDelete(user)}
                              >
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
                        <button onClick={() => setSelectedUser(null)} className="text-slate-400 hover:text-slate-600">
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
                                <span className={sub.accuracy >= 70 ? 'text-emerald-600' : sub.accuracy >= 40 ? 'text-amber-600' : 'text-red-500'}>
                                  {sub.accuracy}%
                                </span>
                              </div>
                              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${sub.accuracy >= 70 ? 'bg-emerald-500' : sub.accuracy >= 40 ? 'bg-amber-500' : 'bg-red-500'}`}
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
                          {userProgress.test_history.map(test => (
                            <div key={test.id} className="p-3 border border-slate-100 rounded-lg bg-slate-50">
                              <div className="font-medium text-slate-800 text-sm truncate">{test.test_name}</div>
                              <div className="flex justify-between items-center mt-2 text-xs">
                                <span className="text-slate-500">
                                  {new Date(test.completed_at).toLocaleDateString()}
                                </span>
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