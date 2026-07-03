'use client';

import { use } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { projectApi } from '@/lib/project-api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FolderKanban, Calendar, Layers } from 'lucide-react';

const tabs = [
  { label: 'Overview', href: '', icon: FolderKanban },
  { label: 'Queues', href: '/queues', icon: Layers },
];

export default function ProjectLayout({ params, children }: { params: Promise<{ slug: string; projectSlug: string }>; children: React.ReactNode }) {
  const { slug, projectSlug } = use(params);
  const pathname = usePathname();

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', slug, projectSlug],
    queryFn: () => projectApi.findBySlug(slug, projectSlug),
  });

  const basePath = `/organizations/${slug}/projects/${projectSlug}`;
  const activeTab = pathname === basePath ? '' : '/queues';

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!project) return null;

  return (
    <div className="mx-auto max-w-4xl p-8">
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <FolderKanban className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-semibold">{project.name}</h1>
        </div>
        {project.description && (
          <p className="mt-1 text-sm text-muted-foreground">{project.description}</p>
        )}
      </div>

      <div className="mb-6 flex gap-1 border-b">
        {tabs.map((tab) => {
          const href = tab.href ? `${basePath}${tab.href}` : basePath;
          const isActive = tab.href ? pathname.startsWith(href) : pathname === basePath;
          const Icon = tab.icon;
          return (
            <Link
              key={tab.label}
              href={href}
              className={`flex items-center gap-1.5 border-b-2 px-4 py-2 text-sm transition-colors ${
                isActive
                  ? 'border-primary font-medium text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </Link>
          );
        })}
      </div>

      {children}
    </div>
  );
}
