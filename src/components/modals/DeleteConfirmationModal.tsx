import { useState } from "react";
import {
  ModalShell,
  ModalFooter,
  CancelButton,
  SubmitButton,
} from "./AddOperatorModal";

type Props = {
  visible: boolean;
  /** Display name of the entity being deleted — shown in the confirmation copy */
  entityName: string;
  /** Short noun describing what is being deleted, e.g. "operator", "user", "task" */
  entityType?: string;
  /** Extra warning shown below the main copy, e.g. "All associated tasks will also be removed." */
  warningText?: string;
  onClose: () => void;
  /** Caller performs the actual delete and throws on failure */
  onConfirm: () => Promise<void>;
};

export const DeleteConfirmModal = ({
  visible,
  entityName,
  entityType = "item",
  warningText,
  onClose,
  onConfirm,
}: Props) => {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setError(null);
    setDeleting(true);
    try {
      await onConfirm();
      onClose();
    } catch (err: any) {
      setError(err?.message ?? "Deletion failed. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  const handleClose = () => {
    setError(null);
    onClose();
  };

  if (!visible) return null;

  return (
    <ModalShell
      title={`Delete ${entityType.charAt(0).toUpperCase() + entityType.slice(1)}`}
      onClose={handleClose}
      maxWidth={420}
    >
      {/* Icon */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 12,
          marginBottom: 20,
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: "#fef2f2",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg
            width="26"
            height="26"
            fill="none"
            viewBox="0 0 24 24"
            stroke="#dc2626"
            strokeWidth={1.8}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
          </svg>
        </div>

        <div style={{ textAlign: "center" }}>
          <p
            style={{
              margin: 0,
              fontSize: 14,
              color: "#374151",
              lineHeight: 1.6,
            }}
          >
            Are you sure you want to delete{" "}
            <strong style={{ color: "#111827" }}>{entityName}</strong>?
            <br />
            This action <strong>cannot be undone</strong>.
          </p>

          {warningText && (
            <p
              style={{
                margin: "10px 0 0",
                fontSize: 12,
                color: "#9ca3af",
                background: "#fffbeb",
                border: "1px solid #fde68a",
                borderRadius: 8,
                padding: "8px 12px",
              }}
            >
              ⚠️ {warningText}
            </p>
          )}
        </div>
      </div>

      {error && (
        <div
          style={{
            background: "#fff1f1",
            border: "1px solid #fecaca",
            borderRadius: 8,
            padding: "10px 13px",
            fontSize: 12,
            color: "#b91c1c",
            marginBottom: 14,
          }}
        >
          ⚠️ {error}
        </div>
      )}

      <ModalFooter>
        <CancelButton onClick={handleClose} />
        <SubmitButton
          onClick={handleConfirm}
          loading={deleting}
          label="Delete"
          loadingLabel="Deleting…"
          danger
        />
      </ModalFooter>
    </ModalShell>
  );
};
