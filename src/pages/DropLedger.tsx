import { useEffect, useState, useCallback } from "react";
import * as RDT from "react-data-table-component";
import type { TableColumn } from "react-data-table-component";
import { supabase } from "../constants/supabaseClient";
import { Toast } from "../components/Toast";
import { StatCard } from "../components/StatCard";
import { FiSearch, FiX, FiAlertTriangle } from "react-icons/fi";
import { MdOutlineReceiptLong } from "react-icons/md";

const DataTable = (RDT as any).default?.default ?? (RDT as any).default;
type ToastState = { message: string; type: "success" | "error" } | null;

// ─── Types ────────────────────────────────────────────────────────────────────

type DropEntry = {
  id: string;
  drop_number: number;
  is_overdraft: boolean;
  overdraft_charge: number;
  created_at: string;
  manifest_id: string;
  client_id: string;
  subscription_id: string;
  // joined
  clients: { full_name: string } | null;
  manifests: { drop_count: number; status: string } | null;
  client_subscriptions: {
    package_tiers: { name: string } | null;
  } | null;
};

// ─── Main page ─────────────────────────────────────────────────────────────────

const DropLedger = () => {
  const [drops, setDrops] = useState<DropEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [overdraftOnly, setOverdraftOnly] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchDrops = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("drop_ledger")
        .select(`
          id, drop_number, is_overdraft, overdraft_charge, created_at,
          manifest_id, client_id, subscription_id,
          clients ( full_name ),
          manifests ( drop_count, status ),
          client_subscriptions (
            package_tiers ( name )
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDrops((data ?? []) as DropEntry[]);
    } catch (err) {
      console.error(err);
      showToast("Failed to load drop ledger", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDrops(); }, [fetchDrops]);

  const filtered = drops.filter((d) => {
    const q = search.toLowerCase();
    const matchSearch =
      d.clients?.full_name?.toLowerCase().includes(q) ||
      d.client_subscriptions?.package_tiers?.name?.toLowerCase().includes(q);
    const matchOverdraft = overdraftOnly ? d.is_overdraft : true;
    return matchSearch && matchOverdraft;
  });

  // Stats
  const totalDrops = drops.length;
  const overdraftDrops = drops.filter((d) => d.is_overdraft).length;
  const totalOverdraftCharge = drops
    .filter((d) => d.is_overdraft)
    .reduce((s, d) => s + Number(d.overdraft_charge), 0);
  const normalDrops = totalDrops - overdraftDrops;

  const columns: TableColumn<DropEntry>[] = [
    {
      name: "#",
      cell: (_, i) => (
        <span style={{ color: "#c0c4d0", fontSize: 11, fontWeight: 600 }}>{i + 1}</span>
      ),
      width: "48px",
    },
    {
      name: "Client",
      selector: (row) => row.clients?.full_name ?? "",
      sortable: true,
      grow: 2,
      cell: (row) => (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0" }}>
          <div
            style={{
              width: 32, height: 32, borderRadius: "50%",
              background: row.is_overdraft ? "#fff7ed" : "#eef0ff",
              color: row.is_overdraft ? "#c2410c" : "#11117C",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, fontWeight: 700, flexShrink: 0,
            }}
          >
            {(row.clients?.full_name ?? "?")[0].toUpperCase()}
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#1a1d2e" }}>
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
      name: "Drop #",
      width: "90px",
      cell: (row) => (
        <div
          style={{
            width: 32, height: 32, borderRadius: "50%",
            background: row.is_overdraft ? "#fed7aa" : "#eef0ff",
            color: row.is_overdraft ? "#c2410c" : "#11117C",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 12, fontWeight: 800,
          }}
        >
          #{row.drop_number}
        </div>
      ),
    },
    {
      name: "Manifest Status",
      width: "140px",
      cell: (row) => {
        const status = row.manifests?.status ?? "—";
        const COLOR: Record<string, { bg: string; text: string }> = {
          pending:    { bg: "#fff7ed", text: "#c2410c" },
          processing: { bg: "#eff6ff", text: "#1d4ed8" },
          completed:  { bg: "#f0fdf4", text: "#15803d" },
        };
        const c = COLOR[status] ?? { bg: "#f3f4f6", text: "#6b7280" };
        return (
          <span style={{ background: c.bg, color: c.text, fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, textTransform: "capitalize" }}>
            {status}
          </span>
        );
      },
    },
    {
      name: "Type",
      width: "120px",
      cell: (row) =>
        row.is_overdraft ? (
          <span style={{ display: "flex", alignItems: "center", gap: 5, background: "#fff7ed", color: "#c2410c", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20 }}>
            <FiAlertTriangle size={10} /> Overdraft
          </span>
        ) : (
          <span style={{ background: "#f0fdf4", color: "#15803d", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20 }}>
            Normal
          </span>
        ),
    },
    {
      name: "Charge",
      width: "120px",
      cell: (row) =>
        row.is_overdraft ? (
          <span style={{ fontSize: 13, fontWeight: 700, color: "#c2410c" }}>
            ₦{Number(row.overdraft_charge).toLocaleString("en-NG")}
          </span>
        ) : (
          <span style={{ fontSize: 13, color: "#d1d5db" }}>—</span>
        ),
    },
    {
      name: "Date",
      width: "130px",
      selector: (row) => row.created_at,
      sortable: true,
      cell: (row) => (
        <span style={{ fontSize: 12, color: "#9ca3af" }}>
          {new Date(row.created_at).toLocaleDateString("en-NG", {
            day: "numeric", month: "short", year: "numeric",
          })}
        </span>
      ),
    },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#f5f6fa", padding: "28px 24px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#11117C" }}>
            Drop Ledger
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#9ca3af" }}>
            Full record of every drop executed across all manifests
          </p>
        </div>

        {/* Overdraft toggle */}
        <button
          onClick={() => setOverdraftOnly((v) => !v)}
          style={{
            display: "flex", alignItems: "center", gap: 7,
            background: overdraftOnly ? "#fff7ed" : "#fff",
            color: overdraftOnly ? "#c2410c" : "#6b7280",
            border: `1.5px solid ${overdraftOnly ? "#fed7aa" : "#eef0f6"}`,
            borderRadius: 10, padding: "8px 16px",
            fontSize: 13, fontWeight: 600, cursor: "pointer",
            transition: "all 0.15s",
          }}
        >
          <FiAlertTriangle size={13} />
          {overdraftOnly ? "Showing overdrafts only" : "Show overdrafts only"}
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, marginBottom: 24 }}>
        {[
          { label: "Total Drops", value: totalDrops, icon: <MdOutlineReceiptLong size={20} /> },
          { label: "Normal Drops", value: normalDrops, icon: <MdOutlineReceiptLong size={20} /> },
          { label: "Overdraft Drops", value: overdraftDrops, icon: <FiAlertTriangle size={20} /> },
          {
            label: "Total Overdraft ₦",
            value: `₦${totalOverdraftCharge.toLocaleString("en-NG")}`,
            icon: <FiAlertTriangle size={20} />,
          },
        ].map((s) => (
          <StatCard key={s.label} label={s.label} value={s.value} icon={s.icon} />
        ))}
      </div>

      {/* Table */}
      <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #eef0f6", overflow: "hidden", boxShadow: "0 2px 8px rgba(17,17,124,0.05)" }}>
        {/* Search */}
        <div style={{ padding: "14px 18px", borderBottom: "1px solid #f0f2f8", display: "flex", alignItems: "center", gap: 10 }}>
          <FiSearch size={15} color="#9ca3af" />
          <input
            placeholder="Search by client name or tier…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ border: "none", outline: "none", fontSize: 13, color: "#374151", background: "transparent", width: "100%" }}
          />
          {search && (
            <button onClick={() => setSearch("")} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", display: "flex", alignItems: "center" }}>
              <FiX size={15} />
            </button>
          )}
        </div>

        <DataTable
          columns={columns}
          data={filtered}
          progressPending={loading}
          progressComponent={
            <div style={{ padding: "32px 0", textAlign: "center", color: "#9ca3af", fontSize: 13 }}>
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
                {search ? "No drops match your search" : "No drops recorded yet."}
              </p>
            </div>
          }
          customStyles={{
            headRow: { style: { background: "#f8f9ff", borderBottom: "2px solid #eef0f6" } },
            headCells: {
              style: {
                color: "#11117C", fontWeight: "700", fontSize: "11px",
                textTransform: "uppercase", letterSpacing: "0.06em",
                paddingLeft: "16px", paddingRight: "16px",
              },
            },
            cells: { style: { paddingLeft: "16px", paddingRight: "16px" } },
            rows: {
              style: { borderBottom: "1px solid #f5f6fa", transition: "background 0.12s" },
              highlightOnHoverStyle: { background: "#f5f7ff", borderBottomColor: "#eef0f6" },
              stripedStyle: { background: "#fafbff" },
            },
            pagination: { style: { borderTop: "1px solid #eef0f6", fontSize: "12px", color: "#6b7280" } },
          }}
        />
      </div>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
};

export default DropLedger;
