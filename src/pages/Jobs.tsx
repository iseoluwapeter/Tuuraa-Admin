import { useEffect, useState, useCallback } from "react";
import * as RDT from "react-data-table-component";
import type { TableColumn } from "react-data-table-component";
import { supabase } from "../constants/supabaseClient";
import { fmtDate } from "../constants/constants";
import { Toast } from "../components/Toast";
import { StatCard } from "../components/StatCard";
import { AddCoordinatorsModal } from "../components/modals/AddCoordinatorsModal";
import { EditCoordinatorModal } from "../components/modals/EditCoordinatorModal";
import {
  FiSearch,
  FiX,
  FiEye,
  FiPlus,
  FiEdit2,
  FiUserCheck,
} from "react-icons/fi";
import { AddJobsModal } from "../components/modals/AddJobsModal";
import { MdWorkOutline } from "react-icons/md";
import { Badge } from "../components/Badge";
import { EditManifestModal } from "../components/modals/EditManifestModal";
import { AssignOperatorModal } from "../components/AddOperatorModal";
import { ManifestDrawer } from "../components/ManifestDrawer";
import type { Manifests } from "../components/types/Types";
import type { DropEntry } from "../components/types/Types";

const DataTable = (RDT as any).default?.default ?? (RDT as any).default;
type ToastState = { message: string; type: "success" | "error" } | null;

// ── Action button
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

