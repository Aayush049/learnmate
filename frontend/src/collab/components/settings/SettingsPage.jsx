import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../../contexts/AuthContext";
import { User, Mail, Shield, Bell, Zap, ShieldCheck, ArrowRight, Clock } from "lucide-react";
import PageIntro from "../common/PageIntro";
import { paymentsAPI } from "../../../api/payments";

export default function SettingsPage({ section }) {
  const { user, logout } = useAuth();
  const [entitlement, setEntitlement] = useState(null);
  const [loadingEntitlement, setLoadingEntitlement] = useState(true);

  useEffect(() => {
    async function loadEntitlement() {
      try {
        if (user) {
          const res = await paymentsAPI.getMyEntitlement();
          setEntitlement(res);
        }
      } catch (err) {
        console.error("Failed to load entitlement:", err);
      } finally {
        setLoadingEntitlement(false);
      }
    }
    loadEntitlement();
  }, [user]);

  return (
    <div className="page">
      <PageIntro
        title="Settings"
        subtitle="Manage your account preferences and application settings."
      />

      <div className="max-w-3xl">
        {/* Subscription & Billing Card */}
        <div className="card mb-6 border-2 border-primary/20 bg-gradient-to-r from-purple-50/40 via-white to-purple-50/20">
          <div className="flex items-center justify-between border-b pb-4 mb-4">
            <h3 className="font-semibold text-lg flex items-center gap-2 text-gray-900">
              <Zap className="w-5 h-5 text-primary fill-primary" />
              Subscription & Membership Plan
            </h3>
            <Link
              to="/pricing"
              className="text-xs font-bold text-primary hover:text-primary-dark flex items-center gap-1"
            >
              View All Plans <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-gray-900">
                  {entitlement?.plan_name || (user?.is_admin ? "Admin Master Access" : "Free Starter Plan")}
                </span>
                {entitlement?.is_lifetime ? (
                  <span className="px-2 py-0.5 bg-green-100 text-green-800 text-[11px] font-black rounded-full uppercase">
                    Lifetime Unlocked
                  </span>
                ) : entitlement?.has_active_entitlement ? (
                  <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-[11px] font-black rounded-full uppercase">
                    Active Pro
                  </span>
                ) : (
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[11px] font-bold rounded-full uppercase">
                    Free Tier
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {entitlement?.is_lifetime
                  ? "Full unlimited lifetime access to all mock tests, PYQ databases, and AI tutor features."
                  : entitlement?.days_remaining !== undefined
                  ? `${entitlement.days_remaining} days remaining on current plan.`
                  : "Upgrade to LearnMate Pro for unrestricted access to all CBT mocks and AI explanations."}
              </p>
            </div>

            <Link
              to="/pricing"
              className="px-4 py-2 bg-primary hover:bg-primary-dark text-white text-xs font-bold rounded-xl shadow-xs transition-colors shrink-0"
            >
              {entitlement?.has_active_entitlement ? "Manage / Upgrade" : "Upgrade to Pro"}
            </Link>
          </div>
        </div>

        <div className="card mb-6">
          <h3 className="font-semibold text-lg border-b pb-4 mb-4">Profile Information</h3>

          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-2xl">
                {user?.full_name?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div>
                <div className="font-medium text-lg">{user?.full_name || 'SSC JE Aspirant'}</div>
                <div className="text-slate-500">{user?.email}</div>
              </div>
            </div>

            <div className="grid gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input type="text" disabled value={user?.full_name || ''} className="w-full pl-10 pr-4 py-2 border rounded-lg bg-slate-50 text-slate-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input type="email" disabled value={user?.email || ''} className="w-full pl-10 pr-4 py-2 border rounded-lg bg-slate-50 text-slate-500" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="card mb-6">
          <h3 className="font-semibold text-lg border-b pb-4 mb-4 flex items-center gap-2">
            <Shield size={18} /> Account Security
          </h3>
          <div className="flex justify-between items-center py-2">
            <div>
              <div className="font-medium">Password</div>
              <div className="text-sm text-slate-500">Change your password to keep your account secure</div>
            </div>
            <button className="px-4 py-2 border rounded-lg hover:bg-slate-50 text-sm font-medium">Update</button>
          </div>
        </div>

        <div className="card mb-8">
          <h3 className="font-semibold text-lg border-b pb-4 mb-4 flex items-center gap-2">
            <Bell size={18} /> Preferences
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <div className="font-medium">Daily Reminders</div>
                <div className="text-sm text-slate-500">Get a reminder to maintain your study streak</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={logout}
            className="px-6 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg font-medium transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
