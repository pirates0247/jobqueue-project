'use client';

import { use } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { organizationApi } from '@/lib/organization-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const updateOrgSchema = z.object({
  name: z.string().min(2).max(100),
});

type UpdateOrgFormValues = z.infer<typeof updateOrgSchema>;

export default function OrganizationSettingsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const queryClient = useQueryClient();

  const { data: org, isLoading } = useQuery({
    queryKey: ['organization', slug],
    queryFn: () => organizationApi.findBySlug(slug),
  });

  const { register, handleSubmit, formState: { errors } } = useForm<UpdateOrgFormValues>({
    resolver: zodResolver(updateOrgSchema),
    values: org ? { name: org.name } : undefined,
  });

  const mutation = useMutation({
    mutationFn: (values: UpdateOrgFormValues) => organizationApi.update(slug, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization', slug] });
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      toast.success('Organization updated');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? 'Update failed');
    },
  });

  if (isLoading) return null;

  return (
    <div className="mx-auto max-w-lg p-8">
      <Card>
        <CardHeader>
          <CardTitle>Organization settings</CardTitle>
          <CardDescription>Update your organization details.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-col gap-4"
            onSubmit={handleSubmit((values) => mutation.mutate(values))}
            noValidate
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">Organization name</Label>
              <Input id="name" {...register('name')} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Slug</Label>
              <Input value={org?.slug ?? ''} disabled />
            </div>

            <Button type="submit" className="mt-2" isLoading={mutation.isPending}>
              Save changes
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
