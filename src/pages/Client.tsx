import { useEffect, useState, useCallback } from "react";
import * as RDT from "react-data-table-component";
import type { TableColumn } from "react-data-table-component";
import { supabase } from "../constants/supabaseClient";
import { Toast } from "../components/Toast";
import { StatCard } from "../components/StatCard";
import { DeleteConfirmModal } from "../components/modals/DeleteConfirmationModal";
import { EditClientModal } from "../components/modals/EditClientModal";
import { AddClientModal } from "../components/modals/AddClientModal";
import { FiUsers } from "react-icons/fi";
import { ClientRenewModal } from "../components/modals/ClientRenewModal";
import type { client } from "../components/types/Types";

const DataTable = (RDT as any).default?.default ?? (RDT as any).default;
type ToastState = { message: string; type: "success" | "error" } | null;

// Matches exactly what the select() below returns — keep these two in
// sync. Field names mirror the actual `clients` table columns
// (snake_case), not the old Operators-table shape this was copied from.

// ── Action button
const ActionBtn = ({
  title,
  onClick,
  color,
  hoverBg,
  children,
}: {
  title: string;
  onClick: () => void;
  color: string;
  hoverBg: string;
  children: React.ReactNode;
}) => (
  <button
    title={title}
    onClick={onClick}
    style={{
      background: "none",
      border: "none",
      cursor: "pointer",
      padding: 6,
      borderRadius: 8,
      color,
      transition: "background 0.15s",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}
    onMouseEnter={(e) => {
      (e.currentTarget as HTMLButtonElement).style.background = hoverBg;
    }}
    onMouseLeave={(e) => {
      (e.currentTarget as HTMLButtonElement).style.background = "none";
    }}
  >
    {children}
  </button>
);

// ── Main component
const Client = () => {
  const [clients, setClients] = useState<client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState<ToastState>(null);

  const [addVisible, setAddVisible] = useState(false);
  const [editTarget, setEditTarget] = useState<client | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<client | null>(null);
  const [renewTarget, setRenewTarget] = useState<client | null>(null);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchClient = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("clients")
        .select(
          `
  id,
  business_name,
  email,
  phone,
  default_pickup_address,
  account_manager_id,
  account_manager:users!account_manager_id (
    full_name
  ),
  client_subscriptions (
    id,
    status,
    package_tiers(name)
  )
`,
        )
        .order("created_at", { ascending: false });

      if (error) throw error;
      setClients((data ?? []) as unknown as client[]);
      console.log(data);
    } catch (err) {
      console.error("Failed to fetch clients:", err);
      showToast("Failed to load clients", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClient();
  }, [fetchClient]);

  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      const { error: clientError } = await supabase
        .from("clients")
        .delete()
        .eq("id", deleteTarget.id);
      if (clientError) throw clientError;

      showToast(`${deleteTarget.business_name} has been removed.`, "success");
      setDeleteTarget(null);
      fetchClient();
    } catch (err: any) {
      showToast(err?.message ?? "Failed to remove client", "error");
    }
  };

  // Search across name, phone, email, and pickup address — matches what
  // the search placeholder actually promises.
  const filtered = clients.filter((c) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      c.business_name?.toLowerCase().includes(q) ||
      c.phone?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.default_pickup_address?.toLowerCase().includes(q)
    );
  });

  const columns: TableColumn<client>[] = [
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
      selector: (row) => row.business_name ?? "",
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
            {(row.business_name ?? "?")[0]?.toUpperCase()}
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
              {row.business_name ?? "—"}
            </p>
            <p style={{ margin: 0, fontSize: 11, color: "#9ca3af" }}>
              {row.email ?? "No email"}
            </p>
          </div>
        </div>
      ),
    },
    {
      name: "Phone",
      selector: (row) => row.phone ?? "",
      width: "160px",
      cell: (row) => (
        <span
          style={{ fontSize: 12, color: "#4b5563", fontFamily: "monospace" }}
        >
          {row.phone ?? <span style={{ color: "#d1d5db" }}>—</span>}
        </span>
      ),
    },
    {
      name: "Tier",
      width: "130px",
      cell: (row) => {
        const active = row.client_subscriptions?.find(
          (s) => s.status === "active",
        );
        return (
          <span className="font-bold text-blue-800">
            {active?.package_tiers?.name ?? "—"}
          </span>
        );
      },
    },
    {
      name: "Address",
      width: "130px",
      cell: (row) => (
        <span className="font-bold text-blue-800">
          {row.default_pickup_address ?? "—"}
        </span>
      ),
    },
    {
      name: "Assigned Coordinator",
      selector: (row) => row.account_manager?.full_name ?? "",
      sortable: true,
      width: "160px",
      cell: (row) => (
        <span style={{ fontSize: 12, color: "#6b7280" }}>
          {row.account_manager?.full_name ?? "Unassigned"}
        </span>
      ),
    },
    {
      name: "Actions",
      width: "110px",
      cell: (row) => (
        <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
          <ActionBtn
            title="Edit client"
            onClick={() => setEditTarget(row)}
            color="#6b7280"
            hoverBg="#eef0ff"
          >
            <svg
              width="15"
              height="15"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.862 4.487a2.1 2.1 0 1 1 2.97 2.97L8.5 18.81l-4 1 1-4 11.362-11.323z"
              />
            </svg>
          </ActionBtn>

          <ActionBtn
            title="Delete client"
            onClick={() => setDeleteTarget(row)}
            color="#f87171"
            hoverBg="#fff1f1"
          >
            <svg
              width="15"
              height="15"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m-7 0a1 1 0 011-1h4a1 1 0 011 1m-6 0h6"
              />
            </svg>
          </ActionBtn>

          <ActionBtn
            title="Renew tier"
            onClick={() => setRenewTarget(row)}
            color="#f87171"
            hoverBg="#fff1f1"
          >
            <svg
              width="15"
              height="15"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m-7 0a1 1 0 011-1h4a1 1 0 011 1m-6 0h6"
              />
            </svg>
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
      <style>{`@keyframes slideUp { from { transform: translateY(16px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>

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
              color: "#32a738",
            }}
          >
            Clients
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#9ca3af" }}>
            Manage all client informations
          </p>
        </div>
        <button
          onClick={() => setAddVisible(true)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            background: "#32a738",
            color: "#fff",
            border: "none",
            borderRadius: 10,
            padding: "10px 18px",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            boxShadow: "0 4px 16px rgba(17,17,124,0.25)",
            transition: "opacity 0.15s",
          }}
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLButtonElement).style.opacity = "0.88")
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLButtonElement).style.opacity = "1")
          }
        >
          <svg
            width="15"
            height="15"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M12 4v16m8-8H4"
            />
          </svg>
          Add Client
        </button>
      </div>

      {/* Stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 14,
          marginBottom: 24,
        }}
      >
        <StatCard
          label="Total Clients"
          value={clients.length}
          icon={<FiUsers size={20} />}
        />
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
        <div
          style={{
            padding: "14px 18px",
            borderBottom: "1px solid #f0f2f8",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <svg
            width="15"
            height="15"
            fill="none"
            viewBox="0 0 24 24"
            stroke="#9ca3af"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
            />
          </svg>
          <input
            placeholder="Search client by name, phone, email, address"
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
                fontSize: 18,
                lineHeight: 1,
              }}
            >
              ×
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
              Loading clients…
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
              <div style={{ fontSize: 32, marginBottom: 10 }}>🚀</div>
              <p style={{ color: "#6b7280", fontSize: 13, margin: 0 }}>
                {search
                  ? "No clients match your search"
                  : "No clients yet. Add your first one!"}
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

      {/* Modals */}
      <AddClientModal
        visible={addVisible}
        onClose={() => setAddVisible(false)}
        onSuccess={() => {
          setAddVisible(false);
          showToast("Client added!", "success");
          fetchClient();
        }}
      />

      <EditClientModal
        visible={!!editTarget}
        client={editTarget}
        onClose={() => setEditTarget(null)}
        onSuccess={() => {
          setEditTarget(null);
          showToast("Client updated successfully.", "success");
          fetchClient();
        }}
      />

      <DeleteConfirmModal
        visible={!!deleteTarget}
        entityName={deleteTarget?.business_name ?? ""}
        entityType="client"
        warningText="Their profile and client record will be permanently removed."
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />

      <ClientRenewModal
        visible={!!renewTarget}
        clientId={renewTarget?.id ?? null}
        onClose={() => setRenewTarget(null)}
        onSuccess={() => {
          setRenewTarget(null);
          showToast("Subscription changed!", "success");
          fetchClient();
        }}
      />

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
};

export default Client;
