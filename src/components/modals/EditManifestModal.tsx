import { useEffect, useState } from "react";
import { supabase } from "../../constants/supabaseClient";
import { inputStyle } from "../constants";
import {
  ModalShell,
  ErrorBanner,
  ModalFooter,
  CancelButton,
  SubmitButton,
} from "./AddOperatorModal";
import { FiPlus, FiTrash2 } from "react-icons/fi";
import type { Manifests } from "../types/Types";

type DropInput = {
  recipient_name: string;
  recipient_phone: string;
  delivery_address: string;
};

type ExistingDrop = DropInput & {
  id: string;
  drop_number: number;
  status: "pending" | "delivered" | "failed";
};

type Props = {
  visible: boolean;
  manifest: Manifests | null;
  onClose: () => void;
  onSuccess: () => void;
};

const EMPTY_DROP: DropInput = {
  recipient_name: "",
  recipient_phone: "",
  delivery_address: "",
};

export const EditManifestModal = ({
  visible,
  manifest,
  onClose,
  onSuccess,
}: Props) => {
  const [existingDrops, setExistingDrops] = useState<ExistingDrop[]>([]);
  const [newDrops, setNewDrops] = useState<DropInput[]>([]);
  const [loadingDrops, setLoadingDrops] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remainingAllowance = manifest?.subscription?.tier
    ? manifest.subscription.tier.monthly_drops -
      manifest.subscription.drops_used
    : null;

  console.log("remainingAllowance", remainingAllowance);

  // fetch existing drops when modal opens
  useEffect(() => {
    if (!visible || !manifest) return;
    setLoadingDrops(true);
    setNewDrops([]);
    setError(null);

    supabase
      .from("drops")
      .select(
        "id, drop_number, recipient_name, recipient_phone, delivery_address, status",
      )
      .eq("manifest_id", manifest.id)
      .order("drop_number", { ascending: true })
      .then(({ data, error: err }) => {
        if (err) console.error(err);
        setExistingDrops((data ?? []) as ExistingDrop[]);
        setLoadingDrops(false);
      });
  }, [visible, manifest]);

  const reset = () => {
    setExistingDrops([]);
    setNewDrops([]);
    setError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  // ── New drop helpers ───────────────────────────────────────────────────
  const addDrop = () => {
    // const totalAfterAdd = existingDrops.length + newDrops.length + 1;
    if (remainingAllowance !== null && newDrops.length >= remainingAllowance) {
      setError(
        `Cannot add more drops. Only ${remainingAllowance} drop${remainingAllowance === 1 ? "" : "s"} remaining in this subscription.`,
      );
      return;
    }
    setNewDrops((d) => [...d, { ...EMPTY_DROP }]);
  };

  const removeNewDrop = (i: number) =>
    setNewDrops((d) => d.filter((_, idx) => idx !== i));

  const updateNewDrop = (i: number, field: keyof DropInput, value: string) =>
    setNewDrops((d) =>
      d.map((drop, idx) => (idx === i ? { ...drop, [field]: value } : drop)),
    );

  // ── Submit — only inserts new drops, updates drop_count on manifest ────
  const handleSubmit = async () => {
    setError(null);

    if (newDrops.length === 0) {
      setError("No new drops to save.");
      return;
    }

    for (let i = 0; i < newDrops.length; i++) {
      const d = newDrops[i];
      if (!d.recipient_name || !d.recipient_phone || !d.delivery_address) {
        setError(
          `Drop #${existingDrops.length + i + 1} is incomplete. Fill in all fields.`,
        );
        return;
      }
    }

    if (remainingAllowance !== null && newDrops.length > remainingAllowance) {
      setError(
        `Adding ${newDrops.length} drop${newDrops.length === 1 ? "" : "s"} exceeds the remaining allowance of ${remainingAllowance}.`,
      );
      return;
    }

    if (!manifest) return;
    setSubmitting(true);

    try {
      // 1. Insert new drops, continuing drop_number sequence
      const dropRows = newDrops.map((d, i) => ({
        manifest_id: manifest.id,
        drop_number: existingDrops.length + i + 1,
        recipient_name: d.recipient_name,
        recipient_phone: d.recipient_phone,
        address: d.delivery_address,
      }));

      const { error: dropsError } = await supabase
        .from("drops")
        .insert(dropRows);
      if (dropsError) throw dropsError;

      // 2. Update drop_count on manifest
      const { error: manifestError } = await supabase
        .from("manifests")
        .update({ drop_count: existingDrops.length + newDrops.length })
        .eq("id", manifest.id);
      if (manifestError) throw manifestError;

      // 3. Increment drops_used on subscription
      if (manifest.subscription_id) {
        const { error: usageError } = await supabase
          .from("client_subscriptions")
          .update({
            drops_used:
              (manifest.subscription?.drops_used ?? 0) + newDrops.length,
          })
          .eq("id", manifest.subscription_id);
        if (usageError) throw usageError;
      }

      reset();
      onSuccess();
    } catch (err: any) {
      setError(err?.message ?? "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!visible || !manifest) return null;

  const totalDrops = existingDrops.length + newDrops.length;

  return (
    <ModalShell
      title="Edit Manifest"
      subtitle={`${manifest.ref_number} · ${totalDrops} drop${totalDrops === 1 ? "" : "s"} total`}
      onClose={handleClose}
    >
      {error && <ErrorBanner message={error} />}

      {/* Drop count summary — read only */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 10,
          marginBottom: 20,
        }}
      >
        {[
          { label: "Existing Drops", value: existingDrops.length },
          { label: "New Drops", value: newDrops.length },
          {
            label: "Allowance Left",
            value:
              remainingAllowance !== null
                ? Math.max(0, remainingAllowance - newDrops.length)
                : "—",
          },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              background: "#f8f9ff",
              borderRadius: 10,
              padding: "10px 12px",
              textAlign: "center",
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: 18,
                fontWeight: 800,
                color: "#11117C",
              }}
            >
              {s.value}
            </p>
            <p
              style={{
                margin: "2px 0 0",
                fontSize: 10,
                color: "#9ca3af",
                fontWeight: 600,
              }}
            >
              {s.label}
            </p>
          </div>
        ))}
      </div>

      {/* Existing drops — read only, locked */}
      {loadingDrops ? (
        <p style={{ fontSize: 13, color: "#9ca3af", textAlign: "center" }}>
          Loading existing drops…
        </p>
      ) : existingDrops.length > 0 ? (
        <div style={{ marginBottom: 16 }}>
          <p
            style={{
              margin: "0 0 8px",
              fontSize: 12,
              fontWeight: 700,
              color: "#374151",
            }}
          >
            Existing Drops
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {existingDrops.map((drop) => (
              <div
                key={drop.id}
                style={{
                  background: "#f8f9ff",
                  border: "1px solid #eef0f6",
                  borderRadius: 10,
                  padding: "10px 14px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#1a1d2e",
                    }}
                  >
                    #{drop.drop_number} · {drop.recipient_name}
                  </p>
                  <p
                    style={{
                      margin: "2px 0 0",
                      fontSize: 11,
                      color: "#9ca3af",
                    }}
                  >
                    {drop.recipient_phone} · {drop.delivery_address}
                  </p>
                </div>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: "3px 8px",
                    borderRadius: 6,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                    background:
                      drop.status === "delivered"
                        ? "#f0fdf4"
                        : drop.status === "failed"
                          ? "#fef2f2"
                          : "#f8f9ff",
                    color:
                      drop.status === "delivered"
                        ? "#166534"
                        : drop.status === "failed"
                          ? "#991b1b"
                          : "#6b7280",
                  }}
                >
                  {drop.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* New drops — editable */}
      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 8,
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
            Add New Drops
          </p>
          <button
            onClick={addDrop}
            disabled={
              remainingAllowance !== null &&
              newDrops.length >= remainingAllowance
            }
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
                remainingAllowance !== null &&
                newDrops.length >= remainingAllowance
                  ? "not-allowed"
                  : "pointer",
              opacity:
                remainingAllowance !== null &&
                newDrops.length >= remainingAllowance
                  ? 0.4
                  : 1,
            }}
          >
            <FiPlus size={13} />
            Add Drop
          </button>
        </div>

        {newDrops.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "16px 0",
              color: "#9ca3af",
              fontSize: 13,
              background: "#fafbff",
              borderRadius: 10,
              border: "1px dashed #eef0f6",
            }}
          >
            No new drops added yet.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {newDrops.map((drop, i) => (
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
                    Drop #{existingDrops.length + i + 1}
                  </span>
                  <button
                    onClick={() => removeNewDrop(i)}
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
                      updateNewDrop(i, "recipient_name", e.target.value)
                    }
                  />
                  <input
                    style={{ ...inputStyle, fontSize: 12 }}
                    placeholder="Recipient phone *"
                    value={drop.recipient_phone}
                    onChange={(e) =>
                      updateNewDrop(i, "recipient_phone", e.target.value)
                    }
                  />
                  <input
                    style={{ ...inputStyle, fontSize: 12 }}
                    placeholder="Delivery address *"
                    value={drop.delivery_address}
                    onChange={(e) =>
                      updateNewDrop(i, "delivery_address", e.target.value)
                    }
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
          label={
            newDrops.length > 0
              ? `Save ${newDrops.length} New Drop${newDrops.length === 1 ? "" : "s"}`
              : "No Changes"
          }
          loadingLabel="Saving…"
        />
      </ModalFooter>
    </ModalShell>
  );
};
