import { useState } from "react";
import { supabase } from "../../constants/supabaseClient";
import { inputStyle, labelStyle } from "../constants";

type FormData = {
  fullname: string;
  email: string;
  phoneNo: string;
  vehicle_type: string;
  address: string;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

const VEHICLE_OPTIONS = [
  { value: "bike", label: "Bike" },
  { value: "bicycle", label: "Bicycle" },
  { value: "car", label: "Car" },
  { value: "van", label: "Van" },
  { value: "truck", label: "Truck" },
];

const INITIAL_FORM: FormData = {
  fullname: "",
  email: "",
  phoneNo: "",
  vehicle_type: "bike",
  address: "",
};

export const AddOperatorModal = ({ visible, onClose, onSuccess }: Props) => {
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setFormData(INITIAL_FORM);
    setError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    setError(null);
    if (!formData.fullname.trim() || !formData.email.trim()) {
      setError("Full name and email are required.");
      return;
    }

    setSubmitting(true);
    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();
      if (sessionError || !session)
        throw new Error("Admin session not found. Please log in again.");

      const { data, error: fnError } = await supabase.functions.invoke(
        "create-operator",
        {
          body: {
            email: formData.email.trim(),
            fullName: formData.fullname.trim(),
            phoneNo: formData.phoneNo.trim() || null,
            address: formData.address.trim() || null,
            vehicleType: formData.vehicle_type || null,
          },
        },
      );

      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);

      reset();
      onSuccess();
    } catch (err: any) {
      setError(err?.message ?? "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!visible) return null;

  return (
    <ModalShell
      title="Add New Operator"
      subtitle="Operator will receive an email to set their password"
      onClose={handleClose}
    >
      {error && <ErrorBanner message={error} />}

      <FieldGroup>
        <Field label="Full Name *">
          <input
            style={inputStyle}
            placeholder="e.g. Emeka Okonkwo"
            value={formData.fullname}
            onChange={(e) =>
              setFormData((f) => ({ ...f, fullname: e.target.value }))
            }
          />
        </Field>

        <Field label="Email Address *">
          <input
            style={inputStyle}
            type="email"
            placeholder="operator@example.com"
            value={formData.email}
            onChange={(e) =>
              setFormData((f) => ({ ...f, email: e.target.value }))
            }
          />
        </Field>

        <Field label="Phone Number">
          <input
            style={inputStyle}
            type="tel"
            placeholder="+234 801 234 5678"
            value={formData.phoneNo}
            onChange={(e) =>
              setFormData((f) => ({ ...f, phoneNo: e.target.value }))
            }
          />
        </Field>

        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
        >
          <Field label="Vehicle Type">
            <select
              style={{ ...inputStyle, cursor: "pointer" }}
              value={formData.vehicle_type}
              onChange={(e) =>
                setFormData((f) => ({ ...f, vehicle_type: e.target.value }))
              }
            >
              {VEHICLE_OPTIONS.map((v) => (
                <option key={v.value} value={v.value}>
                  {v.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Base Address">
            <input
              style={inputStyle}
              placeholder="e.g. Lekki Phase 1"
              value={formData.address}
              onChange={(e) =>
                setFormData((f) => ({ ...f, address: e.target.value }))
              }
            />
          </Field>
        </div>
      </FieldGroup>

      <ModalFooter>
        <CancelButton onClick={handleClose} />
        <SubmitButton
          onClick={handleSubmit}
          loading={submitting}
          label="Add Operator"
          loadingLabel="Creating…"
        />
      </ModalFooter>
    </ModalShell>
  );
};

// ── Shared sub-components (also exported for use in other modals) ──────────

export const ModalShell = ({
  title,
  subtitle,
  onClose,
  children,
  maxWidth = 480,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: number;
}) => (
  <div
    style={{
      position: "fixed",
      inset: 0,
      background: "rgba(10,10,30,0.48)",
      backdropFilter: "blur(4px)",
      zIndex: 1000,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 16,
    }}
    onClick={(e) => e.target === e.currentTarget && onClose()}
  >
    <div
      style={{
        background: "#fff",
        borderRadius: 18,
        width: "100%",
        maxWidth,
        boxShadow: "0 24px 64px rgba(17,17,124,0.16)",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "20px 24px 16px",
          borderBottom: "1px solid #f0f2f8",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: 17,
              fontWeight: 700,
              color: "#11117C",
            }}
          >
            {title}
          </h2>
          {subtitle && (
            <p style={{ margin: "3px 0 0", fontSize: 12, color: "#9ca3af" }}>
              {subtitle}
            </p>
          )}
        </div>
        <button
          onClick={onClose}
          style={{
            background: "#f3f4f6",
            border: "none",
            borderRadius: 8,
            width: 30,
            height: 30,
            cursor: "pointer",
            fontSize: 18,
            color: "#6b7280",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          ×
        </button>
      </div>
      {/* Body */}
      <div style={{ padding: "20px 24px 24px" }}>{children}</div>
    </div>
  </div>
);

export const FieldGroup = ({ children }: { children: React.ReactNode }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
    {children}
  </div>
);

export const Field = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <div>
    <label style={labelStyle}>{label}</label>
    {children}
  </div>
);

export const ErrorBanner = ({ message }: { message: string }) => (
  <div
    style={{
      background: "#fff1f1",
      border: "1px solid #fecaca",
      borderRadius: 8,
      padding: "10px 13px",
      fontSize: 12,
      color: "#b91c1c",
      marginBottom: 14,
    }}
  >
    ⚠️ {message}
  </div>
);

export const ModalFooter = ({ children }: { children: React.ReactNode }) => (
  <div style={{ display: "flex", gap: 10, marginTop: 20 }}>{children}</div>
);

export const CancelButton = ({ onClick }: { onClick: () => void }) => (
  <button
    onClick={onClick}
    style={{
      flex: 1,
      padding: "11px 0",
      border: "1px solid #e0e3ef",
      borderRadius: 10,
      background: "#fff",
      fontSize: 13,
      fontWeight: 600,
      color: "#6b7280",
      cursor: "pointer",
    }}
  >
    Cancel
  </button>
);

export const SubmitButton = ({
  onClick,
  loading,
  label,
  loadingLabel,
  danger = false,
}: {
  onClick: () => void;
  loading: boolean;
  label: string;
  loadingLabel: string;
  danger?: boolean;
}) => (
  <button
    onClick={onClick}
    disabled={loading}
    style={{
      flex: 2,
      padding: "11px 0",
      border: "none",
      borderRadius: 10,
      background: loading ? "#a5b4fc" : danger ? "#dc2626" : "#11117C",
      fontSize: 13,
      fontWeight: 600,
      color: "#fff",
      cursor: loading ? "not-allowed" : "pointer",
      transition: "background 0.2s",
    }}
  >
    {loading ? loadingLabel : label}
  </button>
);