const formatDateTime = (date) => {
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

// ── Main component
const Jobs = () => {
  const [jobs, setJobs] = useState<Manifests[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState<ToastState>(null);
  const [addVisible, setAddVisible] = useState(false);
  const [editTarget, setEditTarget] = useState<Manifests | null>(null);
  const [assignTarget, setAssignTarget] = useState<Manifests | null>(null);
  const [selected, setSelected] = useState<Manifests | null>(null);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchManifests = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("manifests")
        .select(
          `
        id,
        ref_number,
        created_at,
        drops_count,
        operator_id,
        out_for_delivery_at,
        completed_at,
        client:clients ( business_name ),
        operator:operators!manifests_operator_id_fkey ( full_name ),
        subscription:client_subscriptions!manifests_subscription_id_fkey (
          id, drops_used,
          tier:package_tiers!client_subscriptions_tier_id_fkey ( name, monthly_drops )
        )
      `,
        )
        .order("created_at", { ascending: false });

      if (error) throw error;
      setJobs((data ?? []) as Manifests[]);
    } catch (err) {
      console.error("Failed to fetch manifests:", err);
      showToast("Failed to load manifests", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchManifests();
  }, [fetchManifests]);

  const filtered = jobs.filter((op) => {
    const q = search.toLowerCase();
    return (
      op.ref_number?.toLowerCase().includes(q) ||
      op.client?.business_name?.toLowerCase().includes(q)
    );
  });

  const columns: TableColumn<Manifests>[] = [
    {
      name: "#",
      cell: (_, i) => (
        <span className="text-gray-300 text-xs font-semibold">{i + 1}</span>
      ),
      width: "48px",
    },
    {
      name: "Reference",
      selector: (row) => row.ref_number ?? "",
      sortable: true,
      grow: 2,
      cell: (row) => (
        <div className="flex items-center gap-2.5 py-1.5">
          <div className="w-8.5 h-8.5 rounded-full bg-indigo-50 text-[#11117C] flex items-center justify-center text-[13px] font-bold shrink-0">
            {(row.ref_number ?? "?")[0].toUpperCase()}
          </div>
          <div>
            <p className="m-0 text-[13px] font-semibold text-gray-900">
              {row.ref_number ?? "—"}
            </p>
          </div>
        </div>
      ),
    },
    {
      name: "Client",
      selector: (row) => row.client?.business_name ?? "",
      width: "160px",
      cell: (row) => (
        <span className="text-xs text-gray-600 font-mono">
          {row.client?.business_name ?? (
            <span className="text-gray-200">—</span>
          )}
        </span>
      ),
    },
    {
      name: "Operator",
      selector: (row) => row.operator?.full_name ?? "",
      width: "200px",
      cell: (row) => (
        <span className="text-xs text-gray-600 font-mono">
          {row.operator?.full_name ?? <span className="text-gray-200">—</span>}
        </span>
      ),
    },
    {
      name: "Drops",
      selector: (row) => row.drops_count ?? "",
      width: "50px",
      cell: (row) => (
        <span className="text-xs text-gray-600 font-mono">
          {row.drops_count ?? <span className="text-gray-200">—</span>}
        </span>
      ),
    },
    {
      name: "Out For Delivery",
      selector: (row) => row.out_for_delivery_at ?? "",
      // width: "80px",
      cell: (row) => (
        <span className="text-xs text-gray-600 font-mono">
          {formatDateTime(row.out_for_delivery_at) ?? (
            <span className="text-gray-200">—</span>
          )}
        </span>
      ),
    },
    {
      name: "Delivered At",
      selector: (row) => row.completed_at ?? "",
      // width: "80px",
      cell: (row) => (
        <span className="text-xs text-gray-600 font-mono">
          {formatDateTime(row.completed_at) ?? (
            <span className="text-gray-200">—</span>
          )}
        </span>
      ),
    },
    {
      name: "Date",
      selector: (row) => row.created_at ?? "",
      width: "160px",
      cell: (row) => (
        <span className="text-xs text-gray-600 font-mono">
          {fmtDate(row.created_at)}
        </span>
      ),
    },
    {
      name: "Actions",
      width: "110px",
      cell: (row) => (
        <div className="flex items-center gap-0.5">
          <ActionBtn
            title="Edit manifest"
            onClick={() => setEditTarget(row)}
            className="text-gray-500 hover:bg-indigo-50 hover:text-[#11117C]"
          >
            <FiEdit2 size={14} />
          </ActionBtn>

          <ActionBtn
            title="Assign operator"
            onClick={() => setAssignTarget(row)}
            className="text-gray-500 hover:bg-indigo-50 hover:text-[#11117C]"
          >
            <FiUserCheck size={14} />
          </ActionBtn>

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
    <div className="min-h-screen bg-[#f5f6fa] px-6 py-7">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="m-0 text-[22px] font-extrabold text-[#159143]">
            Job Postings
          </h1>
          <p className="mt-1 mb-0 text-[13px] text-gray-400">
            Track all platform delivery job postings
          </p>
        </div>
        <button
          onClick={() => setAddVisible(true)}
          className="flex items-center gap-1.5 bg-[#159143] text-white border-none rounded-xl px-4.5 py-2.5 text-[13px] font-semibold cursor-pointer shadow-[0_4px_16px_rgba(17,17,124,0.25)] transition-opacity duration-150 hover:opacity-90"
        >
          <FiPlus size={15} strokeWidth={2.5} />
          Add New Job
        </button>
      </div>

      {/* Stats */}
      <div
        className="grid gap-3.5 mb-6"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}
      >
        <StatCard
          label="Total jobs"
          value={jobs.length}
          icon={<MdWorkOutline size={20} />}
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-[#eef0f6] overflow-hidden shadow-[0_2px_8px_rgba(17,17,124,0.05)]">
        <div className="px-4.5 py-3.5 border-b border-[#f0f2f8] flex items-center gap-2.5">
          <FiSearch size={15} className="text-gray-400 shrink-0" />
          <input
            placeholder="Search jobs by reference or client…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border-none outline-none text-[13px] text-gray-700 bg-transparent w-full"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="bg-transparent border-none cursor-pointer text-gray-400 text-lg leading-none p-0 flex items-center"
            >
              <FiX size={16} />
            </button>
          )}
        </div>

        <DataTable
          columns={columns}
          data={filtered}
          progressPending={loading}
          progressComponent={
            <div className="py-8 text-center text-gray-400 text-[13px]">
              Loading jobs
            </div>
          }
          pagination
          paginationPerPage={15}
          paginationRowsPerPageOptions={[10, 15, 25, 50]}
          highlightOnHover
          striped
          responsive
          noDataComponent={
            <div className="py-12 text-center">
              <div className="text-[32px] mb-2.5">🚀</div>
              <p className="text-gray-500 text-[13px] m-0">
                {search
                  ? "No jobs match your search"
                  : "No jobs yet. Add your first one!"}
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
      <AddJobsModal
        visible={addVisible}
        onClose={() => setAddVisible(false)}
        onSuccess={() => {
          setAddVisible(false);
          showToast("Coordinators added!", "success");
          fetchManifests();
        }}
      />

      <EditManifestModal
        visible={!!editTarget}
        manifest={editTarget}
        onClose={() => setEditTarget(null)}
        onSuccess={() => {
          setEditTarget(null);
          showToast("Manifest updated successfully.", "success");
          fetchManifests();
        }}
      />

      <AssignOperatorModal
        visible={!!assignTarget}
        manifest={assignTarget}
        onClose={() => setAssignTarget(null)}
        onSuccess={() => {
          setAssignTarget(null);
          showToast("Operator assigned successfully.", "success");
          fetchManifests();
        }}
      />

      <ManifestDrawer manifest={selected} onClose={() => setSelected(null)} />

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
};

export default Jobs;
