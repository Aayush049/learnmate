import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Icons } from '../../assets/icons';
import { adminAPI } from '../../api';

export const AdminDashboardPage: React.FC = () => {
  const [stats, setStats] = useState({
    total_users: 0,
    active_exams: 0,
    questions_bank: 0,
    mock_tests: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await adminAPI.getDashboardStats();
        setStats(data);
      } catch (error) {
        console.error("Failed to load admin stats", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-800">System Dashboard</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-lg text-blue-600">
              <Icons.User className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">Total Users</p>
              <h3 className="text-2xl font-bold text-slate-800">
                {loading ? '--' : stats.total_users}
              </h3>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-100 rounded-lg text-emerald-600">
              <Icons.BookOpen className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">Active Exams</p>
              <h3 className="text-2xl font-bold text-slate-800">
                {loading ? '--' : stats.active_exams}
              </h3>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-100 rounded-lg text-purple-600">
              <Icons.PenTool className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">Questions Bank</p>
              <h3 className="text-2xl font-bold text-slate-800">
                {loading ? '--' : stats.questions_bank}
              </h3>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-100 rounded-lg text-amber-600">
              <Icons.Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">Mock Tests</p>
              <h3 className="text-2xl font-bold text-slate-800">
                {loading ? '--' : stats.mock_tests}
              </h3>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <Card className="p-6 min-h-[300px]">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Recent Users</h3>
          <div className="flex items-center justify-center h-48 text-slate-400">
            Analytics visualization coming soon
          </div>
        </Card>
        <Card className="p-6 min-h-[300px]">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Recent Tests</h3>
          <div className="flex items-center justify-center h-48 text-slate-400">
            System activity logs coming soon
          </div>
        </Card>
      </div>
    </div>
  );
};
