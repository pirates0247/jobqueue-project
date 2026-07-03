'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { queueApi } from '@/lib/queue-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const createQueueSchema = z.object({
  name: z.string().min(1).max(100),
  priority: z.coerce.number().int().min(0).max(10).optional(),
  concurrencyLimit: z.coerce.number().int().min(1).max(100).optional(),
  retryStrategy: z.enum(['FIXED', 'LINEAR', 'EXPONENTIAL']).optional(),
  maxRetries: z.coerce.number().int().min(0).max(100).optional(),
  baseRetryDelayMs: z.coerce.number().int().min(0).max(3600000).optional(),
});

type CreateQueueFormValues = z.infer<typeof createQueueSchema>;

export default function CreateQueuePage({ params }: { params: Promise<{ slug: string; projectSlug: string }> }) {
  const { slug, projectSlug } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<CreateQueueFormValues>({
    resolver: zodResolver(createQueueSchema),
    defaultValues: {
      priority: 0,
      concurrencyLimit: 5,
      retryStrategy: 'EXPONENTIAL',
      maxRetries: 3,
      baseRetryDelayMs: 1000,
    },
  });

  const mutation = useMutation({
    mutationFn: (values: CreateQueueFormValues) => queueApi.create(slug, projectSlug, values),
    onSuccess: (queue) => {
      queryClient.invalidateQueries({ queryKey: ['queues', slug, projectSlug] });
      toast.success('Queue created');
      router.push(`/organizations/${slug}/projects/${projectSlug}/queues/${encodeURIComponent(queue.name)}`);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? 'Failed to create queue');
    },
  });

  return (
    <div className="mx-auto max-w-lg p-8">
      <Card>
        <CardHeader>
          <CardTitle>Create queue</CardTitle>
          <CardDescription>Add a new queue to this project.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4" onSubmit={handleSubmit((v) => mutation.mutate(v))} noValidate>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">Queue name</Label>
              <Input id="name" placeholder="my-queue" {...register('name')} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="priority">Priority</Label>
                <Input id="priority" type="number" {...register('priority')} />
                {errors.priority && <p className="text-xs text-destructive">{errors.priority.message}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="concurrencyLimit">Concurrency</Label>
                <Input id="concurrencyLimit" type="number" {...register('concurrencyLimit')} />
                {errors.concurrencyLimit && <p className="text-xs text-destructive">{errors.concurrencyLimit.message}</p>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="maxRetries">Max retries</Label>
                <Input id="maxRetries" type="number" {...register('maxRetries')} />
                {errors.maxRetries && <p className="text-xs text-destructive">{errors.maxRetries.message}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="baseRetryDelayMs">Retry delay (ms)</Label>
                <Input id="baseRetryDelayMs" type="number" {...register('baseRetryDelayMs')} />
                {errors.baseRetryDelayMs && <p className="text-xs text-destructive">{errors.baseRetryDelayMs.message}</p>}
              </div>
            </div>
            <Button type="submit" className="mt-2" isLoading={mutation.isPending}>
              Create queue
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
