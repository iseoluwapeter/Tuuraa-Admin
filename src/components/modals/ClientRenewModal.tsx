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

type FormData = {
  tier: string;
  cycle_start: string;
  cycle_end: string;
};

type Props = {
  visible: boolean;
  clientId: string | null;
  onClose: () => void;
  onSuccess: () => void;
};

type Tier = { id: string; name: string };

const INITIAL_FORM: FormData = {
  tier: "",
  cycle_start: "",
  cycle_end: "",
};

export const ClientRenewModal = ({
  visible,
  clientId,
  onClose,
  onSuccess,
}: Props) => {
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dropdown, setDropdown] = useState<{
    allTiers: Tier[];
  }>({
    allTiers: [],
  });

  const reset = () => {
    setFormData(INITIAL_FORM);
    setError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const fetchDropdown = useCallback(async () => {
    try {
      const [packageRes] = await Promise.all([
        supabase.from("package_tiers").select("id, name"),
      ]);

      setDropdown({
        allTiers: packageRes.data ?? [],
      });
    } catch (error) {
      console.log("Failed to fetch dropdown data:", error);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      fetchDropdown();
    }
  }, [visible, fetchDropdown]);

  const handleSubmit = async () => {
    setError(null);
    if (!formData.tier.trim()) {
      setError("Please select a tier and set the cycle dates.");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.rpc("renew_client_subscription", {
        p_client_id: clientId,
        p_tier_id: formData.tier,
        p_cycle_start: formData.cycle_start,
        p_cycle_end: formData.cycle_end,
      });
      if (error) throw error;
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
      title="Add New Client"
      subtitle="Operator will receive an email to set their password"
      onClose={handleClose}
    >
      {error && <ErrorBanner message={error} />}

      <FieldGroup>
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
        >
          <Field label="Select Tier">
            <select
              style={inputStyle}
              value={formData.tier}
              onChange={(e) =>
                setFormData((f) => ({
                  ...f,
                  tier: e.target.value,
                }))
              }
            >
              <option value="">Select tier</option>

              {dropdown.allTiers.map((tier: any) => (
                <option key={tier.id} value={tier.id}>
                  {tier.name}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
        >
          <Field label="Cycle start">
            <input
              style={inputStyle}
              type="date"
              placeholder="e.g. Lekki Phase 1"
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
              placeholder="e.g. Lekki Phase 1"
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
          label="Change Subscription"
          loadingLabel="Changing..."
        />
      </ModalFooter>
    </ModalShell>
  );
};
