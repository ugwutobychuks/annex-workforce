import { DashboardShell } from '@/components/dashboard-shell';

export default function TalentLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}
