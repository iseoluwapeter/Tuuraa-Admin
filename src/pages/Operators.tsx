import { useEffect, useState, useCallback } from "react";
import * as RDT from "react-data-table-component";
import type { TableColumn } from "react-data-table-component";
import { supabase } from "../constants/supabaseClient";
import { fmtDate } from "../constants/constants";
import { Toast } from "../components/Toast";
import { StatCard } from "../components/StatCard";
import { AddOperatorModal } from "../components/modals/AddOperatorModal";
import { DeleteConfirmModal } from "../components/modals/DeleteConfirmationModal";
import { EditOperatorModal } from "../components/modals/EditOperatorModal";
import type { OperatorRow } from "../components/modals/EditOperatorModal";
// import {FaUserCheck} from "react-icons/fa";
import { FaMotorcycle, FaCarSide } from "react-icons/fa6";

// import { FaUserCheck } from "react-icons/fa";
import { FaUserCheck } from "react-icons/fa6";

const DataTable = (RDT as any).default?.default ?? (RDT as any).default;
type ToastState = { message: string; type: "success" | "error" } | null;

type Operator = OperatorRow & {
  created_at: string;
  last_seen: string | null;
};

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
const Operators = () => {
  const [operators, setOperators] = useState<Operator[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState<ToastState>(null);

  const [addVisible, setAddVisible] = useState(false);
  const [editTarget, setEditTarget] = useState<Operator | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Operator | null>(null);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchOperators = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("operators")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setOperators((data ?? []) as Operator[]);
      console.log(data);
    } catch (err) {
      console.error("Failed to fetch operators:", err);
      showToast("Failed to load operators", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOperators();
  }, [fetchOperators]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("No session");

      // Delete from auth.users via edge function
      await supabase.functions.invoke("delete-user", {
        body: { userId: deleteTarget.id },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      alert(deleteTarget.full_name);

      setDeleteTarget(null);
      showToast(`${deleteTarget.full_name} has been removed.`, "success");
      fetchOperators();
    } catch (err: any) {
      showToast(err?.message ?? "Delete failed", "error");
      setDeleteTarget(null);
    }
  };

  const filtered = operators.filter((op) => {
    const q = search.toLowerCase();
    return (
      op.full_name?.toLowerCase().includes(q) ||
      op.phone_no?.includes(q) ||
      op.vehicle_type?.toLowerCase().includes(q) ||
      op.address?.toLowerCase().includes(q)
    );
  });

  const columns: TableColumn<Operator>[] = [
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
      name: "Operator",
      selector: (row) => row.full_name ?? "",
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
            {(row.full_name ?? "?")[0].toUpperCase()}
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
              {row.full_name ?? "—"}
            </p>
            <p style={{ margin: 0, fontSize: 11, color: "#9ca3af" }}>
              {row.address ?? "No address"}
            </p>
          </div>
        </div>
      ),
    },
    {
      name: "Phone",
      selector: (row) => row.phone_no ?? "",
      width: "160px",
      cell: (row) => (
        <span
          style={{ fontSize: 12, color: "#4b5563", fontFamily: "monospace" }}
        >
          {row.phone_no ?? <span style={{ color: "#d1d5db" }}>—</span>}
        </span>
      ),
    },
    {
      name: "Vehicle",
      width: "130px",
      cell: (row) => (
        <span className="font-bold text-blue-800">
          {row.vehicle_type ?? null}
        </span>
      ),
    },
    {
      name: "Joined",
      selector: (row) => row.created_at ?? "",
      sortable: true,
      width: "120px",
      cell: (row) => (
        <span style={{ fontSize: 12, color: "#6b7280" }}>
          {fmtDate(row.created_at)}
        </span>
      ),
    },
    {
      name: "Last Seen",
      selector: (row) => row.last_seen ?? "",
      sortable: true,
      width: "120px",
      cell: (row) => (
        <span
          style={{ fontSize: 12, color: row.last_seen ? "#6b7280" : "#d1d5db" }}
        >
          {row.last_seen ? fmtDate(row.last_seen) : "Never"}
        </span>
      ),
    },
    {
      name: "Actions",
      width: "110px",
      cell: (row) => (
        <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
          <ActionBtn
            title="Edit operator"
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
            title="Delete operator"
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
              color: "#159143",
            }}
          >
            Operators
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#9ca3af" }}>
            Manage all platform delivery operators
          </p>
        </div>
        <button
          onClick={() => setAddVisible(true)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            background: "#159143",
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
          Add Operator
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
          label="Total Operators"
          value={operators.length}
          icon={<FaUserCheck size={20} />}
        />
        <StatCard
          label="On Bike / Cycle"
          value={
            operators.filter((o) =>
              ["bike", "bicycle"].includes(o.vehicle_type?.toLowerCase() ?? ""),
            ).length
          }
          icon={<FaMotorcycle size={20} />}
        />
        <StatCard
          label="Cars & Vans"
          value={
            operators.filter((o) =>
              ["car", "van", "truck"].includes(
                o.vehicle_type?.toLowerCase() ?? "",
              ),
            ).length
          }
          icon={<FaCarSide size={20} />}
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
            placeholder="Search operators by name, phone, vehicle…"
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
              Loading operators…
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
                  ? "No operators match your search"
                  : "No operators yet. Add your first one!"}
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
      <AddOperatorModal
        visible={addVisible}
        onClose={() => setAddVisible(false)}
        onSuccess={() => {
          setAddVisible(false);
          showToast("Operator added! Invite email sent.", "success");
          fetchOperators();
        }}
      />

      <EditOperatorModal
        visible={!!editTarget}
        operator={editTarget}
        onClose={() => setEditTarget(null)}
        onSuccess={() => {
          setEditTarget(null);
          showToast("Operator updated successfully.", "success");
          fetchOperators();
        }}
      />

      <DeleteConfirmModal
        visible={!!deleteTarget}
        entityName={deleteTarget?.full_name ?? ""}
        entityType="operator"
        warningText="Their profile and operator record will be permanently removed."
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
};

export default Operators;
