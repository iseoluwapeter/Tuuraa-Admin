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

export type OperatorRow = {
  id: string;
  full_name: string;
  phone_no: string | null;
  vehicle_type: string | null;
  address: string | null;
};

type FormData = {
  fullname: string;
  phoneNo: string;
  vehicle_type: string;
  address: string;
};

type Props = {
  visible: boolean;
  operator: OperatorRow | null;
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

export const EditOperatorModal = ({
  visible,
  operator,
  onClose,
  onSuccess,
}: Props) => {
  const [formData, setFormData] = useState<FormData>({
    fullname: "",
    phoneNo: "",
    vehicle_type: "bike",
    address: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Populate form when operator changes
  useEffect(() => {
    if (operator) {
      setFormData({
        fullname: operator.full_name ?? "",
        phoneNo: operator.phone_no ?? "",
        vehicle_type: operator.vehicle_type ?? "bike",
        address: operator.address ?? "",
      });
      setError(null);
    }
  }, [operator]);

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
    if (!operator) return;

    setSubmitting(true);
    try {
      // Update profile
      const { error: profileError } = await supabase
        .from("operators")
        .update({
          full_name: formData.fullname.trim(),
          phone_no: formData.phoneNo.trim() || null,
          vehicle_type: formData.vehicle_type,
          address: formData.address.trim() || null,
        })
        .eq("id", operator.id);

      if (profileError) throw profileError;

      // Upsert operator record (in case it doesn't exist yet)
      // const { error: operatorError } = await supabase.from("operators").upsert({
      //   id: operator.id,
      // });

      // if (operatorError) throw operatorError;

      onSuccess();
    } catch (err: any) {
      setError(err?.message ?? "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!visible || !operator) return null;

  return (
    <ModalShell
      title="Edit Operator"
      subtitle={`Editing details for ${operator.full_name}`}
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
          label="Save Changes"
          loadingLabel="Saving…"
        />
      </ModalFooter>
    </ModalShell>
  );
};
