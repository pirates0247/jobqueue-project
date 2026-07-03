'use client';

import { use } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { queueApi } from '@/lib/queue-api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Layers, Play, Pause } from 'lucide-react';

export default function QueuesPage({ params }: { params: Promise<{ slug: string; projectSlug: string }> }) {
  const { slug, projectSlug } = use(params);

  const { data, isLoading } = useQuery({
    queryKey: ['queues', slug, projectSlug],
    queryFn: () => queueApi.findAll(slug, projectSlug),
  });

  return (
    <div className="mx-auto max-w-4xl p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Queues</h1>
          <p className="text-sm text-muted-foreground">Manage queues for this project.</p>
        </div>
        <Link href={`/organizations/${slug}/projects/${projectSlug}/queues/new`}>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New queue
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {data?.queues.map((queue) => (
            <Link
              key={queue.id}
              href={`/organizations/${slug}/projects/${projectSlug}/queues/${encodeURIComponent(queue.name)}`}
            >
              <Card className="transition-colors hover:bg-muted/50">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-primary" />
                    <CardTitle className="text-base">{queue.name}</CardTitle>
                  </div>
                  <Badge variant={queue.status === 'ACTIVE' ? 'default' : 'secondary'}>
                    {queue.status === 'ACTIVE' ? <Play className="mr-1 h-3 w-3" /> : <Pause className="mr-1 h-3 w-3" />}
                    {queue.status}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span>Priority: {queue.priority}</span>
                    <span>Concurrency: {queue.concurrencyLimit}</span>
                    <span>Retries: {queue.maxRetries}</span>
                    <span>Jobs: {queue._count?.jobs ?? 0}</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
