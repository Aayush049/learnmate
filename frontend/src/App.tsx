import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AdminRoute } from './components/auth/AdminRoute';
import { LandingPage } from './pages/public/LandingPage';
import { LoginPage } from './pages/public/LoginPage';
import { RegisterPage } from './pages/public/RegisterPage';

// Admin Pages
import { AdminLayout } from './components/layout/AdminLayout';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminHierarchyPage } from './pages/admin/AdminHierarchyPage';
import { AdminQuestionsPage } from './pages/admin/AdminQuestionsPage';
import { AdminMockTestsPage } from './pages/admin/AdminMockTestsPage';
import { AdminUsersPage } from './pages/admin/AdminUsersPage';

// Collab Pages (Friend's UI)
import CollabLayout from './collab/components/layout/Layout';
import CollabDashboard from './collab/components/dashboard/Dashboard';
import MyTextbook from './collab/components/learn/MyTextbook';
import Topics from './collab/components/learn/Topics';
import TopicContent from './collab/components/learn/TopicContent';
import PracticeQuestions from './collab/components/learn/PracticeQuestions';
import AITutor from './collab/components/learn/AITutor';
import CollabMockTest from './collab/components/test/MockTest';
import Progress from './collab/pages/Progress';
import Performance from './collab/pages/Performance';
import Bookmarks from './collab/pages/Bookmarks';
import SettingsPage from './collab/components/settings/SettingsPage';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Admin Routes */}
            <Route element={<AdminRoute />}>
              <Route element={<AdminLayout />}>
                <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
                <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
                <Route path="/admin/users" element={<AdminUsersPage />} />
                <Route path="/admin/hierarchy" element={<AdminHierarchyPage />} />
                <Route path="/admin/questions" element={<AdminQuestionsPage />} />
                <Route path="/admin/mock-tests" element={<AdminMockTestsPage />} />
              </Route>
            </Route>

            {/* Protected Student Routes (Friend's UI Integrated) */}
            <Route
              element={
                <ProtectedRoute>
                  <CollabLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<CollabDashboard />} />

              <Route path="/learn/textbook" element={<MyTextbook />} />
              <Route path="/learn/topics" element={<Topics />} />
              <Route path="/learn/topic/:id" element={<TopicContent />} />
              <Route path="/learn/practice" element={<PracticeQuestions />} />
              <Route path="/learn/ai-tutor" element={<AITutor />} />
              <Route path="/test/mock" element={<CollabMockTest />} />

              <Route path="/track/progress" element={<Progress />} />
              <Route path="/track/performance" element={<Performance />} />
              <Route path="/resources/bookmarks" element={<Bookmarks />} />

              <Route path="/settings/profile" element={<SettingsPage section="profile" />} />
              <Route path="/settings/preferences" element={<SettingsPage section="preferences" />} />
              <Route path="/settings/security" element={<SettingsPage section="security" />} />
            </Route>
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
