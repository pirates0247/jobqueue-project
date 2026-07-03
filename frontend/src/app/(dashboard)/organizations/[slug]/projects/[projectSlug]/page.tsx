'use client';

import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { projectApi } from '@/lib/project-api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FolderKanban, Calendar } from 'lucide-react';

export default function ProjectOverviewPage({ params }: { params: Promise<{ slug: string; projectSlug: string }> }) {
  const { slug, projectSlug } = use(params);

  const { data: project } = useQuery({
    queryKey: ['project', slug, projectSlug],
    queryFn: () => projectApi.findBySlug(slug, projectSlug),
  });

  if (!project) return null;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Card>
        <CardHeader className="flex flex-row items-center gap-3 pb-2">
          <FolderKanban className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-sm font-medium">Slug</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="font-mono text-sm">{project.slug}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center gap-3 pb-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-sm font-medium">Created</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm">{new Date(project.createdAt).toLocaleDateString()}</p>
        </CardContent>
      </Card>
    </div>
  );
}
