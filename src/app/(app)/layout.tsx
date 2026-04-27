import { AuthShell } from "@/components/layout/auth-shell";

type AppLayoutProps = {
  children: React.ReactNode;
};

export default function AppLayout({ children }: AppLayoutProps) {
  return <AuthShell>{children}</AuthShell>;
}
