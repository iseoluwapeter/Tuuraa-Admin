import { useState, useEffect } from "react";
import { supabase } from "../constants/supabaseClient";
import type { Manifests, DropEntry } from "../components/types/Types";

const formatDateTime = (date?: string | null) => {
  if (!date) return "—";

  return new Date(date).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const STATUS_STYLES: Record<
  string,
  { bg: string; text: string; label: string }
> = {
  pending: { bg: "#fff7ed", text: "#c2410c", label: "Pending" },
  processing: { bg: "#eff6ff", text: "#1d4ed8", label: "Processing" },
  completed: { bg: "#f0fdf4", text: "#15803d", label: "Completed" },
};

export const StatusBadge = ({ status }: { status: string }) => {
  const s = STATUS_STYLES[status] ?? {
    bg: "#f3f4f6",
    text: "#6b7280",
    label: status,
  };
  return (
    <span
      style={{
        background: s.bg,
        color: s.text,
        fontSize: 11,
        fontWeight: 700,
        padding: "3px 10px",
        borderRadius: 20,
        textTransform: "capitalize",
        letterSpacing: "0.03em",
      }}
    >
      {s.label}
    </span>
  );
};

// const ProgressBar = ({ done, total }: { done: number; total: number }) => {
//   const pct = total > 0 ? Math.min((done / total) * 100, 100) : 0;
//   return (
//     <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
//       <div
//         style={{
//           flex: 1,
//           height: 6,
//           background: "#eef0f6",
//           borderRadius: 99,
//           overflow: "hidden",
//           minWidth: 60,
//         }}
//       >
//         <div
//           style={{
//             width: `${pct}%`,
//             height: "100%",
//             background: pct === 100 ? "#16a34a" : "#11117C",
//             borderRadius: 99,
//             transition: "width 0.3s",
//           }}
//         />
//       </div>
//       <span style={{ fontSize: 11, color: "#6b7280", whiteSpace: "nowrap" }}>
//         {done}/{total}
//       </span>
//     </div>
//   );
// };

export const ManifestDrawer = ({
  manifest,
  onClose,
}: {
  manifest: Manifests | null;
  onClose: () => void;
}) => {
  const [drops, setDrops] = useState<DropEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!manifest) return;
    setLoading(true);
    supabase
      .from("drops")
      .select(
        "id, drop_number, out_for_delivery_at, recipient_name,delivered_at, recipient_phone, delivery_address, status, created_at",
      )
      .eq("manifest_id", manifest.id)
      .order("drop_number", { ascending: true })
      .then(({ data, error }) => {
        if (error) {
          console.error("drops fetch error:", error);
        }
        setDrops(data ?? []);
        console.log(data);
        setLoading(false);
      });
    // .then(({ data }) => {
    //   setDrops(data ?? []);
    //   setLoading(false);
    //   console.log("drops", data)
    // });
  }, [manifest]);

  if (!manifest) return null;

  // fix stale field references
  const tierName = manifest.subscription?.tier?.name ?? "—";
  const clientName = manifest.client?.business_name ?? "—";

  const deliveredCount = drops.filter((d) => d.status === "delivered").length;
  const failedCount = drops.filter((d) => d.status === "failed").length;
  // const pendingCount = drops.filter((d) => d.status === "pending").length;

  const statusColor: Record<
    "pending" | "rider_assigned" | "out_for_delivery" | "delivered" | "failed",
    { bg: string; color: string }
  > = {
    pending: { bg: "#fff7ed", color: "#92400e" },
    rider_assigned: { bg: "#fff7ed", color: "#92400e" },
    out_for_delivery: { bg: "#fff7ed", color: "#92400e" },
    delivered: { bg: "#f0fdf4", color: "#166534" },
    failed: { bg: "#fef2f2", color: "#991b1b" },
  };

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(17,17,124,0.08)",
          zIndex: 40,
        }}
      />
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: 420,
          background: "#fff",
          zIndex: 50,
          boxShadow: "-4px 0 32px rgba(17,17,124,0.1)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 24px 16px",
            borderBottom: "1px solid #eef0f6",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <div>
            <p
              style={{
                margin: 0,
                fontSize: 11,
                color: "#9ca3af",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Manifest Detail
            </p>
            <h2
              style={{
                margin: "4px 0 0",
                fontSize: 16,
                fontWeight: 800,
                color: "#11117C",
              }}
            >
              {clientName}
            </h2>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: "#9ca3af" }}>
              {manifest.ref_number} · {tierName}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "#f5f6fa",
              border: "none",
              borderRadius: 8,
              width: 30,
              height: 30,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#6b7280",
              fontSize: 16,
            }}
          >
            ×
          </button>
        </div>

        {/* Summary cards */}
        <div
          style={{ padding: "16px 24px", borderBottom: "1px solid #f0f2f8" }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 10,
            }}
          >
            {[
              { label: "Total Drops", value: manifest.drops_count },
              { label: "Delivered", value: deliveredCount },
              { label: "Failed", value: failedCount },
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
                    fontSize: 16,
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
          <div style={{ marginTop: 8 }}>
            <span style={{ fontSize: 11, color: "#9ca3af" }}>
              Created{" "}
              {new Date(manifest.created_at).toLocaleDateString("en-NG", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
          </div>
        </div>

        {/* Drops list */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
          <p
            style={{
              margin: "0 0 12px",
              fontSize: 12,
              fontWeight: 700,
              color: "#374151",
            }}
          >
            Drops ({drops.length})
          </p>

          {loading ? (
            <p
              style={{
                color: "#9ca3af",
                fontSize: 13,
                textAlign: "center",
                marginTop: 32,
              }}
            >
              Loading drops…
            </p>
          ) : drops.length === 0 ? (
            <div style={{ textAlign: "center", padding: "32px 0" }}>
              <p style={{ fontSize: 28, margin: "0 0 8px" }}>📦</p>
              <p style={{ color: "#9ca3af", fontSize: 13, margin: 0 }}>
                No drops on this manifest
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {drops.map((drop) => {
                const colors = statusColor[drop.status];
                return (
                  <div
                    key={drop.id}
                    style={{
                      background: "#f8f9ff",
                      border: "1px solid #eef0f6",
                      borderRadius: 10,
                      padding: "10px 14px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                      }}
                    >
                      <div>
                        <p
                          style={{
                            margin: 0,
                            fontSize: 12,
                            fontWeight: 700,
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
                          Recipient Phone: {drop.recipient_phone}
                        </p>
                        <p
                          style={{
                            margin: "2px 0 0",
                            fontSize: 11,
                            color: "#6b7280",
                          }}
                        >
                          Delivery Address: {drop.delivery_address}
                        </p>
                        <p
                          style={{
                            margin: "2px 0 0",
                            fontSize: 11,
                            color: "#6b7280",
                          }}
                        >
                          Out For Delivery At:{" "}
                          {formatDateTime(drop.out_for_delivery_at)}
                        </p>

                        <p
                          style={{
                            margin: "2px 0 0",
                            fontSize: 11,
                            color: "#6b7280",
                          }}
                        >
                          Delivered At: {formatDateTime(drop.delivered_at)}
                        </p>
                      </div>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: "3px 8px",
                          borderRadius: 6,
                          background: colors.bg,
                          color: colors.color,
                          textTransform: "uppercase",
                          letterSpacing: "0.04em",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {drop.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
};
