// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  childId?: string;
  picture?: string;
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
  photoProvider?: 's3';
  photoBucket?: string;
  photoKey?: string;
  photoMimeType?: string;
  photoSize?: number;
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
  source?: string;
  scheduleVersion?: string;
  administeredDate?: string;
  status: VaccineStatus;
  location?: string;
  batchLot?: string;
  reactions?: string;
  notes?: string;
  createdAt: string;
}

// ─── Measurement ──────────────────────────────────────────────────────────────

/** Indicador OMS para una dimensión (peso, talla o perímetro cefálico). */
export interface GrowthIndicator {
  zScore: number;
  percentile: number;
  median: number;
  interpretation: string;
}

/** Datos de crecimiento OMS calculados por el backend para una medición. */
export interface Growth {
  ageMonths: number;
  sex: 'M' | 'F';
  weight?: GrowthIndicator;
  height?: GrowthIndicator;
  head?: GrowthIndicator;
}

export interface Measurement {
  id: string;
  childId: string;
  date: string;
  weightKg: number;
  heightCm: number;
  headCircumferenceCm: number;
  percentileWeight?: number;
  percentileHeight?: number;
  growth?: Growth;
  createdAt: string;
}

// ─── Checkup ──────────────────────────────────────────────────────────────────

export interface Prescription {
  medication: string;
  dosage: string;
  duration: string;
}

export interface Checkup {
  id: string;
  childId: string;
  date: string;
  doctorName: string;
  center: string;
  observations: string;
  prescriptions: Prescription[];
  nextAppointment?: string;
  status?: 'pending' | 'completed';
  completedAt?: string;
  suggestedKey?: string;
  createdAt: string;
}

// ─── Nutrition ────────────────────────────────────────────────────────────────

export interface RecipeIngredient {
  name: string;
  amount: string;
}

export interface Recipe {
  id: string;
  childId: string;
  name: string;
  stage: string;
  texture: string;
  ingredients: RecipeIngredient[];
  steps: string[];
  nutritionHighlights: string[];
  allergens: string[];
  prepTimeMin: number;
  imageUrl?: string;
  isFavorite: boolean;
  createdAt: string;
}

export interface FoodIntroduction {
  id: string;
  childId: string;
  foodName: string;
  date: string;
  reaction: 'none' | 'mild' | 'moderate' | 'severe';
  notes?: string;
  accepted: boolean;
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

// ─── Caregivers / Sharing ───────────────────────────────────────────────────

export type CaregiverRole = 'parent' | 'caregiver' | 'doctor' | 'viewer';

export interface Caregiver {
  id: string;
  childId: string;
  email: string;
  name?: string;
  role: CaregiverRole;
  invitedAt?: string;
  acceptedAt?: string;
  avatarUrl?: string;
}

export interface CaregiverInvite {
  caregiver: Caregiver;
  inviteLink: string;
}

export interface AcceptInviteResult {
  ok: boolean;
  childId: string;
  role: CaregiverRole;
}

/** Perfil de otro usuario compartido conmigo. Incluye el rol con el que se compartió. */
export interface SharedChild extends Child {
  sharedRole: CaregiverRole;
}

// ─── Growth curves (OMS) ──────────────────────────────────────────────────────

export interface GrowthCurvePoint {
  month: number;
  p3: number;
  p15: number;
  p50: number;
  p85: number;
  p97: number;
}

export interface GrowthCurves {
  sex: 'M' | 'F';
  weight: GrowthCurvePoint[];
  height: GrowthCurvePoint[];
  head: GrowthCurvePoint[];
}
