export type InvoiceItem = {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
};

export type Client = {
  id: string;
  business_name: string;
  email: string;
  phone: string | null;
  default_pickup_address: string | null;
};

export type Invoice = {
  id: string;
  invoice_number: string;
  client_id: string;
  client?: Client;
  issue_date: string;
  due_date: string;
  status: "draft" | "sent" | "paid" | "overdue";
  items: InvoiceItem[];
  notes?: string;
  subtotal: number;
  tax_rate: number;
  total: number;
  created_by: string;
  created_at: string;
};

export type Manifests = {
  id: string;
  ref_number: string;
  created_at: string;
  drops_count: number;
  out_for_delivery_at: string;
  completed_at: string;
  status: string;
  client: { business_name: string };
  operator: { full_name: string } | null;
  subscription: {
    id: string;
    drops_used: number;
    tier: { name: string; monthly_drops: string } | null;
  } | null;
};

export type DropEntry = {
  id: string;
  drop_number: number;
  recipient_name: string;
  recipient_phone: string;
  out_for_delivery_at: string;
  delivered_at: string;
  address: string;
  status:
    | "pending"
    | "delivered"
    | "rider_assigned"
    | "out_for_delivery"
    | "failed";
  created_at: string;
};
