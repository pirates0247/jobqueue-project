'use client';

import { use } from 'react';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { organizationApi } from '@/lib/organization-api';
import { useOrganizationStore } from '@/store/organization-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, UserPlus, Shield, ShieldAlert, ShieldCheck, Eye } from 'lucide-react';

const roleIcons: Record<string, typeof Shield> = {
  OWNER: ShieldAlert,
  ADMIN: ShieldCheck,
  DEVELOPER: Shield,
  VIEWER: Eye,
};

const roleColors: Record<string, string> = {
  OWNER: 'text-destructive',
  ADMIN: 'text-primary',
  DEVELOPER: 'text-muted-foreground',
  VIEWER: 'text-muted-foreground',
};

export default function OrganizationMembersPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const queryClient = useQueryClient();
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('DEVELOPER');
  const { currentOrganization } = useOrganizationStore();

  const { data: members, isLoading } = useQuery({
    queryKey: ['organization-members', slug],
    queryFn: () => organizationApi.getMembers(slug),
  });

  const inviteMutation = useMutation({
    mutationFn: () => organizationApi.inviteMember(slug, { email: inviteEmail, role: inviteRole }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-members', slug] });
      toast.success('Member invited');
      setInviteEmail('');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? 'Invitation failed');
    },
  });

  const removeMutation = useMutation({
    mutationFn: (memberId: string) => organizationApi.removeMember(slug, memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-members', slug] });
      toast.success('Member removed');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? 'Failed to remove member');
    },
  });

  const isOwner = currentOrganization?.role === 'OWNER';
  const isAdmin = currentOrganization?.role === 'ADMIN' || isOwner;
  const canManage = isOwner || isAdmin;

  return (
    <div className="mx-auto max-w-3xl p-8">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Members</CardTitle>
          <CardDescription>Manage team members and their roles.</CardDescription>
        </CardHeader>
        <CardContent>
          {canManage && (
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1">
                <Label htmlFor="invite-email">Invite by email</Label>
                <Input
                  id="invite-email"
                  placeholder="colleague@company.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>
              <div className="w-32">
                <Label htmlFor="invite-role">Role</Label>
                <select
                  id="invite-role"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                >
                  <option value="DEVELOPER">Developer</option>
                  <option value="ADMIN">Admin</option>
                  <option value="VIEWER">Viewer</option>
                </select>
              </div>
              <Button
                onClick={() => inviteMutation.mutate()}
                isLoading={inviteMutation.isPending}
                disabled={!inviteEmail}
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Invite
              </Button>
            </div>
          )}

          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : (
            <div className="space-y-2">
              {members?.map((member) => {
                const RoleIcon = roleIcons[member.role] ?? Shield;
                return (
                  <div
                    key={member.id}
                    className="flex items-center justify-between rounded-lg border border-border px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-medium">
                        {member.firstName[0]}{member.lastName[0]}
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {member.firstName} {member.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground">{member.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <RoleIcon className={`h-4 w-4 ${roleColors[member.role] ?? ''}`} />
                      <span className="text-xs font-medium capitalize">{member.role.toLowerCase()}</span>
                      {canManage && member.role !== 'OWNER' && (
                        <button
                          onClick={() => removeMutation.mutate(member.id)}
                          className="ml-2 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
