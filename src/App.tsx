import { BrowserRouter, Route, Routes } from "react-router-dom";
import { DefaultProviders } from "./components/providers/default.tsx";
import AuthCallback from "./pages/auth/Callback.tsx";
import Login from "./pages/auth/Login.tsx";
import HomePage from "./pages/home/page.tsx";
import NotFound from "./pages/NotFound.tsx";
import AuthDialog from "./components/auth-dialog.tsx";
import { AuthDialogProvider } from "./hooks/use-auth-dialog.tsx";
import RoleSelect from "./pages/onboarding/RoleSelect.tsx";
import CandidateLayout from "./pages/candidate/layout.tsx";
import CandidateDashboard from "./pages/candidate/dashboard/page.tsx";
import CandidateProfile from "./pages/candidate/profile/page.tsx";
import MyApplications from "./pages/candidate/applications/page.tsx";
import MyPayslips from "./pages/candidate/payslips/page.tsx";
import PublicLayout from "./pages/public/layout.tsx";
import PublicJobs from "./pages/public/jobs/page.tsx";
import PublicJobDetail from "./pages/public/jobs/[id]/page.tsx";
import EmployerLayout from "./pages/employer/layout.tsx";
import EmployerDashboard from "./pages/employer/dashboard/page.tsx";
import CompanyProfile from "./pages/employer/company/page.tsx";
import JobPostings from "./pages/employer/jobs/page.tsx";
import ApplicantsPage from "./pages/employer/applicants/page.tsx";
import TalentPool from "./pages/employer/talent/page.tsx";
import PayrollPage from "./pages/employer/payroll/page.tsx";
import PayrollRunDetail from "./pages/employer/payroll/runs/[id]/page.tsx";
import AdminLayout from "./pages/admin/layout.tsx";
import AdminDashboard from "./pages/admin/dashboard/page.tsx";
import AdminUsers from "./pages/admin/users/page.tsx";
import AdminVerification from "./pages/admin/verification/page.tsx";
import AdminAnalytics from "./pages/admin/analytics/page.tsx";
import SettingsPage from "./pages/settings/page.tsx";
import MessagesInbox from "./pages/messages/page.tsx";
import ThreadView from "./pages/messages/[id]/page.tsx";
import InterviewsPage from "./pages/interviews/page.tsx";
import EmployerAssessments from "./pages/employer/assessments/page.tsx";
import EmployerAssessmentDetail from "./pages/employer/assessments/[id]/page.tsx";
import CandidateAssessments from "./pages/candidate/assessments/page.tsx";
import TakeAssessment from "./pages/candidate/assessments/[id]/take/page.tsx";
import BillingPage from "./pages/employer/billing/page.tsx";

export default function App() {
  return (
    <DefaultProviders>
      <BrowserRouter>
        <AuthDialogProvider>
          <AuthDialog />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/onboarding/role" element={<RoleSelect />} />

          {/* Public marketplace — no auth needed to browse */}
          <Route element={<PublicLayout />}>
            <Route path="/jobs" element={<PublicJobs />} />
            <Route path="/jobs/:id" element={<PublicJobDetail />} />
          </Route>

          {/* Candidate routes */}
          <Route path="/candidate" element={<CandidateLayout />}>
            <Route index element={<CandidateDashboard />} />
            <Route path="profile" element={<CandidateProfile />} />
            <Route path="applications" element={<MyApplications />} />
            <Route path="payslips" element={<MyPayslips />} />
            <Route path="messages" element={<MessagesInbox />} />
            <Route path="messages/:id" element={<ThreadView />} />
            <Route path="interviews" element={<InterviewsPage />} />
            <Route path="assessments" element={<CandidateAssessments />} />
            <Route path="assessments/:id/take" element={<TakeAssessment />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          {/* Employer routes */}
          <Route path="/employer" element={<EmployerLayout />}>
            <Route index element={<EmployerDashboard />} />
            <Route path="company" element={<CompanyProfile />} />
            <Route path="jobs" element={<JobPostings />} />
            <Route path="applicants" element={<ApplicantsPage />} />
            <Route path="talent" element={<TalentPool />} />
            <Route path="payroll" element={<PayrollPage />} />
            <Route path="payroll/runs/:id" element={<PayrollRunDetail />} />
            <Route path="messages" element={<MessagesInbox />} />
            <Route path="messages/:id" element={<ThreadView />} />
            <Route path="interviews" element={<InterviewsPage />} />
            <Route path="assessments" element={<EmployerAssessments />} />
            <Route path="assessments/:id" element={<EmployerAssessmentDetail />} />
            <Route path="billing" element={<BillingPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          {/* Admin routes */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="verification" element={<AdminVerification />} />
            <Route path="analytics" element={<AdminAnalytics />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        </AuthDialogProvider>
      </BrowserRouter>
    </DefaultProviders>
  );
}
