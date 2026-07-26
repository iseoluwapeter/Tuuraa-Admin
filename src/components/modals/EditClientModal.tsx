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
  business_name: string;
  email: string | null;
  phone: string;
  default_pickup_address: string | null;
  account_manager_id: string | null;
};

type FormData = {
  business_name: string;
  email: string;
  phone: string;
  default_pickup_address: string;
  account_manager_id: string;
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
    business_name: "",
    email: "",
    phone: "bike",
    account_manager_id: "",
    default_pickup_address: "",
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
        business_name: client.business_name ?? "",
        phone: client.phone ?? "",
        email: client.email ?? "",
        default_pickup_address: client.default_pickup_address ?? "",
        account_manager_id: client.account_manager_id ?? "",
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
    if (!formData.business_name.trim()) {
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
          business_name: formData.business_name,
          email: formData.email,
          phone: formData.phone,
          default_pickup_address: formData.default_pickup_address,
          account_manager_id: formData.account_manager_id || null,
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
      subtitle={`Editing details for ${client.business_name}`}
      onClose={handleClose}
    >
      {error && <ErrorBanner message={error} />}

      <FieldGroup>
        <Field label="Full Name *">
          <input
            style={inputStyle}
            placeholder="e.g. Emeka Okonkwo"
            value={formData.business_name}
            onChange={(e) =>
              setFormData((f) => ({
                ...f,
                fullname: e.target.value,
              }))
            }
          />
        </Field>

        <Field label="Phone Number">
          <input
            style={inputStyle}
            type="tel"
            placeholder="+234 801 234 5678"
            value={formData.phone}
            onChange={(e) =>
              setFormData((f) => ({ ...f, phone: e.target.value }))
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
              value={formData.default_pickup_address}
              onChange={(e) =>
                setFormData((f) => ({
                  ...f,
                  default_pickup_address: e.target.value,
                }))
              }
            />
          </Field>
          <Field label="Assigned Coordinator">
            <select
              style={inputStyle}
              value={formData.account_manager_id}
              onChange={(e) =>
                setFormData((f) => ({
                  ...f,
                  account_manager_id: e.target.value,
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
