export interface User {
  id: number;
  phone: string;
  name: string;
  isVerified: boolean;
}

export interface WaterloggingReport {
  id: number;
  userId: number;
  latitude: number;
  longitude: number;
  severity: 'low' | 'medium' | 'high';
  description: string;
  createdAt: string;
}

export interface Location {
  latitude: number;
  longitude: number;
}