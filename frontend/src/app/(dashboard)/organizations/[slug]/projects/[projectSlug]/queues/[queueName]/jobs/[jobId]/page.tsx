'use client';

import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { jobApi } from '@/lib/job-api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, RotateCcw, CircleX, Trash2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export default function JobDetailPage({ params }: { params: Promise<{ slug: string; projectSlug: string; queueName: string; jobId: string }> }) {
  const { slug, projectSlug, queueName, jobId } = use(params);
  const decodedName = decodeURIComponent(queueName);
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: job, isLoading } = useQuery({
    queryKey: ['job', slug, projectSlug, decodedName, jobId],
    queryFn: () => jobApi.findById(slug, projectSlug, decodedName, jobId),
  });

  const retryMutation = useMutation({
    mutationFn: () => jobApi.retry(slug, projectSlug, decodedName, jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job', slug, projectSlug, decodedName, jobId] });
      toast.success('Job queued for retry');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () => jobApi.cancel(slug, projectSlug, decodedName, jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job', slug, projectSlug, decodedName, jobId] });
      toast.success('Job cancelled');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => jobApi.remove(slug, projectSlug, decodedName, jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs', slug, projectSlug, decodedName] });
      toast.success('Job deleted');
      router.push(`/organizations/${slug}/projects/${projectSlug}/queues/${queueName}/jobs`);
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!job) return null;

  const statusColors: Record<string, string> = {
    QUEUED: 'default', SCHEDULED: 'secondary', CLAIMED: 'outline',
    RUNNING: 'default', COMPLETED: 'default', FAILED: 'destructive', CANCELLED: 'secondary',
  };
  const canCancel = ['QUEUED', 'SCHEDULED'].includes(job.status);
  const canRetry = job.status === 'FAILED';

  return (
    <div className="mx-auto max-w-4xl p-8">
      <Link
        href={`/organizations/${slug}/projects/${projectSlug}/queues/${queueName}/jobs`}
        className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to jobs
      </Link>

      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold font-mono">#{job.id.slice(0, 8)}</h1>
          <Badge variant={(statusColors[job.status] || 'default') as any}>{job.status}</Badge>
          <Badge variant="outline">{job.type}</Badge>
        </div>
        <div className="flex gap-2">
          {canRetry && (
            <Button variant="outline" onClick={() => retryMutation.mutate()} isLoading={retryMutation.isPending}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          )}
          {canCancel && (
            <Button variant="outline" onClick={() => cancelMutation.mutate()} isLoading={cancelMutation.isPending}>
              <CircleX className="mr-2 h-4 w-4" />
              Cancel
            </Button>
          )}
          <Button variant="destructive" onClick={() => deleteMutation.mutate()} isLoading={deleteMutation.isPending}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">ID</span>
              <p className="font-mono">{job.id}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Attempts</span>
              <p>{job.attempts} / {job.maxRetries}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Priority</span>
              <p>{job.priority}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Created</span>
              <p>{new Date(job.createdAt).toLocaleString()}</p>
            </div>
            {job.runAt && (
              <div>
                <span className="text-muted-foreground">Run at</span>
                <p>{new Date(job.runAt).toLocaleString()}</p>
              </div>
            )}
            {job.claimedBy && (
              <div>
                <span className="text-muted-foreground">Claimed by</span>
                <p className="font-mono">{job.claimedBy}</p>
              </div>
            )}
            {job.completedAt && (
              <div>
                <span className="text-muted-foreground">Completed</span>
                <p>{new Date(job.completedAt).toLocaleString()}</p>
              </div>
            )}
            {job.failedAt && (
              <div>
                <span className="text-muted-foreground">Failed</span>
                <p>{new Date(job.failedAt).toLocaleString()}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Payload</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="overflow-auto rounded bg-muted p-3 text-xs font-mono">
              {JSON.stringify(job.payload, null, 2)}
            </pre>
          </CardContent>
        </Card>

        {job.executionLogs && job.executionLogs.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Execution Logs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {job.executionLogs.map((log) => (
                <div key={log.id} className="rounded bg-muted p-2 text-xs font-mono">
                  <span className="text-muted-foreground">[{new Date(log.createdAt).toISOString()}]</span>{' '}
                  <span className="font-semibold">{log.level}</span> {log.message}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {job.retryHistory && job.retryHistory.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Retry History</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {job.retryHistory.map((r) => (
                <div key={r.id} className="flex justify-between rounded bg-muted p-2">
                  <span>Attempt #{r.attempt}</span>
                  <span className="text-muted-foreground">{r.reason || 'No reason'}</span>
                  <span className="text-muted-foreground">{r.delayMs}ms delay</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
