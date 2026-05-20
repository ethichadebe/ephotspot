export interface User {
  id: string;
  phone: string | null;
  email: string | null;
  name: string | null;
  googleId: string | null;
  facebookId: string | null;
  appleId: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DataPackage {
  id: string;
  name: string;
  dataMb: number;
  priceZar: number;
  isActive: boolean;
}

export interface DataBalance {
  id: string;
  userId: string;
  remainingMb: number;
  rolledOverMb: number;
  updatedAt: Date;
}

export interface Operator {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  subscriptionStatus: 'active' | 'suspended' | 'trial';
  createdAt: Date;
}

export interface HotspotNode {
  id: string;
  operatorId: string;
  name: string;
  ipAddress: string;
  radiusSecret: string;
  apiUsername: string;
  apiPassword: string;
  isOnline: boolean;
  lastSeenAt: Date | null;
}

export interface Session {
  id: string;
  userId: string;
  nodeId: string;
  radiusSessionId: string;
  startedAt: Date;
  endedAt: Date | null;
  dataUsedMb: number;
}

export interface Purchase {
  id: string;
  userId: string;
  packageId: string;
  amountZar: number;
  paymentMethod: 'peach' | 'bango';
  paymentReference: string;
  createdAt: Date;
}

export interface PushToken {
  id: string;
  userId: string;
  token: string;
  updatedAt: Date;
}

export interface SuperAdmin {
  id: string;
  email: string;
  createdAt: Date;
}

export interface JwtPayload {
  sub: string;
  type: 'user' | 'operator' | 'super_admin';
  iat: number;
  exp: number;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
}

export type NotificationTrigger =
  | 'threshold_20'
  | 'threshold_10'
  | 'purchase_confirmed'
  | 'session_start'
  | 'session_end'
  | 'data_exhausted';
