import { useState, useEffect } from "react";
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

export type CoordinatorRow = {
  id: string;
  full_name: string;
  phone_no: string | null;
  email: string;
  coordinator: {
    address: string | null;
  } | null;
};

type FormData = {
  fullname: string;
  phoneNo: string;
  email: string;
  address: string;
};

type Props = {
  visible: boolean;
  coordinator: CoordinatorRow | null;
  onClose: () => void;
  onSuccess: () => void;
};

export const EditCoordinatorModal = ({
  visible,
  coordinator,
  onClose,
  onSuccess,
}: Props) => {
  const [formData, setFormData] = useState<FormData>({
    fullname: "",
    phoneNo: "",
    email: "",
    address: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Populate form when operator changes
  useEffect(() => {
    if (coordinator) {
      setFormData({
        fullname: coordinator.full_name ?? "",
        phoneNo: coordinator.phone_no ?? "",
        address: coordinator.coordinator?.address ?? "",
        email: coordinator.email,
      });
      setError(null);
    }
  }, [coordinator]);

  const handleClose = () => {
    setError(null);
    onClose();
  };

  const handleSubmit = async () => {
    setError(null);
    if (!formData.fullname.trim()) {
      setError("Full name is required.");
      return;
    }
    if (!coordinator) return;

    setSubmitting(true);
    try {
      // Update profile
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: formData.fullname.trim(),
          phone_no: formData.phoneNo.trim() || null,
        })
        .eq("id", coordinator.id);

      if (profileError) throw profileError;

      // Upsert operator record (in case it doesn't exist yet)
      const { error: coordinatorError } = await supabase
        .from("coordinators")
        .upsert({
          id: coordinator.id,
          address: formData.address.trim() || null,
        });

      if (coordinatorError) throw coordinatorError;

      onSuccess();
    } catch (err: any) {
      setError(err?.message ?? "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!visible || !coordinator) return null;

  return (
    <ModalShell
      title="Edit Operator"
      subtitle={`Editing details for ${coordinator.full_name}`}
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
          label="Save Changes"
          loadingLabel="Saving…"
        />
      </ModalFooter>
    </ModalShell>
  );
};
