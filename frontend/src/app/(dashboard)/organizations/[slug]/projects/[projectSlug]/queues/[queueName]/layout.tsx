'use client';

import { use } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { queueApi } from '@/lib/queue-api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Layers, ArrowLeft, Play, Pause, Trash2, ListTodo } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

const tabs = [
  { label: 'Overview', href: '', icon: Layers },
  { label: 'Jobs', href: '/jobs', icon: ListTodo },
];

export default function QueueLayout({ params, children }: { params: Promise<{ slug: string; projectSlug: string; queueName: string }>; children: React.ReactNode }) {
  const { slug, projectSlug, queueName } = use(params);
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const decodedName = decodeURIComponent(queueName);

  const basePath = `/organizations/${slug}/projects/${projectSlug}/queues/${queueName}`;

  const { data: queue, isLoading } = useQuery({
    queryKey: ['queue', slug, projectSlug, decodedName],
    queryFn: () => queueApi.findByName(slug, projectSlug, decodedName),
  });

  const pauseMutation = useMutation({
    mutationFn: () => queueApi.pause(slug, projectSlug, decodedName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queue', slug, projectSlug, decodedName] });
      toast.success('Queue paused');
    },
  });

  const resumeMutation = useMutation({
    mutationFn: () => queueApi.resume(slug, projectSlug, decodedName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queue', slug, projectSlug, decodedName] });
      toast.success('Queue resumed');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => queueApi.remove(slug, projectSlug, decodedName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['queues', slug, projectSlug] });
      toast.success('Queue deleted');
      router.push(`/organizations/${slug}/projects/${projectSlug}/queues`);
    },
  });

  const activeTab = pathname === basePath ? '' : '/jobs';

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!queue) return null;

  return (
    <div className="mx-auto max-w-4xl p-8">
      <Link
        href={`/organizations/${slug}/projects/${projectSlug}/queues`}
        className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to queues
      </Link>

      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-semibold">{queue.name}</h1>
          <Badge variant={queue.status === 'ACTIVE' ? 'default' : 'secondary'}>
            {queue.status}
          </Badge>
        </div>
        <div className="flex gap-2">
          {queue.status === 'ACTIVE' ? (
            <Button variant="outline" onClick={() => pauseMutation.mutate()} isLoading={pauseMutation.isPending}>
              <Pause className="mr-2 h-4 w-4" />
              Pause
            </Button>
          ) : (
            <Button variant="outline" onClick={() => resumeMutation.mutate()} isLoading={resumeMutation.isPending}>
              <Play className="mr-2 h-4 w-4" />
              Resume
            </Button>
          )}
          <Button variant="destructive" onClick={() => deleteMutation.mutate()} isLoading={deleteMutation.isPending}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
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
