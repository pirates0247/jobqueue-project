import { apiClient } from './api-client';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  role: string;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Member {
  id: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  createdAt: string;
}

export interface CreateOrganizationPayload {
  name: string;
  slug: string;
}

export interface InviteMemberPayload {
  email: string;
  role: string;
}

export interface UpdateMemberRolePayload {
  role: string;
}

export const organizationApi = {
  async findAll(): Promise<Organization[]> {
    const { data } = await apiClient.get('/organizations');
    return data.data;
  },

  async findBySlug(slug: string): Promise<Organization> {
    const { data } = await apiClient.get(`/organizations/${slug}`);
    return data.data;
  },

  async create(payload: CreateOrganizationPayload): Promise<Organization> {
    const { data } = await apiClient.post('/organizations', payload);
    return data.data;
  },

  async update(slug: string, payload: { name: string }): Promise<Organization> {
    const { data } = await apiClient.put(`/organizations/${slug}`, payload);
    return data.data;
  },

  async remove(slug: string): Promise<void> {
    await apiClient.delete(`/organizations/${slug}`);
  },

  async getMembers(slug: string): Promise<Member[]> {
    const { data } = await apiClient.get(`/organizations/${slug}/members`);
    return data.data;
  },

  async inviteMember(slug: string, payload: InviteMemberPayload): Promise<Member> {
    const { data } = await apiClient.post(`/organizations/${slug}/members`, payload);
    return data.data;
  },

  async updateMemberRole(slug: string, memberId: string, payload: UpdateMemberRolePayload): Promise<Member> {
    const { data } = await apiClient.put(`/organizations/${slug}/members/${memberId}`, payload);
    return data.data;
  },

  async removeMember(slug: string, memberId: string): Promise<void> {
    await apiClient.delete(`/organizations/${slug}/members/${memberId}`);
  },
};
