export type ListingCard = {
  id: string;
  title: string;
  hostType: string;
  address: string;
  latitude: number;
  longitude: number;
  hourlyRate: number;
  dailyRate: number;
  tags: string[];
  status: string;
  description?: string;
};

export type HostProfile = {
  id: string;
  host_type: string;
  business_name?: string | null;
  bio?: string | null;
  approval_status: string;
  is_identity_verified: boolean;
  photo_url?: string | null;
};

export type HostProfilePayload = {
  host_type: string;
  business_name?: string | null;
  bio?: string | null;
  tax_id?: string | null;
  photo_url?: string | null;
};

export type ListingPayload = {
  title: string;
  description?: string | null;
  host_type: string;
  display_address: string;
  city: string;
  state: string;
  country: string;
  latitude: number;
  longitude: number;
  parking_type: string;
  vehicle_types: string[];
  amenities: string[];
  photo_urls: string[];
  access_instructions?: string | null;
  hourly_rate: number;
  daily_rate: number;
  busy_area: boolean;
  spaces: Array<{
    label: string;
    capacity: number;
    size_label?: string | null;
    has_ev_charger: boolean;
  }>;
  availability_rules: Array<{
    day_of_week?: number | null;
    start_time: string;
    end_time: string;
    is_available: boolean;
    min_duration_hours: number;
  }>;
};

export type TokenPair = {
  access_token: string;
  refresh_token: string;
  token_type: string;
};

export type UserProfile = {
  id: string;
  full_name: string;
  email: string;
  phone?: string | null;
  role: string;
  email_verified: boolean;
  phone_verified: boolean;
  is_active: boolean;
  avatar_url?: string | null;
};

export type HostMetricResponse = {
  listings: number;
  bookings: number;
  gross_earnings: string;
  approval_status?: string;
};

export type AdminMetricResponse = {
  users: number;
  hosts: number;
  listings: number;
  bookings: number;
  pending_hosts: number;
  flagged_reports: number;
};
