'use client';

import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queueApi } from '@/lib/queue-api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function QueueOverviewPage({ params }: { params: Promise<{ slug: string; projectSlug: string; queueName: string }> }) {
  const { slug, projectSlug, queueName } = use(params);
  const decodedName = decodeURIComponent(queueName);

  const { data: queue } = useQuery({
    queryKey: ['queue', slug, projectSlug, decodedName],
    queryFn: () => queueApi.findByName(slug, projectSlug, decodedName),
  });

  const { data: stats } = useQuery({
    queryKey: ['queue-stats', slug, projectSlug, decodedName],
    queryFn: () => queueApi.stats(slug, projectSlug, decodedName),
    enabled: !!queue,
  });

  if (!queue) return null;

  return (
    <>
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Jobs</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats?.total ?? '-'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Priority</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{queue.priority}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Concurrency</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{queue.concurrencyLimit}</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Strategy</span>
              <span className="font-medium">{queue.retryStrategy}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Max retries</span>
              <span className="font-medium">{queue.maxRetries}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Base delay</span>
              <span className="font-medium">{queue.baseRetryDelayMs}ms</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Job Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {stats ? (
              <div className="space-y-2 text-sm">
                {Object.entries(stats.byStatus).map(([status, count]) => (
                  <div key={status} className="flex justify-between">
                    <span className="text-muted-foreground">{status}</span>
                    <span className="font-medium">{count as number}</span>
                  </div>
                ))}
                {Object.keys(stats.byStatus).length === 0 && (
                  <p className="text-muted-foreground">No jobs yet</p>
                )}
              </div>
            ) : (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
