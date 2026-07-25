import { useEffect, useState, useCallback } from "react";
import * as RDT from "react-data-table-component";
import type { TableColumn } from "react-data-table-component";
import { supabase } from "../constants/supabaseClient";
import { Toast } from "../components/Toast";
import { StatCard } from "../components/StatCard";
import { FiSearch, FiX, FiEye, FiTrash2, FiLayers } from "react-icons/fi";
import { MdOutlineLibraryBooks } from "react-icons/md";
import { StatusBadge } from "../components/ManifestDrawer";

const DataTable = (RDT as any).default?.default ?? (RDT as any).default;
type ToastState = { message: string; type: "success" | "error" } | null;

// ─── Types ────────────────────────────────────────────────────────────────────

type Manifest = {
  id: string;
  drop_count: number;
  submitted_at: string;
  status: "pending" | "processing" | "completed";
  client_id: string;
  subscription_id: string;
  clients: { business_name: string } | null;
  client_subscriptions: {
    id: string;
    cycle_start: string;
    cycle_end: string;
    package_tiers: { name: string } | null;
  } | null;
  // derived after fetch
  drops_done?: number;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

// ─── Slide-over panel for manifest detail ─────────────────────────────────────

type DropEntry = {
  id: string;
  drop_number: number;
  created_at: string;
};

const ManifestDrawer = ({
  manifest,
  onClose,
}: {
  manifest: Manifest | null;
  onClose: () => void;
}) => {
  const [drops, setDrops] = useState<DropEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!manifest) return;
    setLoading(true);
    supabase
      .from("drops")
      .select("id, drop_number, delivery_address, recipient_phone, created_at")
      .eq("manifest_id", manifest.id)
      .order("drop_number", { ascending: true })
      .then(({ data }) => {
        console.log("drops", data ?? []);
        setDrops(data ?? []);
        setLoading(false);
      });
  }, [manifest]);

  if (!manifest) return null;

  const tierName = manifest.client_subscriptions?.package_tiers?.name ?? "—";
  const clientName = manifest.clients?.business_name ?? "—";
  // const overdraftTotal = drops
  //   .filter((d) => d.is_overdraft)
  //   .reduce((s, d) => s + d.overdraft_charge, 0);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(17,17,124,0.08)",
          zIndex: 40,
        }}
      />

      {/* Drawer */}
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
              {tierName}
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
              { label: "Total Drops", value: manifest.drop_count },
              { label: "Completed", value: drops.length },
              {
                label: "Overdraft ₦",
                value: overdraftTotal.toLocaleString("en-NG"),
              },
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
          <div style={{ marginTop: 12 }}>
            <ProgressBar done={drops.length} total={manifest.drop_count} />
          </div>
          <div
            style={{
              marginTop: 8,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <StatusBadge status={manifest.status} />
            <span style={{ fontSize: 11, color: "#9ca3af" }}>
              Submitted{" "}
              {new Date(manifest.submitted_at).toLocaleDateString("en-NG", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
          </div>
        </div>

        {/* Drop ledger */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
          <p
            style={{
              margin: "0 0 12px",
              fontSize: 12,
              fontWeight: 700,
              color: "#374151",
            }}
          >
            Drop Ledger
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
                No drops recorded yet
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {drops.map((drop) => (
                <div
                  key={drop.id}
                  style={{
                    background: drop.is_overdraft ? "#fff7ed" : "#f8f9ff",
                    border: `1px solid ${drop.is_overdraft ? "#fed7aa" : "#eef0f6"}`,
                    borderRadius: 10,
                    padding: "10px 14px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 10 }}
                  >
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: "50%",
                        background: drop.is_overdraft ? "#fed7aa" : "#eef0ff",
                        color: drop.is_overdraft ? "#c2410c" : "#11117C",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 11,
                        fontWeight: 800,
                        flexShrink: 0,
                      }}
                    >
                      #{drop.drop_number}
                    </div>
                    <div>
                      <p
                        style={{
                          margin: 0,
                          fontSize: 12,
                          fontWeight: 600,
                          color: "#1a1d2e",
                        }}
                      >
                        Drop {drop.drop_number}
                        {drop.is_overdraft && (
                          <span
                            style={{
                              marginLeft: 6,
                              fontSize: 10,
                              color: "#c2410c",
                              fontWeight: 700,
                            }}
                          >
                            OVERDRAFT
                          </span>
                        )}
                      </p>
                      <p style={{ margin: 0, fontSize: 11, color: "#9ca3af" }}>
                        {new Date(drop.created_at).toLocaleDateString("en-NG", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                  {drop.is_overdraft && (
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: "#c2410c",
                      }}
                    >
                      +₦{Number(drop.overdraft_charge).toLocaleString("en-NG")}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

// ─── Action button ─────────────────────────────────────────────────────────────

const ActionBtn = ({
  title,
  onClick,
  className,
  children,
}: {
  title: string;
  onClick: () => void;
  className: string;
  children: React.ReactNode;
}) => (
  <button
    title={title}
    onClick={onClick}
    className={`p-1.5 rounded-lg border-none cursor-pointer flex items-center justify-center transition-colors duration-150 bg-transparent ${className}`}
  >
    {children}
  </button>
);

// ─── Main page ─────────────────────────────────────────────────────────────────

const Manifests = () => {
  const [manifests, setManifests] = useState<Manifest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState<ToastState>(null);
  const [selected, setSelected] = useState<Manifest | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchManifests = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch manifests with joins
      const { data, error } = await supabase
        .from("manifests")
        .select(
          `
          id, drop_count, submitted_at, status, client_id, subscription_id,
          clients ( business_name ),
          client_subscriptions (
            id, cycle_start, cycle_end,
            package_tiers ( name )
          )
        `,
        )
        .order("submitted_at", { ascending: false });

      if (error) throw error;
      console.log("data", data);

      // Fetch drop counts per manifest
      // const ids = (data ?? []).map((m: any) => m.id);
      // const { data: ledgerCounts } = await supabase
      //   .from("drop_ledger")
      //   .select("manifest_id")
      //   .in("manifest_id", ids);

      // const countMap: Record<string, number> = {};
      // (ledgerCounts ?? []).forEach((row: any) => {
      //   countMap[row.manifest_id] = (countMap[row.manifest_id] ?? 0) + 1;
      // });

      // const enriched = (data ?? []).map((m: any) => ({
      //   ...m,
      //   drops_done: countMap[m.id] ?? 0,
      // }));

      setManifests(data);
    } catch (err) {
      console.error(err);
      showToast("Failed to load manifests", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchManifests();
  }, [fetchManifests]);

  const filtered = manifests.filter((m) => {
    const q = search.toLowerCase();
    const matchSearch =
      m.clients?.business_name?.toLowerCase().includes(q) ||
      m.client_subscriptions?.package_tiers?.name?.toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || m.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // Stats
  const total = manifests.length;
  const pending = manifests.filter((m) => m.status === "pending").length;
  const processing = manifests.filter((m) => m.status === "processing").length;
  const completed = manifests.filter((m) => m.status === "completed").length;

  const columns: TableColumn<Manifest>[] = [
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
      selector: (row) => row.clients?.full_name ?? "",
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
              width: 34,
              height: 34,
              borderRadius: "50%",
              background: "#eef0ff",
              color: "#11117C",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 13,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {(row.clients?.full_name ?? "?")[0].toUpperCase()}
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
              {row.clients?.full_name ?? "—"}
            </p>
            <p style={{ margin: 0, fontSize: 11, color: "#9ca3af" }}>
              {row.client_subscriptions?.package_tiers?.name ?? "No tier"}
            </p>
          </div>
        </div>
      ),
    },
    {
      name: "Progress",
      width: "160px",
      cell: (row) => (
        <ProgressBar done={row.drops_done ?? 0} total={row.drop_count} />
      ),
    },
    {
      name: "Status",
      width: "120px",
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      name: "Cycle",
      width: "180px",
      cell: (row) => {
        const sub = row.client_subscriptions;
        if (!sub)
          return <span style={{ color: "#d1d5db", fontSize: 12 }}>—</span>;
        const fmt = (d: string) =>
          new Date(d).toLocaleDateString("en-NG", {
            day: "numeric",
            month: "short",
          });
        return (
          <span style={{ fontSize: 12, color: "#6b7280" }}>
            {fmt(sub.cycle_start)} → {fmt(sub.cycle_end)}
          </span>
        );
      },
    },
    {
      name: "Submitted",
      width: "130px",
      selector: (row) => row.submitted_at,
      sortable: true,
      cell: (row) => (
        <span style={{ fontSize: 12, color: "#9ca3af" }}>
          {new Date(row.submitted_at).toLocaleDateString("en-NG", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </span>
      ),
    },
    {
      name: "Actions",
      width: "80px",
      cell: (row) => (
        <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
          <ActionBtn
            title="View drops"
            onClick={() => setSelected(row)}
            className="text-[#11117C] hover:bg-indigo-50"
          >
            <FiEye size={14} />
          </ActionBtn>
        </div>
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
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 24,
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: 22,
              fontWeight: 800,
              color: "#11117C",
            }}
          >
            Manifests
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#9ca3af" }}>
            Track delivery manifests and drop completion
          </p>
        </div>

        {/* Status filter pills */}
        <div style={{ display: "flex", gap: 6 }}>
          {["all", "pending", "processing", "completed"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              style={{
                padding: "6px 14px",
                borderRadius: 20,
                border: `1.5px solid ${statusFilter === s ? "#11117C" : "#eef0f6"}`,
                background: statusFilter === s ? "#11117C" : "#fff",
                color: statusFilter === s ? "#fff" : "#6b7280",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                textTransform: "capitalize",
                transition: "all 0.15s",
              }}
            >
              {s === "all" ? "All" : s}
            </button>
          ))}
        </div>
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
            label: "Total Manifests",
            value: total,
            icon: <MdOutlineLibraryBooks size={20} />,
          },
          { label: "Pending", value: pending, icon: <FiLayers size={20} /> },
          {
            label: "Processing",
            value: processing,
            icon: <FiLayers size={20} />,
          },
          {
            label: "Completed",
            value: completed,
            icon: <FiLayers size={20} />,
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
              Loading manifests…
            </div>
          }
          pagination
          paginationPerPage={15}
          paginationRowsPerPageOptions={[10, 15, 25, 50]}
          highlightOnHover
          striped
          responsive
          noDataComponent={
            <div style={{ padding: "48px 0", textAlign: "center" }}>
              <p style={{ fontSize: 32, margin: "0 0 10px" }}>📋</p>
              <p style={{ color: "#6b7280", fontSize: 13, margin: 0 }}>
                {search
                  ? "No manifests match your search"
                  : "No manifests yet."}
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
                cursor: "pointer",
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
          onRowClicked={(row: Manifest) => setSelected(row)}
        />
      </div>

      {/* Manifest detail drawer (includes drop ledger) */}
      <ManifestDrawer manifest={selected} onClose={() => setSelected(null)} />

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
};

export default Manifests;
