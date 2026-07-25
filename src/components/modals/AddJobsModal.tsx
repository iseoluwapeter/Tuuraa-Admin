import { useEffect, useState, useCallback } from "react";
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
import { useAuthStore } from "../../store/authStore";
import { FiPlus, FiTrash2 } from "react-icons/fi";

type Profile = { id: string; full_name: string };
type Subscription = {
  id: string;
  tier_name: string;
  drops_used: number;
  monthly_drops: number;
};

type DropInput = {
  recipient_name: string;
  recipient_phone: string;
  address: string;
};

type FormData = {
  client_id: string;
  operator_id: string;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

const INITIAL_FORM: FormData = { client_id: "", operator_id: "" };
const EMPTY_DROP: DropInput = {
  recipient_name: "",
  recipient_phone: "",
  address: "",
};

export const AddJobsModal = ({ visible, onClose, onSuccess }: Props) => {
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM);
  const [drops, setDrops] = useState<DropInput[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clients, setClients] = useState<Profile[]>([]);
  const [operators, setOperators] = useState<Profile[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [fetchingSubscription, setFetchingSubscription] = useState(false);
  const [remainingDrops, setRemainingDrops] = useState<number | null>(null);

  const user = useAuthStore((s) => s.user);

  const reset = () => {
    setFormData(INITIAL_FORM);
    setDrops([]);
    setSubscription(null);
    setRemainingDrops(null);
    setError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const fetchDropdowns = async () => {
    try {
      const [
        { data: clientData, error: clientErr },
        { data: opData, error: opErr },
      ] = await Promise.all([
        supabase.from("clients").select("id, full_name"),
        supabase
          .from("profiles")
          .select("id, full_name")
          .eq("role", "operator"),
      ]);
      if (clientErr) throw clientErr;
      if (opErr) throw opErr;
      setClients(clientData ?? []);
      setOperators(opData ?? []);
    } catch (err) {
      console.error("Failed to fetch dropdown data:", err);
    }
  };

  useEffect(() => {
    if (visible) fetchDropdowns();
  }, [visible]);

  const handleClientChange = async (clientId: string) => {
    setFormData((f) => ({ ...f, client_id: clientId }));
    setSubscription(null);
    setRemainingDrops(null);
    if (!clientId) return;

    setFetchingSubscription(true);
    try {
      const { data, error } = await supabase
        .from("client_subscriptions")
        .select(
          `id, drops_used,
           tier:package_tiers!client_subscriptions_tier_id_fkey (
             name, monthly_drops
           )`,
        )
        .eq("client_id", clientId)
        .eq("status", "active")
        .single();

      if (error) throw error;
      const tier = data.tier as any;
      const sub: Subscription = {
        id: data.id,
        tier_name: tier?.name ?? "Unknown tier",
        drops_used: data.drops_used,
        monthly_drops: tier?.monthly_drops ?? 0,
      };
      setSubscription(sub);
      setRemainingDrops(sub.monthly_drops - sub.drops_used);
    } catch {
      setSubscription(null);
      setError("This client has no active subscription.");
    } finally {
      setFetchingSubscription(false);
    }
  };

  // ── Drop list helpers ──────────────────────────────────────────────────
  const addDrop = () => {
    if (remainingDrops !== null && drops.length >= remainingDrops) {
      setError(
        `Cannot add more drops. Only ${remainingDrops} drop${remainingDrops === 1 ? "" : "s"} remaining.`,
      );
      return;
    }
    setDrops((d) => [...d, { ...EMPTY_DROP }]);
  };

  const removeDrop = (i: number) =>
    setDrops((d) => d.filter((_, idx) => idx !== i));

  const updateDrop = (i: number, field: keyof DropInput, value: string) =>
    setDrops((d) =>
      d.map((drop, idx) => (idx === i ? { ...drop, [field]: value } : drop)),
    );

  // ── Submit ─────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setError(null);

    if (!formData.client_id || !formData.operator_id) {
      setError("Client and operator are required.");
      return;
    }
    if (!subscription) {
      setError("Client has no active subscription. Cannot create manifest.");
      return;
    }
    if (drops.length === 0) {
      setError("Add at least one drop before creating a manifest.");
      return;
    }
    // validate each drop row
    for (let i = 0; i < drops.length; i++) {
      const d = drops[i];
      if (!d.recipient_name || !d.recipient_phone || !d.address) {
        setError(`Drop #${i + 1} is incomplete. Fill in all fields.`);
        return;
      }
    }
    if (!user?.id) {
      setError("No logged-in user found.");
      return;
    }

    const remaining = subscription.monthly_drops - subscription.drops_used;
    if (remaining <= 0) {
      setError(
        `This client has exhausted all ${subscription.monthly_drops} drops on their subscription.`,
      );
      return;
    }
    if (drops.length > remaining) {
      setError(
        `Drop count exceeds remaining allowance. This client has ${remaining} drop${remaining === 1 ? "" : "s"} left.`,
      );
      return;
    }

    setSubmitting(true);
    try {
      // 1. Generate manifest_ref
      const { data: refData, error: refError } = await supabase.rpc(
        "generate_job_ref",
      );
      if (refError) throw refError;

      // 2. Insert manifest
      const { data: manifestData, error: manifestError } = await supabase
        .from("manifests")
        .insert({
          manifest_ref: refData,
          client: formData.client_id,
          subscription_id: subscription.id,
          coordinator: user.id,
          operator: formData.operator_id,
          drop_count: drops.length,
        })
        .select("id")
        .single();
      if (manifestError) throw manifestError;

      // 3. Insert drops
      const dropRows = drops.map((d, i) => ({
        manifest_id: manifestData.id,
        drop_number: i + 1,
        recipient_name: d.recipient_name,
        recipient_phone: d.recipient_phone,
        address: d.address,
      }));
      const { error: dropsError } = await supabase
        .from("drops")
        .insert(dropRows);
      if (dropsError) throw dropsError;

      // 4. Increment drops_used on subscription
      const { error: usageError } = await supabase
        .from("client_subscriptions")
        .update({ drops_used: subscription.drops_used + drops.length })
        .eq("id", subscription.id);
      if (usageError) throw usageError;

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
      title="Add New Manifest"
      subtitle="Assign an operator and log drops for this dispatch run"
      onClose={handleClose}
    >
      {error && <ErrorBanner message={error} />}

      <FieldGroup>
        {/* Client */}
        <Field label="Client *">
          <select
            style={inputStyle}
            value={formData.client_id}
            onChange={(e) => handleClientChange(e.target.value)}
          >
            <option value="">Select a client</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.full_name}
              </option>
            ))}
          </select>
        </Field>

        {/* Subscription — read only */}
        <Field label="Subscription">
          <div
            style={{
              ...inputStyle,
              background: "#f8f9ff",
              color: fetchingSubscription
                ? "#9ca3af"
                : subscription
                  ? "#11117C"
                  : "#9ca3af",
              fontWeight: subscription ? 600 : 400,
            }}
          >
            {fetchingSubscription
              ? "Fetching subscription…"
              : subscription
                ? `${subscription.tier_name} · ${remainingDrops ?? 0} drop${remainingDrops === 1 ? "" : "s"} remaining`
                : "Select a client first"}
          </div>
        </Field>

        {/* Operator */}
        <Field label="Operator *">
          <select
            style={inputStyle}
            value={formData.operator_id}
            onChange={(e) =>
              setFormData((f) => ({ ...f, operator_id: e.target.value }))
            }
          >
            <option value="">Select an operator</option>
            {operators.map((o) => (
              <option key={o.id} value={o.id}>
                {o.full_name}
              </option>
            ))}
          </select>
        </Field>
      </FieldGroup>

      {/* ── Drops section ───────────────────────────────────────────────── */}
      <div style={{ marginTop: 20 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 10,
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 12,
              fontWeight: 700,
              color: "#374151",
            }}
          >
            Drops{" "}
            <span style={{ color: "#9ca3af", fontWeight: 400 }}>
              ({drops.length}
              {remainingDrops !== null ? ` / ${remainingDrops} remaining` : ""})
            </span>
          </p>
          <button
            onClick={addDrop}
            disabled={remainingDrops !== null && drops.length >= remainingDrops}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontSize: 12,
              fontWeight: 600,
              color: "#11117C",
              background: "#eef0f6",
              border: "none",
              borderRadius: 8,
              padding: "6px 12px",
              cursor:
                remainingDrops !== null && drops.length >= remainingDrops
                  ? "not-allowed"
                  : "pointer",
              opacity:
                remainingDrops !== null && drops.length >= remainingDrops
                  ? 0.4
                  : 1,
            }}
          >
            <FiPlus size={13} />
            Add Drop
          </button>
        </div>

        {drops.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "20px 0",
              color: "#9ca3af",
              fontSize: 13,
              background: "#fafbff",
              borderRadius: 10,
              border: "1px dashed #eef0f6",
            }}
          >
            No drops added yet. Click "Add Drop" to begin.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {drops.map((drop, i) => (
              <div
                key={i}
                style={{
                  background: "#f8f9ff",
                  borderRadius: 10,
                  border: "1px solid #eef0f6",
                  padding: "12px 14px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 8,
                  }}
                >
                  <span
                    style={{ fontSize: 11, fontWeight: 700, color: "#11117C" }}
                  >
                    Drop #{i + 1}
                  </span>
                  <button
                    onClick={() => removeDrop(i)}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "#ef4444",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    <FiTrash2 size={13} />
                  </button>
                </div>

                <div
                  style={{ display: "flex", flexDirection: "column", gap: 6 }}
                >
                  <input
                    style={{ ...inputStyle, fontSize: 12 }}
                    placeholder="Recipient name *"
                    value={drop.recipient_name}
                    onChange={(e) =>
                      updateDrop(i, "recipient_name", e.target.value)
                    }
                  />
                  <input
                    style={{ ...inputStyle, fontSize: 12 }}
                    placeholder="Recipient phone *"
                    value={drop.recipient_phone}
                    onChange={(e) =>
                      updateDrop(i, "recipient_phone", e.target.value)
                    }
                  />
                  <input
                    style={{ ...inputStyle, fontSize: 12 }}
                    placeholder="Delivery address *"
                    value={drop.address}
                    onChange={(e) => updateDrop(i, "address", e.target.value)}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ModalFooter>
        <CancelButton onClick={handleClose} />
        <SubmitButton
          onClick={handleSubmit}
          loading={submitting}
          label={`Create Manifest${drops.length > 0 ? ` · ${drops.length} drop${drops.length === 1 ? "" : "s"}` : ""}`}
          loadingLabel="Creating…"
        />
      </ModalFooter>
    </ModalShell>
  );
};
