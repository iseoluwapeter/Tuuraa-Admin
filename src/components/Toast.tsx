type Toast = { message: string; type: "success" | "error" } | null;


export const Toast = ({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: () => void;
}) => {
  if (!toast) return null;
  return (
    <div
      style={{
        position: "fixed",
        bottom: 28,
        right: 28,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "12px 18px",
        borderRadius: 10,
        background: toast.type === "success" ? "#0a5c3a" : "#5c0a0a",
        color: "#fff",
        fontSize: 13,
        fontWeight: 500,
        boxShadow: "0 8px 32px rgba(0,0,0,0.22)",
        animation: "slideUp 0.25s ease",
      }}
    >
      <span>{toast.type === "success" ? "✓" : "✕"}</span>
      <span>{toast.message}</span>
      <button
        onClick={onDismiss}
        style={{
          marginLeft: 8,
          background: "none",
          border: "none",
          color: "rgba(255,255,255,0.7)",
          cursor: "pointer",
          fontSize: 16,
          lineHeight: 1,
        }}
      >
        ×
      </button>
    </div>
  );
};
