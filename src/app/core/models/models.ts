// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  childId?: string;
  picture?: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

// ─── Child ────────────────────────────────────────────────────────────────────

export interface Child {
  id: string;
  userId: string;
  name: string;
  birthDate: string;
  gender: 'M' | 'F';
  bloodType?: string;
  photoUrl?: string;
  birthWeightKg: number;
  birthHeightCm: number;
  createdAt: string;
  updatedAt: string;
}

// ─── Vaccine ──────────────────────────────────────────────────────────────────

export type VaccineStatus = 'pending' | 'administered' | 'skipped';

export interface Vaccine {
  id: string;
  childId: string;
  code: string;
  name: string;
  ageLabel: string;
  scheduledDate: string;
  administeredDate?: string;
  status: VaccineStatus;
  location?: string;
  batchLot?: string;
  reactions?: string;
  notes?: string;
  createdAt: string;
}

// ─── Measurement ──────────────────────────────────────────────────────────────

export interface Measurement {
  id: string;
  childId: string;
  date: string;
  weightKg: number;
  heightCm: number;
  headCircumferenceCm: number;
  percentileWeight?: number;
  percentileHeight?: number;
  createdAt: string;
}

// ─── Notification ─────────────────────────────────────────────────────────────

export type NotificationType = 'vaccine' | 'checkup' | 'medication' | 'milestone_reminder';

export interface AppNotification {
  id: string;
  userId: string;
  childId?: string;
  type: NotificationType;
  title: string;
  message: string;
  date: string;
  read: boolean;
  relatedId?: string;
  createdAt: string;
}
