import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { Card } from '../../components/ui/Card';
import { Icons } from '../../assets/icons';
import { adminAPI, AdminDashboardStats, AdminUser, RecentActivityItem } from '../../api/admin';

const defaultStats: AdminDashboardStats = {
  total_users: 0,
  active_users: 0,
  admin_users: 0,
  active_exams: 0,
  questions_bank: 0,
  pyq_count: 0,
  mock_tests: 0,
  total_test_attempts: 0,
};

const formatAccuracy = (accuracy: number) => {
  if (!Number.isFinite(accuracy)) return '--';
  const asPercent = accuracy <= 1 ? accuracy * 100 : accuracy;
  return `${asPercent.toFixed(1)}%`;
};

export const AdminDashboardPage: React.FC = () => {
  const [stats, setStats] = useState<AdminDashboardStats>(defaultStats);
  const [recentUsers, setRecentUsers] = useState<AdminUser[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [statsData, usersEnvelope, activity] = await Promise.all([
          adminAPI.getDashboardStats(),
          adminAPI.getUsers({
            page: 1,
            page_size: 5,
            sort_by: 'created_at',
            sort_order: 'desc',
          }),
          adminAPI.getRecentActivity(5),
        ]);

        setStats(statsData);
        setRecentUsers(usersEnvelope.items);
        setRecentActivity(activity);
      } catch (error) {
        console.error('Failed to load admin dashboard data', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">System Dashboard</h1>
          <p className="text-sm text-slate-500">Live system status and administrative quick actions</p>
        </div>
      </div>

      {/* Quick Action Shortcuts */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <Link
          to="/admin/questions?action=new"
          className="flex items-center gap-2.5 p-3 rounded-lg bg-white border border-slate-200 hover:border-indigo-300 hover:shadow-sm transition-all group"
        >
          <div className="p-2 rounded-md bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
            <Icons.Plus className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-800">Add Question</div>
            <div className="text-[10px] text-slate-500">Single entry</div>
          </div>
        </Link>

        <Link
          to="/admin/questions?action=import"
          className="flex items-center gap-2.5 p-3 rounded-lg bg-white border border-slate-200 hover:border-purple-300 hover:shadow-sm transition-all group"
        >
          <div className="p-2 rounded-md bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
            <Icons.FileText className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-800">Import JSON</div>
            <div className="text-[10px] text-slate-500">Batch ingestion</div>
          </div>
        </Link>

        <Link
          to="/admin/mock-tests?action=new"
          className="flex items-center gap-2.5 p-3 rounded-lg bg-white border border-slate-200 hover:border-amber-300 hover:shadow-sm transition-all group"
        >
          <div className="p-2 rounded-md bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-colors">
            <Icons.Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-800">Create Test</div>
            <div className="text-[10px] text-slate-500">New mock test</div>
          </div>
        </Link>

        <Link
          to="/admin/users"
          className="flex items-center gap-2.5 p-3 rounded-lg bg-white border border-slate-200 hover:border-blue-300 hover:shadow-sm transition-all group"
        >
          <div className="p-2 rounded-md bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
            <Icons.Users className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-800">Manage Users</div>
            <div className="text-[10px] text-slate-500">Directory & status</div>
          </div>
        </Link>

        <Link
          to="/admin/hierarchy"
          className="flex items-center gap-2.5 p-3 rounded-lg bg-white border border-slate-200 hover:border-emerald-300 hover:shadow-sm transition-all group"
        >
          <div className="p-2 rounded-md bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
            <Icons.BookOpen className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-800">Syllabus Tree</div>
            <div className="text-[10px] text-slate-500">Hierarchy & topics</div>
          </div>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link to="/admin/users" className="block transition-transform hover:-translate-y-1">
          <Card className="p-6 h-full hover:shadow-md cursor-pointer border-l-4 border-l-blue-500">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg text-blue-600">
                <Icons.User className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-slate-500 font-medium">Total Users</p>
                <h3 className="text-2xl font-bold text-slate-800">{loading ? '--' : stats.total_users}</h3>
              </div>
            </div>
          </Card>
        </Link>

        <Link to="/admin/hierarchy" className="block transition-transform hover:-translate-y-1">
          <Card className="p-6 h-full hover:shadow-md cursor-pointer border-l-4 border-l-emerald-500">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-100 rounded-lg text-emerald-600">
                <Icons.BookOpen className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-slate-500 font-medium">Active Exams</p>
                <h3 className="text-2xl font-bold text-slate-800">{loading ? '--' : stats.active_exams}</h3>
              </div>
            </div>
          </Card>
        </Link>

        <Link to="/admin/questions" className="block transition-transform hover:-translate-y-1">
          <Card className="p-6 h-full hover:shadow-md cursor-pointer border-l-4 border-l-purple-500">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 rounded-lg text-purple-600">
                <Icons.PenTool className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-slate-500 font-medium">Questions Bank</p>
                <h3 className="text-2xl font-bold text-slate-800">{loading ? '--' : stats.questions_bank}</h3>
              </div>
            </div>
          </Card>
        </Link>

        <Link to="/admin/mock-tests" className="block transition-transform hover:-translate-y-1">
          <Card className="p-6 h-full hover:shadow-md cursor-pointer border-l-4 border-l-amber-500">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-100 rounded-lg text-amber-600">
                <Icons.Clock className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-slate-500 font-medium">Mock Tests</p>
                <h3 className="text-2xl font-bold text-slate-800">{loading ? '--' : stats.mock_tests}</h3>
              </div>
            </div>
          </Card>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <Card className="p-6 min-h-[300px]">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-slate-800">Recent Users</h3>
            <Link to="/admin/users" className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">
              View All
            </Link>
          </div>

          {loading ? (
            <div className="flex items-center justify-center p-8 text-slate-400">Loading users...</div>
          ) : recentUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400">
              <Icons.Users className="w-10 h-10 mb-3 text-slate-300" />
              <p>No users found in the system</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b">
                  <tr>
                    <th className="px-4 py-3 font-medium">User</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium text-right">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {recentUsers.map((user) => (
                    <tr key={user.id} className="border-b hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800">{user.full_name || 'Unknown'}</div>
                        <div className="text-xs text-slate-500">{user.email}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            user.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {user.is_active ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-500">{new Date(user.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card className="p-6 min-h-[300px]">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-slate-800">Recent Test Activity</h3>
          </div>

          {loading ? (
            <div className="flex items-center justify-center p-8 text-slate-400">Loading activity...</div>
          ) : recentActivity.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400">
              <Icons.Play className="w-10 h-10 mb-3 text-slate-300" />
              <p>No completed mock test attempts yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b">
                  <tr>
                    <th className="px-4 py-3 font-medium">Test</th>
                    <th className="px-4 py-3 font-medium">Student</th>
                    <th className="px-4 py-3 font-medium text-right">Score</th>
                    <th className="px-4 py-3 font-medium text-right">Accuracy</th>
                    <th className="px-4 py-3 font-medium text-right">Completed</th>
                  </tr>
                </thead>
                <tbody>
                  {recentActivity.map((row) => (
                    <tr key={row.attempt_id} className="border-b hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800">{row.test_name}</div>
                        <div className="text-xs text-slate-500">{row.total_questions} questions</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800">{row.user_name || 'Unknown'}</div>
                        <div className="text-xs text-slate-500">{row.user_email}</div>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-500">{row.score}</td>
                      <td className="px-4 py-3 text-right text-slate-500">{formatAccuracy(row.accuracy)}</td>
                      <td className="px-4 py-3 text-right text-slate-500">{new Date(row.completed_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
