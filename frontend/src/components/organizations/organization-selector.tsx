'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ChevronsUpDown, Plus, Building2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { organizationApi } from '@/lib/organization-api';
import { useOrganizationStore } from '@/store/organization-store';
import { cn } from '@/lib/utils';

export function OrganizationSelector() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { currentOrganization, setCurrentOrganization, setOrganizations } = useOrganizationStore();

  const { data: organizations } = useQuery({
    queryKey: ['organizations'],
    queryFn: organizationApi.findAll,
  });

  useEffect(() => {
    if (organizations) {
      setOrganizations(organizations);
      if (!currentOrganization && organizations.length > 0) {
        setCurrentOrganization(organizations[0]);
      }
    }
  }, [organizations, currentOrganization, setCurrentOrganization, setOrganizations]);

  if (!currentOrganization) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm transition-colors hover:bg-muted"
      >
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <span className="flex-1 text-left font-medium">{currentOrganization.name}</span>
        <ChevronsUpDown className="h-3 w-3 text-muted-foreground" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-lg border border-border bg-popover shadow-lg">
            {organizations?.map((org) => (
              <button
                key={org.id}
                onClick={() => {
                  setCurrentOrganization(org);
                  setOpen(false);
                  router.push(`/organizations/${org.slug}`);
                }}
                className={cn(
                  'flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-muted',
                  org.id === currentOrganization?.id && 'bg-muted font-medium',
                )}
              >
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="flex-1">{org.name}</span>
                {org.id === currentOrganization?.id && <Check className="h-3 w-3 text-primary" />}
              </button>
            ))}
            <div className="border-t border-border" />
            <button
              onClick={() => {
                setOpen(false);
                router.push('/organizations/new');
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-muted"
            >
              <Plus className="h-4 w-4" />
              <span>Create organization</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
