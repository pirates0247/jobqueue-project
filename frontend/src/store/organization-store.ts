import { create } from 'zustand';
import type { Organization, Member } from '@/lib/organization-api';

interface OrganizationState {
  organizations: Organization[];
  currentOrganization: Organization | null;
  members: Member[];
  isLoading: boolean;
  setOrganizations: (organizations: Organization[]) => void;
  setCurrentOrganization: (organization: Organization | null) => void;
  setMembers: (members: Member[]) => void;
  setLoading: (loading: boolean) => void;
}

export const useOrganizationStore = create<OrganizationState>((set) => ({
  organizations: [],
  currentOrganization: null,
  members: [],
  isLoading: false,
  setOrganizations: (organizations) => set({ organizations }),
  setCurrentOrganization: (currentOrganization) => set({ currentOrganization }),
  setMembers: (members) => set({ members }),
  setLoading: (isLoading) => set({ isLoading }),
}));
