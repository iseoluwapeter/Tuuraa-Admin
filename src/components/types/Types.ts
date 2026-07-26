export type InvoiceItem = {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
};

export type client = {
  id: string;
  business_name: string;
  email: string | null;
  phone: string;
  default_pickup_address: string | null;

  account_manager_id: string | null;

  account_manager: {
    full_name: string;
  } | null;

  client_subscriptions: {
    id: string;
    status: string;
    package_tiers: {
      name: string;
    } | null;
  }[];
};

export type ClientSummary = Pick<
  client,
  "id" | "business_name" | "email" | "default_pickup_address"
>;

export type Invoice = {
  id: string;
  invoice_number: string;
  client_id: string;
  client?: client;
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
  operator_id: string | null;
  subscription_id: string; // add this
  status: string;
  out_for_delivery_at: string | null;
  completed_at: string | null;
  client: { business_name: string } | null;
  operator: { full_name: string } | null;
  subscription: {
    id: string;
    drops_used: number;
    tier: { name: string; monthly_drops: number } | null;
  } | null;
};

export type DropEntry = {
  id: string;
  drop_number: number;
  recipient_name: string;
  recipient_phone: string;
  out_for_delivery_at: string;
  delivery_address: string;
  delivered_at: string;
  // address: string;
  status:
    | "pending"
    | "delivered"
    | "rider_assigned"
    | "out_for_delivery"
    | "failed";
  created_at: string;
};
