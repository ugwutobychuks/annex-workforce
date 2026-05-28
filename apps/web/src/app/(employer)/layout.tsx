import { DashboardShell } from '@/components/dashboard-shell';

export default function EmployerLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}
