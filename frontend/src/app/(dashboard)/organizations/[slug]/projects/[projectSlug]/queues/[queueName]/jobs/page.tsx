'use client';

import { use } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { jobApi } from '@/lib/job-api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Play, CircleX, RotateCcw, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export default function JobsPage({ params }: { params: Promise<{ slug: string; projectSlug: string; queueName: string }> }) {
  const { slug, projectSlug, queueName } = use(params);
  const decodedName = decodeURIComponent(queueName);
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['jobs', slug, projectSlug, decodedName, statusFilter],
    queryFn: () => jobApi.findAll(slug, projectSlug, decodedName, { status: statusFilter || undefined }),
  });

  const retryMutation = useMutation({
    mutationFn: (jobId: string) => jobApi.retry(slug, projectSlug, decodedName, jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs', slug, projectSlug, decodedName] });
      toast.success('Job queued for retry');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (jobId: string) => jobApi.cancel(slug, projectSlug, decodedName, jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs', slug, projectSlug, decodedName] });
      toast.success('Job cancelled');
    },
  });

  const statusColors: Record<string, string> = {
    QUEUED: 'default',
    SCHEDULED: 'secondary',
    CLAIMED: 'outline',
    RUNNING: 'default',
    COMPLETED: 'default',
    FAILED: 'destructive',
    CANCELLED: 'secondary',
  };

  return (
    <div className="mx-auto max-w-5xl p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Jobs</h1>
          <p className="text-sm text-muted-foreground">Queue: {decodedName}</p>
        </div>
        <Link href={`/organizations/${slug}/projects/${projectSlug}/queues/${queueName}/jobs/new`}>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New job
          </Button>
        </Link>
      </div>

      <div className="mb-4">
        <Label className="text-xs">Filter by status</Label>
        <Input
          placeholder="QUEUED, RUNNING, FAILED..."
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="max-w-xs"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {data?.jobs.map((job) => {
            const canCancel = ['QUEUED', 'SCHEDULED'].includes(job.status);
            const canRetry = job.status === 'FAILED';
            return (
              <Link
                key={job.id}
                href={`/organizations/${slug}/projects/${projectSlug}/queues/${queueName}/jobs/${job.id}`}
              >
                <Card className="transition-colors hover:bg-muted/50">
                  <CardHeader className="flex flex-row items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <Play className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <CardTitle className="text-sm font-medium">{job.type}</CardTitle>
                        <p className="text-xs text-muted-foreground font-mono">#{job.id.slice(0, 8)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={(statusColors[job.status] || 'default') as any}>{job.status}</Badge>
                      <span className="text-xs text-muted-foreground">{job.attempts}/{job.maxRetries}</span>
                      {canRetry && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e) => { e.preventDefault(); retryMutation.mutate(job.id); }}
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {canCancel && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e) => { e.preventDefault(); cancelMutation.mutate(job.id); }}
                        >
                          <CircleX className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
