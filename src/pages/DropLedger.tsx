import { useEffect, useState, useCallback } from "react";
import * as RDT from "react-data-table-component";
import type { TableColumn } from "react-data-table-component";
import { supabase } from "../constants/supabaseClient";
import { Toast } from "../components/Toast";
import { StatCard } from "../components/StatCard";
import { FiSearch, FiX } from "react-icons/fi";
import { MdOutlineReceiptLong } from "react-icons/md";

const DataTable = (RDT as any).default?.default ?? (RDT as any).default;
type ToastState = { message: string; type: "success" | "error" } | null;

// ─── Types ────────────────────────────────────────────────────────────────────

type DropEntry = {
  id: string;
  drop_number: number;
  status: string;
  recipient_name: string;
  recipient_phone: string;
  delivery_address: string;
  delivered_at: string | null;
  failed_at: string | null;
  out_for_delivery_at: string | null;
  created_at: string;
  manifest_id: string;
  // joined (flattened from manifests → clients / client_subscriptions)
  client_id: string | null;
  subscription_id: string | null;
  manifest_status: string | null;
  client: { business_name: string } | null;
  package_tier: { name: string } | null;
};

// ─── Main page ─────────────────────────────────────────────────────────────────

const DropLedger = () => {
  const [drops, setDrops] = useState<DropEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState<ToastState>(null);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchDrops = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("drops")
        .select(
          `
          id, drop_number, status, recipient_name, recipient_phone,
          delivery_address, delivered_at, failed_at, out_for_delivery_at,
          created_at, manifest_id,
          manifests (
            client_id, subscription_id, status,
            clients ( business_name ),
            client_subscriptions (
              package_tiers ( name )
            )
          )
        `,
        )
        .order("created_at", { ascending: false });

      if (error) throw error;

      const normalized: DropEntry[] = (data ?? []).map((row: any) => {
        const manifest = Array.isArray(row.manifests)
          ? row.manifests[0]
          : row.manifests;
        const client = manifest
          ? Array.isArray(manifest.clients)
            ? (manifest.clients[0] ?? null)
            : manifest.clients
          : null;
        const subscription = manifest
          ? Array.isArray(manifest.client_subscriptions)
            ? (manifest.client_subscriptions[0] ?? null)
            : manifest.client_subscriptions
          : null;
        const packageTier = subscription
          ? Array.isArray(subscription.package_tiers)
            ? (subscription.package_tiers[0] ?? null)
            : subscription.package_tiers
          : null;

        return {
          id: row.id,
          drop_number: row.drop_number,
          status: row.status,
          recipient_name: row.recipient_name,
          recipient_phone: row.recipient_phone,
          delivery_address: row.delivery_address,
          delivered_at: row.delivered_at,
          failed_at: row.failed_at,
          out_for_delivery_at: row.out_for_delivery_at,
          created_at: row.created_at,
          manifest_id: row.manifest_id,
          client_id: manifest?.client_id ?? null,
          subscription_id: manifest?.subscription_id ?? null,
          manifest_status: manifest?.status ?? null,
          client: client ? { business_name: client.business_name } : null,
          package_tier: packageTier ? { name: packageTier.name } : null,
        };
      });

      setDrops(normalized);
    } catch (err) {
      console.error(err);
      showToast("Failed to load drop ledger", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDrops();
  }, [fetchDrops]);

  const filtered = drops.filter((d) => {
    const q = search.toLowerCase();
    return (
      d.client?.business_name?.toLowerCase().includes(q) ||
      d.package_tier?.name?.toLowerCase().includes(q)
    );
  });

  // Stats
  const totalDrops = drops.length;
  const deliveredDrops = drops.filter((d) => d.status === "delivered").length;
  const failedDrops = drops.filter((d) => d.status === "failed").length;
  const pendingDrops = totalDrops - deliveredDrops - failedDrops;

  const columns: TableColumn<DropEntry>[] = [
    {
      name: "#",
      cell: (_, i) => (
        <span style={{ color: "#c0c4d0", fontSize: 11, fontWeight: 600 }}>
          {i + 1}
        </span>
      ),
      width: "48px",
    },
    {
      name: "Client",
      selector: (row) => row.client?.business_name ?? "",
      sortable: true,
      grow: 2,
      cell: (row) => (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "6px 0",
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: "#eef0ff",
              color: "#11117C",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {(row.client?.business_name ?? "?")[0].toUpperCase()}
          </div>
          <div>
            <p
              style={{
                margin: 0,
                fontSize: 13,
                fontWeight: 600,
                color: "#1a1d2e",
              }}
            >
              {row.client?.business_name ?? "—"}
            </p>
            <p style={{ margin: 0, fontSize: 11, color: "#9ca3af" }}>
              {row.package_tier?.name ?? "No tier"}
            </p>
          </div>
        </div>
      ),
    },
    {
      name: "Drop #",
      width: "90px",
      cell: (row) => (
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: "#eef0ff",
            color: "#11117C",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            fontWeight: 800,
          }}
        >
          #{row.drop_number}
        </div>
      ),
    },
    {
      name: "Drop Status",
      width: "140px",
      cell: (row) => {
        const status = row.status ?? "—";
        const COLOR: Record<string, { bg: string; text: string }> = {
          pending: { bg: "#fff7ed", text: "#c2410c" },
          out_for_delivery: { bg: "#eff6ff", text: "#1d4ed8" },
          delivered: { bg: "#f0fdf4", text: "#15803d" },
          failed: { bg: "#fef2f2", text: "#b91c1c" },
        };
        const c = COLOR[status] ?? { bg: "#f3f4f6", text: "#6b7280" };
        return (
          <span
            style={{
              background: c.bg,
              color: c.text,
              fontSize: 11,
              fontWeight: 700,
              padding: "3px 10px",
              borderRadius: 20,
              textTransform: "capitalize",
            }}
          >
            {status.replace(/_/g, " ")}
          </span>
        );
      },
    },
    {
      name: "Manifest Status",
      width: "140px",
      cell: (row) => {
        const status = row.manifest_status ?? "—";
        const COLOR: Record<string, { bg: string; text: string }> = {
          pending: { bg: "#fff7ed", text: "#c2410c" },
          processing: { bg: "#eff6ff", text: "#1d4ed8" },
          completed: { bg: "#f0fdf4", text: "#15803d" },
        };
        const c = COLOR[status] ?? { bg: "#f3f4f6", text: "#6b7280" };
        return (
          <span
            style={{
              background: c.bg,
              color: c.text,
              fontSize: 11,
              fontWeight: 700,
              padding: "3px 10px",
              borderRadius: 20,
              textTransform: "capitalize",
            }}
          >
            {status}
          </span>
        );
      },
    },
    {
      name: "Date",
      width: "130px",
      selector: (row) => row.created_at,
      sortable: true,
      cell: (row) => (
        <span style={{ fontSize: 12, color: "#9ca3af" }}>
          {new Date(row.created_at).toLocaleDateString("en-NG", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </span>
      ),
    },
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f5f6fa",
        padding: "28px 24px",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1
          style={{
            margin: 0,
            fontSize: 22,
            fontWeight: 800,
            color: "#11117C",
          }}
        >
          Drop Ledger
        </h1>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "#9ca3af" }}>
          Full record of every drop executed across all manifests
        </p>
      </div>

      {/* Stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: 14,
          marginBottom: 24,
        }}
      >
        {[
          {
            label: "Total Drops",
            value: totalDrops,
            icon: <MdOutlineReceiptLong size={20} />,
          },
          {
            label: "Delivered",
            value: deliveredDrops,
            icon: <MdOutlineReceiptLong size={20} />,
          },
          {
            label: "Pending",
            value: pendingDrops,
            icon: <MdOutlineReceiptLong size={20} />,
          },
          {
            label: "Failed",
            value: failedDrops,
            icon: <MdOutlineReceiptLong size={20} />,
          },
        ].map((s) => (
          <StatCard
            key={s.label}
            label={s.label}
            value={s.value}
            icon={s.icon}
          />
        ))}
      </div>

      {/* Table */}
      <div
        style={{
          background: "#fff",
          borderRadius: 16,
          border: "1px solid #eef0f6",
          overflow: "hidden",
          boxShadow: "0 2px 8px rgba(17,17,124,0.05)",
        }}
      >
        {/* Search */}
        <div
          style={{
            padding: "14px 18px",
            borderBottom: "1px solid #f0f2f8",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <FiSearch size={15} color="#9ca3af" />
          <input
            placeholder="Search by client name or tier…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              border: "none",
              outline: "none",
              fontSize: 13,
              color: "#374151",
              background: "transparent",
              width: "100%",
            }}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "#9ca3af",
                display: "flex",
                alignItems: "center",
              }}
            >
              <FiX size={15} />
            </button>
          )}
        </div>

        <DataTable
          columns={columns}
          data={filtered}
          progressPending={loading}
          progressComponent={
            <div
              style={{
                padding: "32px 0",
                textAlign: "center",
                color: "#9ca3af",
                fontSize: 13,
              }}
            >
              Loading drop ledger…
            </div>
          }
          pagination
          paginationPerPage={20}
          paginationRowsPerPageOptions={[10, 20, 50, 100]}
          highlightOnHover
          striped
          responsive
          noDataComponent={
            <div style={{ padding: "48px 0", textAlign: "center" }}>
              <p style={{ fontSize: 32, margin: "0 0 10px" }}>📦</p>
              <p style={{ color: "#6b7280", fontSize: 13, margin: 0 }}>
                {search
                  ? "No drops match your search"
                  : "No drops recorded yet."}
              </p>
            </div>
          }
          customStyles={{
            headRow: {
              style: {
                background: "#f8f9ff",
                borderBottom: "2px solid #eef0f6",
              },
            },
            headCells: {
              style: {
                color: "#11117C",
                fontWeight: "700",
                fontSize: "11px",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                paddingLeft: "16px",
                paddingRight: "16px",
              },
            },
            cells: { style: { paddingLeft: "16px", paddingRight: "16px" } },
            rows: {
              style: {
                borderBottom: "1px solid #f5f6fa",
                transition: "background 0.12s",
              },
              highlightOnHoverStyle: {
                background: "#f5f7ff",
                borderBottomColor: "#eef0f6",
              },
              stripedStyle: { background: "#fafbff" },
            },
            pagination: {
              style: {
                borderTop: "1px solid #eef0f6",
                fontSize: "12px",
                color: "#6b7280",
              },
            },
          }}
        />
      </div>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
};

export default DropLedger;
