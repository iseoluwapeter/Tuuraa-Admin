import type { Invoice } from "../components/types/Types";

export const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  open: { bg: "bg-blue-100", text: "text-blue-700" },
  assigned: { bg: "bg-yellow-100", text: "text-yellow-700" },
  in_progress: { bg: "bg-orange-100", text: "text-orange-700" },
  completed: { bg: "bg-green-100", text: "text-green-700" },
  cancelled: { bg: "bg-red-100", text: "text-red-700" },
  disputed: { bg: "bg-purple-100", text: "text-purple-700" },
};

export const statusConfig: Record<
  string,
  { label: string; bg: string; text: string; dot: string }
> = {
  pending: {
    label: "Pending",
    bg: "bg-amber-50",
    text: "text-amber-700",
    dot: "bg-amber-400",
  },
  approved: {
    label: "Approved",
    bg: "bg-green-50",
    text: "text-green-700",
    dot: "bg-green-500",
  },
  rejected: {
    label: "Rejected",
    bg: "bg-red-50",
    text: "text-red-700",
    dot: "bg-red-400",
  },
};

export const PAYMENT_COLORS: Record<string, { bg: string; text: string }> = {
  paid: { bg: "bg-green-100", text: "text-green-700" },
  pending: { bg: "bg-yellow-100", text: "text-yellow-700" },
  failed: { bg: "bg-red-100", text: "text-red-700" },
  refunded: { bg: "bg-gray-100", text: "text-gray-700" },
};

export const ROLE_COLORS: Record<string, { bg: string; text: string }> = {
  client: { bg: "bg-blue-100", text: "text-blue-700" },
  tasker: { bg: "bg-indigo-100", text: "text-indigo-700" },
  admin: { bg: "bg-gray-200", text: "text-gray-700" },
};

export const KYC_COLORS: Record<string, { bg: string; text: string }> = {
  pending: { bg: "bg-yellow-100", text: "text-yellow-700" },
  approved: { bg: "bg-green-100", text: "text-green-700" },
  rejected: { bg: "bg-red-100", text: "text-red-700" },
};

export const DOC_TYPE_LABELS: Record<string, string> = {
  national_id: "National ID",
  drivers_license: "Driver's License",
  voters_card: "Voter's Card",
  passport: "International Passport",
};

export const fmtDate = (d: string | null) =>
  d
    ? new Date(d).toLocaleDateString("en-NG", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

export const fmtDateTime = (d: string | null) =>
  d
    ? new Date(d).toLocaleString("en-NG", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

export const fmt = (n: number | null) =>
  n != null ? `₦${Number(n).toLocaleString("en-NG")}` : "—";

export const STATUS_META: Record<
  Invoice["status"],
  { label: string; color: string; bg: string }
> = {
  draft: { label: "Draft", color: "#6B7280", bg: "#F3F4F6" },
  sent: { label: "Sent", color: "#2563EB", bg: "#EFF6FF" },
  paid: { label: "Paid", color: "#059669", bg: "#ECFDF5" },
  overdue: { label: "Overdue", color: "#DC2626", bg: "#FEF2F2" },
};