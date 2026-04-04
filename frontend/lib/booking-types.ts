export type BookingUnit = "hourly" | "daily";

export type QuoteRequest = {
  listing_id: string;
  unit: BookingUnit;
  start_at: string;
  end_at: string;
};

export type QuoteResponse = {
  listing_id: string;
  unit: BookingUnit;
  start_at: string;
  end_at: string;
  subtotal_amount: string;
  demand_multiplier: string;
  commission_amount: string;
  total_amount: string;
};

export type BookingCreateRequest = {
  listing_id: string;
  space_id?: string | null;
  unit: BookingUnit;
  start_at: string;
  end_at: string;
};

export type BookingRead = {
  id: string;
  listing_id: string;
  renter_id: string;
  space_id?: string | null;
  unit: BookingUnit;
  status: string;
  start_at: string;
  end_at: string;
  subtotal_amount: string;
  demand_multiplier: string;
  commission_amount: string;
  total_amount: string;
  qr_token?: string | null;
  qr_payload?: string | null;
};

export type PaymentOrderRequest = {
  booking_id: string;
};

export type PaymentVerificationRequest = {
  booking_id: string;
  provider_order_id: string;
  provider_payment_id: string;
  provider_signature?: string | null;
};

export type PaymentRead = {
  id: string;
  booking_id: string;
  provider: string;
  provider_order_id?: string | null;
  provider_payment_id?: string | null;
  amount: string;
  currency: string;
  status: string;
  is_sandbox: boolean;
};

export type BookingQrResponse = {
  payload: string | null;
  svg_data_url: string | null;
};

