import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../constants/supabaseClient";
import { inputStyle } from "../constants";
import {
  ModalShell,
  FieldGroup,
  Field,
  ErrorBanner,
  ModalFooter,
  CancelButton,
  SubmitButton,
} from "./AddOperatorModal";

// ─── Types ────────────────────────────────────────────────────────────────────

type CreatedClient = {
  email: string;
  tempPassword: string;
};

type FormData = {
  businessName: string;
  email: string;
  phoneNo: string;
  address: string;
  lga: string;
  zone: string;
  assigned_coordinator: string;
  tier: string;
  cycle_start: string;
  cycle_end: string;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

type Coordinator = { id: string; full_name: string };
type Tier = { id: string; name: string };

// ─── Constants ────────────────────────────────────────────────────────────────

const INITIAL_FORM: FormData = {
  businessName: "",
  email: "",
  phoneNo: "",
  address: "",
  lga: "",
  zone: "",
  assigned_coordinator: "",
  tier: "",
  cycle_start: "",
  cycle_end: "",
};

const LGA_OPTIONS = ["Eti-Osa", "Lagos Island", "Apapa", "Surulere", "Ikeja"];
const ZONE_OPTIONS = ["Victoria Island", "Lekki", "Lagos Island", "Ikoyi"];

// ─── Post-creation success screen ─────────────────────────────────────────────

const SuccessScreen = ({
  client,
  onDone,
}: {
  client: CreatedClient;
  onDone: () => void;
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(client.tempPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: select the text manually
    }
  };

  return (
    <div style={{ padding: "8px 0 4px" }}>
      {/* Icon + heading */}
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 52,
            height: 52,
            borderRadius: "50%",
            background: "#dcfce7",
            marginBottom: 12,
          }}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#16a34a"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <div style={{ fontWeight: 600, fontSize: 16, color: "#111827" }}>
          Client created
        </div>
        <div style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>
          An account has been set up for{" "}
          <span style={{ color: "#111827", fontWeight: 500 }}>
            {client.email}
          </span>
        </div>
      </div>

      {/* Temp password card */}
      <div
        style={{
          background: "#f9fafb",
          border: "1px solid #e5e7eb",
          borderRadius: 8,
          padding: "14px 16px",
          marginBottom: 20,
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            color: "#9ca3af",
            marginBottom: 8,
          }}
        >
          Temporary password
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <code
            style={{
              flex: 1,
              fontFamily: "ui-monospace, monospace",
              fontSize: 15,
              fontWeight: 600,
              color: "#111827",
              letterSpacing: "0.04em",
              wordBreak: "break-all",
            }}
          >
            {client.tempPassword}
          </code>

          <button
            onClick={handleCopy}
            style={{
              flexShrink: 0,
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              padding: "6px 12px",
              borderRadius: 6,
              border: "1px solid #d1d5db",
              background: copied ? "#dcfce7" : "#fff",
              color: copied ? "#16a34a" : "#374151",
              fontSize: 12,
              fontWeight: 500,
              cursor: "pointer",
              transition: "background 0.15s, color 0.15s",
            }}
          >
            {copied ? (
              <>
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Copied
              </>
            ) : (
              <>
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                Copy
              </>
            )}
          </button>
        </div>

        <div
          style={{
            marginTop: 10,
            fontSize: 12,
            color: "#6b7280",
            lineHeight: 1.5,
          }}
        >
          Share this with the client — they'll be prompted to change it on first
          login. This password won't be shown again.
        </div>
      </div>

      {/* Done button */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          onClick={onDone}
          style={{
            padding: "9px 20px",
            borderRadius: 7,
            border: "none",
            background: "#111827",
            color: "#fff",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Done
        </button>
      </div>
    </div>
  );
};

// ─── Main modal ───────────────────────────────────────────────────────────────

export const AddClientModal = ({ visible, onClose, onSuccess }: Props) => {
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdClient, setCreatedClient] = useState<CreatedClient | null>(
    null,
  );
  const [dropdown, setDropdown] = useState<{
    allCordinators: Coordinator[];
    allTiers: Tier[];
  }>({
    allCordinators: [],
    allTiers: [],
  });

  const reset = () => {
    setFormData(INITIAL_FORM);
    setError(null);
    setCreatedClient(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleDone = () => {
    reset();
    onSuccess();
  };

  const fetchDropdown = useCallback(async () => {
    try {
      const [coordinatorsRes, packageRes] = await Promise.all([
        supabase
          .from("users")
          .select("id, full_name")
          .eq("role", "coordinator"),
        supabase.from("package_tiers").select("id, name"),
      ]);

      if (coordinatorsRes.error)
        console.log("Failed to fetch coordinators:", coordinatorsRes.error);
      if (packageRes.error)
        console.log("Failed to fetch package tiers:", packageRes.error);

      setDropdown({
        allCordinators: coordinatorsRes.data ?? [],
        allTiers: packageRes.data ?? [],
      });
    } catch (error) {
      console.log("Failed to fetch dropdown data:", error);
    }
  }, []);

  useEffect(() => {
    if (visible) fetchDropdown();
  }, [visible, fetchDropdown]);

  const handleSubmit = async () => {
    setError(null);
    if (
      !formData.businessName.trim() ||
      !formData.email.trim() ||
      !formData.tier.trim()
    ) {
      setError("Business name, email and tier are required.");
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-client", {
        body: {
          businessName: formData.businessName.trim(),
          email: formData.email.trim(),
          phone: formData.phoneNo.trim() || null,
          defaultPickupAddress: formData.address.trim() || null,
          lga: formData.lga || null,
          zone: formData.zone || null,
          accountManagerId: formData.assigned_coordinator || null,
          tierId: formData.tier,
          cycleStart: formData.cycle_start,
          cycleEnd: formData.cycle_end,
        },
      });

      if (error) throw error;

      // Surface the credentials instead of just logging them
      setCreatedClient({
        email: formData.email.trim(),
        tempPassword: data?.tempPassword ?? "",
      });
    } catch (err: any) {
      setError(err?.message ?? "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!visible) return null;

  return (
    <ModalShell
      title={createdClient ? "Client added" : "Add New Client"}
      subtitle={
        createdClient
          ? "Save the credentials below before closing"
          : "Client will receive login credentials to access their portal"
      }
      onClose={handleClose}
    >
      {createdClient ? (
        <SuccessScreen client={createdClient} onDone={handleDone} />
      ) : (
        <>
          {error && <ErrorBanner message={error} />}

          <FieldGroup>
            <Field label="Business Name *">
              <input
                style={inputStyle}
                placeholder="e.g. Emeka Okonkwo Foods Ltd"
                value={formData.businessName}
                onChange={(e) =>
                  setFormData((f) => ({ ...f, businessName: e.target.value }))
                }
              />
            </Field>

            <Field label="Email Address *">
              <input
                style={inputStyle}
                type="email"
                placeholder="client@example.com"
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

            <Field label="Default Pickup Address">
              <input
                style={inputStyle}
                placeholder="e.g. 12 Admiralty Way, Lekki Phase 1"
                value={formData.address}
                onChange={(e) =>
                  setFormData((f) => ({ ...f, address: e.target.value }))
                }
              />
            </Field>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
              }}
            >
              <Field label="LGA">
                <select
                  style={inputStyle}
                  value={formData.lga}
                  onChange={(e) =>
                    setFormData((f) => ({ ...f, lga: e.target.value }))
                  }
                >
                  <option value="">Select LGA</option>
                  {LGA_OPTIONS.map((lga) => (
                    <option key={lga} value={lga}>
                      {lga}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Zone">
                <select
                  style={inputStyle}
                  value={formData.zone}
                  onChange={(e) =>
                    setFormData((f) => ({ ...f, zone: e.target.value }))
                  }
                >
                  <option value="">Select zone</option>
                  {ZONE_OPTIONS.map((zone) => (
                    <option key={zone} value={zone}>
                      {zone}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
              }}
            >
              <Field label="Assigned Coordinator">
                <select
                  style={inputStyle}
                  value={formData.assigned_coordinator}
                  onChange={(e) =>
                    setFormData((f) => ({
                      ...f,
                      assigned_coordinator: e.target.value,
                    }))
                  }
                >
                  <option value="">Select coordinator</option>
                  {dropdown.allCordinators.map((coord) => (
                    <option key={coord.id} value={coord.id}>
                      {coord.full_name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Select Tier *">
                <select
                  style={inputStyle}
                  value={formData.tier}
                  onChange={(e) =>
                    setFormData((f) => ({ ...f, tier: e.target.value }))
                  }
                >
                  <option value="">Select tier</option>
                  {dropdown.allTiers.map((tier) => (
                    <option key={tier.id} value={tier.id}>
                      {tier.name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
              }}
            >
              <Field label="Cycle start">
                <input
                  style={inputStyle}
                  type="date"
                  value={formData.cycle_start}
                  onChange={(e) =>
                    setFormData((f) => ({ ...f, cycle_start: e.target.value }))
                  }
                />
              </Field>

              <Field label="Cycle end">
                <input
                  style={inputStyle}
                  type="date"
                  value={formData.cycle_end}
                  onChange={(e) =>
                    setFormData((f) => ({ ...f, cycle_end: e.target.value }))
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
              label="Add Client"
              loadingLabel="Creating…"
            />
          </ModalFooter>
        </>
      )}
    </ModalShell>
  );
};
