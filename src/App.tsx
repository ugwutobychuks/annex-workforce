import { BrowserRouter, Route, Routes } from "react-router-dom";
import { DefaultProviders } from "./components/providers/default.tsx";
import AuthCallback from "./pages/auth/Callback.tsx";
import Login from "./pages/auth/Login.tsx";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import RoleSelect from "./pages/onboarding/RoleSelect.tsx";
import CandidateLayout from "./pages/candidate/layout.tsx";
import CandidateDashboard from "./pages/candidate/dashboard/page.tsx";
import CandidateProfile from "./pages/candidate/profile/page.tsx";
import BrowseJobs from "./pages/candidate/jobs/page.tsx";
import JobDetail from "./pages/candidate/jobs/[id]/page.tsx";
import MyApplications from "./pages/candidate/applications/page.tsx";
import MyPayslips from "./pages/candidate/payslips/page.tsx";
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

export default function App() {
  return (
    <DefaultProviders>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/onboarding/role" element={<RoleSelect />} />

          {/* Candidate routes */}
          <Route path="/candidate" element={<CandidateLayout />}>
            <Route index element={<CandidateDashboard />} />
            <Route path="profile" element={<CandidateProfile />} />
            <Route path="jobs" element={<BrowseJobs />} />
            <Route path="jobs/:id" element={<JobDetail />} />
            <Route path="applications" element={<MyApplications />} />
            <Route path="payslips" element={<MyPayslips />} />
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
          </Route>

          {/* Admin routes */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="verification" element={<AdminVerification />} />
            <Route path="analytics" element={<AdminAnalytics />} />
          </Route>

          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </DefaultProviders>
  );
}
