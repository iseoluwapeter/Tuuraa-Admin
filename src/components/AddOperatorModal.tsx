import { useEffect, useState } from "react";
import { supabase } from "../constants/supabaseClient";
import { inputStyle } from "./constants";
import {
  ModalShell,
  FieldGroup,
  Field,
  ErrorBanner,
  ModalFooter,
  CancelButton,
  SubmitButton,
} from "./modals/AddOperatorModal";
import type { Manifests } from "./types/Types";

type OperatorOption = {
  id: string;
  full_name: string;
};

type Props = {
  visible: boolean;
  manifest: Manifests | null;
  onClose: () => void;
  onSuccess: () => void;
};

export const AssignOperatorModal = ({
  visible,
  manifest,
  onClose,
  onSuccess,
}: Props) => {
  const [operators, setOperators] = useState<OperatorOption[]>([]);
  const [loadingOperators, setLoadingOperators] = useState(false);
  const [operatorId, setOperatorId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setError(null);
    // Pre-select the currently assigned operator, if any.
    setOperatorId(manifest?.operator_id ?? "");

    setLoadingOperators(true);
    supabase
      .from("operators")
      .select("id, full_name")
      .order("full_name", { ascending: true })
      .then(({ data, error: err }) => {
        if (err) console.error(err);
        setOperators(data ?? []);
        setLoadingOperators(false);
      });
  }, [visible, manifest]);

  const handleClose = () => {
    setError(null);
    onClose();
  };

  const handleSubmit = async () => {
    if (!manifest) return;
    setError(null);

    if (!operatorId) {
      setError("Select an operator to assign.");
      return;
    }

    setSubmitting(true);
    try {
      const { error: rpcErr } = await supabase.rpc(
        "assign_operator_to_manifest",
        {
          p_manifest_id: manifest.id,
          p_operator_id: operatorId,
        },
      );
      if (rpcErr) throw rpcErr;

      onSuccess();
    } catch (err: any) {
      setError(err?.message ?? "Failed to assign operator.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!visible || !manifest) return null;

  return (
    <ModalShell
      title="Assign Operator"
      subtitle={manifest.ref_number}
      onClose={handleClose}
    >
      {error && <ErrorBanner message={error} />}

      <FieldGroup>
        <Field label="Operator *">
          {loadingOperators ? (
            <p style={{ fontSize: 13, color: "#9ca3af" }}>Loading operators…</p>
          ) : (
            <select
              style={inputStyle}
              value={operatorId}
              onChange={(e) => setOperatorId(e.target.value)}
            >
              <option value="">Select operator</option>
              {operators.map((op) => (
                <option key={op.id} value={op.id}>
                  {op.full_name}
                </option>
              ))}
            </select>
          )}
        </Field>
      </FieldGroup>

      <ModalFooter>
        <CancelButton onClick={handleClose} />
        <SubmitButton
          onClick={handleSubmit}
          loading={submitting}
          label="Assign Operator"
          loadingLabel="Assigning…"
        />
      </ModalFooter>
    </ModalShell>
  );
};
