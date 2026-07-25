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

type ClientRow = {
  id: string;
  full_name: string;
  email: string;
  contact: string;
  assigned_coordinator: string;
  address: string;
  profiles?: {
    full_name: string;
  } | null;
};

type FormData = {
  fullname: string;
  email: string;
  contact: string;
  assigned_coordinator: string;
  address: string;
};

type Props = {
  visible: boolean;
  client: ClientRow | null;
  onClose: () => void;
  onSuccess: () => void;
};

type Coordinator = {
  id: string;
  full_name: string;
};

export const EditClientModal = ({
  visible,
  client,
  onClose,
  onSuccess,
}: Props) => {
  const [formData, setFormData] = useState<FormData>({
    fullname: "",
    email: "",
    contact: "bike",
    assigned_coordinator: "",
    address: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [coordinators, setCoordinators] = useState<Coordinator[]>([]);

  useEffect(() => {
    const fetchCoordinators = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("role", "coordinator");

      if (!error) setCoordinators(data || []);
    };

    fetchCoordinators();
  }, []);

  useEffect(() => {
    if (client) {
      setFormData({
        fullname: client.full_name ?? "",
        contact: client.contact ?? "",
        email: client.email,
        address: client.address ?? "",
        assigned_coordinator: client.assigned_coordinator ?? "",
      });
      setError(null);
    }
  }, [client]);

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
    if (!client) return;

    setSubmitting(true);
    try {
      // Update profile
      const { error: clientError } = await supabase
        .from("clients")
        .update({
          full_name: formData.fullname.trim(),
          contact: formData.contact.trim() || null,
          email: formData.email.trim(),
          assigned_coordinator: formData.assigned_coordinator.trim(),
          address: formData.address.trim(),
        })
        .eq("id", client.id);

      if (clientError) throw clientError;

      onSuccess();
    } catch (err: any) {
      setError(err?.message ?? "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!visible || !client) return null;

  return (
    <ModalShell
      title="Edit Operator"
      subtitle={`Editing details for ${client.full_name}`}
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
            value={formData.contact}
            onChange={(e) =>
              setFormData((f) => ({ ...f, phoneNo: e.target.value }))
            }
          />
        </Field>

        <Field label="Email">
          <input
            style={inputStyle}
            type="email"
            placeholder="+234 801 234 5678"
            value={formData.email}
            onChange={(e) =>
              setFormData((f) => ({ ...f, email: e.target.value }))
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

              {coordinators.map((coord) => (
                <option key={coord.id} value={coord.id}>
                  {coord.full_name}
                </option>
              ))}
            </select>
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
