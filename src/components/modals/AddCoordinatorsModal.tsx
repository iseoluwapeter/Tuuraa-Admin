// src/components/modals/AddCoordinatorsModal.tsx
import { useState } from "react";
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
  fullname: string;
  email: string;
  phoneNo: string;
  address: string;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

const INITIAL_FORM: FormData = {
  fullname: "",
  email: "",
  phoneNo: "",
  address: "",
};

export const AddCoordinatorsModal = ({
  visible,
  onClose,
  onSuccess,
}: Props) => {
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
      // Get current admin's JWT to authenticate the edge function call
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();
      if (sessionError || !session)
        throw new Error("Admin session not found. Please log in again.");

      const { data, error: fnError } = await supabase.functions.invoke(
        "create-staff",
        {
          body: {
            email: formData.email.trim(),
            fullName: formData.fullname.trim(),
            phoneNo: formData.phoneNo.trim() || null,
            address: formData.address.trim() || null,
            role: "coordinator",
          },
          headers: {
            // Pass the admin JWT so the edge function can verify caller identity
            Authorization: `Bearer ${session.access_token}`,
          },
        },
      );

      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);
      console.log(data)
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
      title="Add New Coordinator"
      subtitle="Coordinator will receive an email to set their password"
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
            placeholder="coordinator@example.com"
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
      </FieldGroup>

      <ModalFooter>
        <CancelButton onClick={handleClose} />
        <SubmitButton
          onClick={handleSubmit}
          loading={submitting}
          label="Add Coordinator"
          loadingLabel="Creating…"
        />
      </ModalFooter>
    </ModalShell>
  );
};
