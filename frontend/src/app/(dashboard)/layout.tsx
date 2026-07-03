'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import { Loader2, LayoutDashboard, Building2, Settings, Users, LogOut, FolderKanban, Server } from 'lucide-react';
import { useAuthBootstrap } from '@/hooks/use-auth';
import { useAuthStore } from '@/store/auth-store';
import { useAuth } from '@/hooks/use-auth';
import { OrganizationSelector } from '@/components/organizations/organization-selector';
import { useOrganizationStore } from '@/store/organization-store';
import { Button } from '@/components/ui/button';
import { PulseMark } from '@/components/layout/pulse-mark';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/workers', label: 'Workers', icon: Server },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  useAuthBootstrap();
  const router = useRouter();
  const pathname = usePathname();
  const { accessToken, isHydrated } = useAuthStore();
  const { logout } = useAuth();
  const { currentOrganization } = useOrganizationStore();

  useEffect(() => {
    if (isHydrated && !accessToken) {
      router.replace('/login');
    }
  }, [isHydrated, accessToken, router]);

  if (!isHydrated) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!accessToken) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-64 flex-col border-r border-border bg-card lg:flex">
        <div className="flex items-center gap-2 border-b border-border px-6 py-4">
          <PulseMark className="h-5 w-5" />
          <span className="font-mono text-sm font-semibold tracking-wide">pulse</span>
        </div>

        <div className="px-3 py-3">
          <OrganizationSelector />
        </div>

        <nav className="flex-1 space-y-1 px-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? 'bg-muted font-medium text-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}

          {currentOrganization && (
            <>
              <p className="px-3 pt-4 pb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Organization
              </p>
              <Link
                href={`/organizations/${currentOrganization.slug}`}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                  pathname === `/organizations/${currentOrganization.slug}`
                    ? 'bg-muted font-medium text-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <Building2 className="h-4 w-4" />
                Overview
              </Link>
              <Link
                href={`/organizations/${currentOrganization.slug}/projects`}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                  pathname.startsWith(`/organizations/${currentOrganization.slug}/projects`)
                    ? 'bg-muted font-medium text-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <FolderKanban className="h-4 w-4" />
                Projects
              </Link>
              <Link
                href={`/organizations/${currentOrganization.slug}/members`}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                  pathname === `/organizations/${currentOrganization.slug}/members`
                    ? 'bg-muted font-medium text-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <Users className="h-4 w-4" />
                Members
              </Link>
              <Link
                href={`/organizations/${currentOrganization.slug}/settings`}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                  pathname === `/organizations/${currentOrganization.slug}/settings`
                    ? 'bg-muted font-medium text-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <Settings className="h-4 w-4" />
                Settings
              </Link>
            </>
          )}
        </nav>

        <div className="border-t border-border p-3">
          <Button variant="ghost" className="w-full justify-start text-muted-foreground" onClick={() => logout()}>
            <LogOut className="mr-2 h-4 w-4" />
            Log out
          </Button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
