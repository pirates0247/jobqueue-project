'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { jobApi } from '@/lib/job-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const createJobSchema = z.object({
  type: z.enum(['IMMEDIATE', 'DELAYED', 'SCHEDULED', 'RECURRING', 'BATCH']).optional(),
  payload: z.string().min(1, 'Payload is required'),
  priority: z.coerce.number().int().min(0).max(10).optional(),
  maxRetries: z.coerce.number().int().min(0).max(100).optional(),
  cronExpression: z.string().optional(),
  runAt: z.string().optional(),
  idempotencyKey: z.string().optional(),
});

type CreateJobFormValues = z.infer<typeof createJobSchema>;

export default function CreateJobPage({ params }: { params: Promise<{ slug: string; projectSlug: string; queueName: string }> }) {
  const { slug, projectSlug, queueName } = use(params);
  const decodedName = decodeURIComponent(queueName);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { register, handleSubmit, formState: { errors } } = useForm<CreateJobFormValues>({
    resolver: zodResolver(createJobSchema),
    defaultValues: { type: 'IMMEDIATE', priority: 0, maxRetries: 3 },
  });

  const mutation = useMutation({
    mutationFn: (values: CreateJobFormValues) =>
      jobApi.create(slug, projectSlug, decodedName, {
        ...values,
        payload: JSON.parse(values.payload),
      }),
    onSuccess: (job) => {
      queryClient.invalidateQueries({ queryKey: ['jobs', slug, projectSlug, decodedName] });
      toast.success('Job created');
      router.push(`/organizations/${slug}/projects/${projectSlug}/queues/${queueName}/jobs/${job.id}`);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? 'Failed to create job');
    },
  });

  return (
    <div className="mx-auto max-w-lg p-8">
      <Card>
        <CardHeader>
          <CardTitle>Create job</CardTitle>
          <CardDescription>Add a new job to the queue.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4" onSubmit={handleSubmit((v) => {
            try {
              JSON.parse(v.payload);
              mutation.mutate(v);
            } catch {
              toast.error('Payload must be valid JSON');
            }
          })} noValidate>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="type">Type</Label>
              <Input id="type" placeholder="IMMEDIATE" {...register('type')} />
              {errors.type && <p className="text-xs text-destructive">{errors.type.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="payload">Payload (JSON)</Label>
              <Textarea id="payload" rows={5} placeholder='{"key": "value"}' {...register('payload')} />
              {errors.payload && <p className="text-xs text-destructive">{errors.payload.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="priority">Priority</Label>
                <Input id="priority" type="number" {...register('priority')} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="maxRetries">Max retries</Label>
                <Input id="maxRetries" type="number" {...register('maxRetries')} />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cronExpression">Cron expression (for SCHEDULED/RECURRING)</Label>
              <Input id="cronExpression" placeholder="*/5 * * * *" {...register('cronExpression')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="runAt">Run at (ISO date, for DELAYED)</Label>
              <Input id="runAt" type="datetime-local" {...register('runAt')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="idempotencyKey">Idempotency key (optional)</Label>
              <Input id="idempotencyKey" placeholder="unique-key" {...register('idempotencyKey')} />
            </div>
            <Button type="submit" className="mt-2" isLoading={mutation.isPending}>
              Create job
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
