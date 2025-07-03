export interface Lead {
  id: string;
  name: string;
  address?: string;
  stage?: string;
  owner?: string;
  secondaryAcquisition?: string;
  coordinates?: [number, number];
  phone: string;
  email: string;
  status: LeadStatus;
  notes: string;
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
}

export enum LeadStatus {
  NEW = 'NEW',
  ASSIGNED = 'ASSIGNED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export interface Location {
  latitude: number;
  longitude: number;
  address: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  currentLocation?: Location;
}

export enum UserRole {
  FIELD_AGENT = 'FIELD_AGENT',
  MANAGER = 'MANAGER'
}

export interface LeadAssignment {
  leadId: string;
  userId: string;
  assignedAt: string;
  status: LeadStatus;
  notes: string;
  photos?: string[];
} 