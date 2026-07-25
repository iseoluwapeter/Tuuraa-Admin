import { useEffect, useState, useCallback, useRef } from "react";
import * as RDT from "react-data-table-component";
import type { TableColumn, SortOrder } from "react-data-table-component";
import { supabase } from "../constants/supabaseClient";
import { STATUS_COLORS, PAYMENT_COLORS, fmt, fmtDate } from "../constants/constants";
import { Badge } from "../components/Badge";
import { Modal } from "../components/Modal";
const DataTable = (RDT as any).default?.default ?? (RDT as any).default;

type Task = {
  id: string;
  client_id: string;
  tasker_id: string | null;
  title: string;
  description: string;
  final_price_ngn: number | null;
  tasker_earning_ngn: number | null;
  platform_fee_ngn: number | null;
  scheduled_date: string;
  status: string;
  payment_status: string;
};

type Tasker = {
  id: string;
  full_name: string;
};

type Stats = {
  total_tasks: number;
  open_tasks: number;
  disputed: number;
  pending_pay: number;
  total_revenue: number;
};

type SortField = keyof Task;

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE_DEFAULT = 10;
const SEARCH_DEBOUNCE_MS = 400;


const DetailRow = ({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) => (
  <div className="flex justify-between py-2 border-b border-gray-50 last:border-0 gap-4">
    <span className="text-xs text-gray-500 font-medium shrink-0">{label}</span>
    <span className="text-xs text-gray-800 text-right break-all">
      {value ?? "—"}
    </span>
  </div>
);

const StatCard = ({
  label,
  value,
  color,
}: {
  label: string;
  value: React.ReactNode;
  color: string;
}) => (
  <div className="bg-white rounded-xl p-4 shadow-sm border border-white/60">
    <p className={`text-2xl font-bold ${color}`}>{value}</p>
    <p className="text-xs text-gray-500 mt-0.5">{label}</p>
  </div>
);

// ─── Main Component 

const Tasks = () => {
  // Table data
  const [tasks, setTasks] = useState<Task[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [loading, setLoading] = useState(true);

  // Pagination & sort
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_DEFAULT);
  const [sortField, setSortField] = useState<SortField>("scheduled_date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Filters (debounced search)
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatus] = useState("all");
  const [payFilter, setPay] = useState("all");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Stats (independent of table pagination)
  const [stats, setStats] = useState<Stats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Modals
  const [detailTask, setDetailTask] = useState<Task | null>(null);
  const [assignTask, setAssignTask] = useState<Task | null>(null);
  const [cancelTask, setCancelTask] = useState<Task | null>(null);
  const [markPaidTask, setMarkPaidTask] = useState<Task | null>(null);
  const [flagTask, setFlagTask] = useState<Task | null>(null);

  // Assign tasker
  const [taskers, setTaskers] = useState<Tasker[]>([]);
  const [selectedTasker, setSelectedTasker] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // ── Debounce search input ─────────────────────────────────────────────────

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchInput(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearch(val);
      setCurrentPage(1); // reset to page 1 on new search
    }, SEARCH_DEBOUNCE_MS);
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatus(e.target.value);
    setCurrentPage(1);
  };

  const handlePayChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPay(e.target.value);
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setSearchInput("");
    setSearch("");
    setStatus("all");
    setPay("all");
    setCurrentPage(1);
  };

  //  Fetch stats (one RPC, independent of table) 

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const { data, error } = await supabase.rpc("get_tasks_summary");
      if (error) throw error;
      setStats(data as Stats);
    } catch (err) {
      console.error("Stats fetch failed:", err);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // ── Fetch current page (server-side) ─────────────────────────────────────

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from("tasks")
        .select(
          "id, client_id, tasker_id, title, description, final_price_ngn, tasker_earning_ngn, platform_fee_ngn, scheduled_date, status, payment_status",
          { count: "exact" },
        )
        .order(sortField, { ascending: sortDir === "asc" })
        .range(from, to);

      if (statusFilter !== "all") query = query.eq("status", statusFilter);
      if (payFilter !== "all") query = query.eq("payment_status", payFilter);
      if (search.trim()) query = query.ilike("title", `%${search.trim()}%`);

      const { data, count, error } = await query;
      if (error) throw error;

      setTasks((data as Task[]) ?? []);
      setTotalRows(count ?? 0);
    } catch (err) {
      console.error("Tasks fetch failed:", err);
      alert("Failed to fetch tasks");
    } finally {
      setLoading(false);
    }
  }, [
    currentPage,
    pageSize,
    sortField,
    sortDir,
    statusFilter,
    payFilter,
    search,
  ]);

  // ── Fetch approved taskers for assign modal ───────────────────────────────

  const fetchTaskers = async () => {
    const { data } = await supabase
      .from("users")
      .select("id, full_name")
      .eq("role", "tasker")
  
    setTaskers((data as Tasker[]) ?? []);
  };

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // ── RDT server-side handlers ──────────────────────────────────────────────

  const handlePageChange = (page: number) => setCurrentPage(page);

  const handleRowsPerPageChange = (newSize: number, page: number) => {
    setPageSize(newSize);
    setCurrentPage(page);
  };

  const handleSort = (column: TableColumn<Task>, direction: SortOrder) => {
    if (column.sortField) {
      setSortField(column.sortField as SortField);
      setSortDir(direction === "asc" ? "asc" : "desc");
      setCurrentPage(1);
    }
  };

  // Actions 

  const handleAssignTasker = async () => {
    if (!assignTask || !selectedTasker) return;
    setActionLoading(true);
    const { error } = await supabase
      .from("tasks")
      .update({ tasker_id: selectedTasker, status: "assigned" })
      .eq("id", assignTask.id);
    setActionLoading(false);
    if (error) {
      alert("Failed to assign tasker");
      return;
    }
    setAssignTask(null);
    setSelectedTasker("");
    fetchTasks();
    fetchStats();
  };

  const handleCancelTask = async () => {
    if (!cancelTask) return;
    setActionLoading(true);
    const { error } = await supabase
      .from("tasks")
      .update({ status: "cancelled" })
      .eq("id", cancelTask.id);
    setActionLoading(false);
    if (error) {
      alert("Failed to cancel task");
      return;
    }
    setCancelTask(null);
    fetchTasks();
    fetchStats();
  };

  const handleMarkPaid = async () => {
    if (!markPaidTask) return;
    setActionLoading(true);
    const { error } = await supabase
      .from("tasks")
      .update({ payment_status: "paid" })
      .eq("id", markPaidTask.id);
    setActionLoading(false);
    if (error) {
      alert("Failed to mark as paid");
      return;
    }
    setMarkPaidTask(null);
    fetchTasks();
    fetchStats();
  };

  const handleFlagDispute = async () => {
    if (!flagTask) return;
    setActionLoading(true);
    const { error } = await supabase
      .from("tasks")
      .update({ status: "disputed" })
      .eq("id", flagTask.id);
    setActionLoading(false);
    if (error) {
      alert("Failed to flag dispute");
      return;
    }
    setFlagTask(null);
    fetchTasks();
    fetchStats();
  };

  // Columns

  const columns: TableColumn<Task>[] = [
    {
      name: "#",
      width: "50px",
      cell: (_, index) => (
        <span className="text-gray-400 text-xs">
          {(currentPage - 1) * pageSize + index + 1}
        </span>
      ),
    },
    {
      name: "Title",
      sortField: "title",
      sortable: true,
      width: "160px",
      selector: (row) => row.title ?? "",
      cell: (row) => (
        <span
          className="font-medium text-gray-800 text-sm truncate"
          title={row.title}
        >
          {row.title ?? "—"}
        </span>
      ),
    },
    {
      name: "Client",
      sortField: "client_id",
      sortable: true,
      width: "140px",
      selector: (row) => row.client_id ?? "",
      cell: (row) => (
        <span
          className="text-xs text-gray-500 font-mono truncate"
          title={row.client_id}
        >
          {row.client_id ? `${row.client_id.slice(0, 8)}…` : "—"}
        </span>
      ),
    },
    {
      name: "Tasker",
      sortField: "tasker_id",
      sortable: true,
      width: "140px",
      selector: (row) => row.tasker_id ?? "",
      cell: (row) =>
        row.tasker_id ? (
          <span
            className="text-xs text-gray-500 font-mono truncate"
            title={row.tasker_id}
          >
            {row.tasker_id.slice(0, 8)}…
          </span>
        ) : (
          <span className="text-xs text-orange-500 font-medium italic">
            Unassigned
          </span>
        ),
    },
    {
      name: "Amount",
      sortField: "final_price_ngn",
      sortable: true,
      width: "130px",
      selector: (row) => row.final_price_ngn ?? 0,
      cell: (row) => (
        <span className="text-sm font-semibold text-gray-800">
          {fmt(row.final_price_ngn)}
        </span>
      ),
    },
   
    {
      name: "Date",
      sortField: "scheduled_date",
      sortable: true,
      width: "130px",
      selector: (row) => row.scheduled_date ?? "",
      cell: (row) => (
        <span className="text-xs text-gray-600">
          {fmtDate(row.scheduled_date)}
        </span>
      ),
    },
    {
      name: "Status",
      sortField: "status",
      sortable: true,
      width: "130px",
      selector: (row) => row.status ?? "",
      cell: (row) => <Badge value={row.status} map={STATUS_COLORS} />,
    },
    {
      name: "Payment",
      sortField: "payment_status",
      sortable: true,
      width: "120px",
      selector: (row) => row.payment_status ?? "",
      cell: (row) => <Badge value={row.payment_status} map={PAYMENT_COLORS} />,
    },
    {
      name: "Actions",
      width: "160px",
      cell: (row) => (
        <div className="flex items-center gap-1">
          {/* View Details — always */}
          <button
            title="View details"
            onClick={() => setDetailTask(row)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-[#11117C] hover:bg-indigo-50 transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
          </button>

          {/* Assign Tasker — unassigned or open only */}
          {(!row.tasker_id || row.status === "open") && (
            <button
              title="Assign tasker"
              onClick={() => {
                setAssignTask(row);
                fetchTaskers();
              }}
              className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                />
              </svg>
            </button>
          )}

          {/* Mark Paid — pending payment only */}
          {row.payment_status === "pending" && (
            <button
              title="Mark as paid"
              onClick={() => setMarkPaidTask(row)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </button>
          )}

          {/* Flag Dispute */}
          {!["cancelled", "disputed", "completed"].includes(row.status) && (
            <button
              title="Flag as disputed"
              onClick={() => setFlagTask(row)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-purple-600 hover:bg-purple-50 transition-colors"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9"
                />
              </svg>
            </button>
          )}

          {/* Cancel Task */}
          {["open", "assigned", "in_progress"].includes(row.status) && (
            <button
              title="Cancel task"
              onClick={() => setCancelTask(row)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>
      ),
    },
  ];

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100 p-6">
      {/* Header */}
      <div className="mb-6">
        <p className="text-xl font-bold text-[#11117C]">Tasks</p>
        <p className="text-sm text-gray-500 mt-0.5">
          Manage all platform tasks · {totalRows.toLocaleString()} total rows
        </p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        <StatCard
          label="Total Tasks"
          value={
            statsLoading ? "…" : (stats?.total_tasks ?? 0).toLocaleString()
          }
          color="text-[#11117C]"
        />
        <StatCard
          label="Open / Unassigned"
          value={statsLoading ? "…" : (stats?.open_tasks ?? 0).toLocaleString()}
          color="text-orange-600"
        />
        <StatCard
          label="Disputed"
          value={statsLoading ? "…" : (stats?.disputed ?? 0).toLocaleString()}
          color="text-purple-600"
        />
        <StatCard
          label="Pending Payments"
          value={
            statsLoading ? "…" : (stats?.pending_pay ?? 0).toLocaleString()
          }
          color="text-yellow-600"
        />
        <StatCard
          label="Platform Revenue"
          value={statsLoading ? "…" : fmt(stats?.total_revenue ?? null)}
          color="text-green-600"
        />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-white/60 p-4 mb-4 flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="Search by title… (400ms debounce)"
          value={searchInput}
          onChange={handleSearchChange}
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
        />
        <select
          value={statusFilter}
          onChange={handleStatusChange}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
        >
          <option value="all">All Statuses</option>
          <option value="open">Open</option>
          <option value="assigned">Assigned</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
          <option value="disputed">Disputed</option>
        </select>
        <select
          value={payFilter}
          onChange={handlePayChange}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
        >
          <option value="all">All Payments</option>
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
          <option value="failed">Failed</option>
          <option value="refunded">Refunded</option>
        </select>
        <button
          onClick={handleClearFilters}
          className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap"
        >
          Clear
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-white/60 overflow-hidden">
        <DataTable
          columns={columns}
          data={tasks}
          progressPending={loading}
          progressComponent={
            <div className="py-5 text-center text-gray-400 text-sm animate-pulse">
              Loading…
            </div>
          }
          // ── Server-side pagination ──
          pagination
          paginationServer
          paginationTotalRows={totalRows}
          paginationDefaultPage={currentPage}
          onChangePage={handlePageChange}
          onChangeRowsPerPage={handleRowsPerPageChange}
          paginationRowsPerPageOptions={[10, 25, 50, 100]}
          // ── Server-side sort ──
          sortServer
          onSort={handleSort}
          // ── UI ──
          highlightOnHover
          striped
          responsive
          noDataComponent={
            <div className="py-12 text-center text-gray-400 text-sm">
              No tasks found
            </div>
          }
          customStyles={{
            headCells: {
              style: {
                backgroundColor: "#f8f9ff",
                color: "#11117C",
                fontWeight: "600",
                fontSize: "12px",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              },
            },
          }}
        />
      </div>

      {/* ── Modals ─────────────────────────────────────────────────────────── */}

      {/* View Details */}
      {detailTask && (
        <Modal title="Task Details" onClose={() => setDetailTask(null)}>
          <DetailRow
            label="Task ID"
            value={
              <span className="font-mono text-[10px]">{detailTask.id}</span>
            }
          />
          <DetailRow label="Title" value={detailTask.title} />
          <DetailRow label="Description" value={detailTask.description} />
          <DetailRow
            label="Client ID"
            value={
              <span className="font-mono text-[10px]">
                {detailTask.client_id}
              </span>
            }
          />
          <DetailRow
            label="Tasker ID"
            value={
              detailTask.tasker_id ? (
                <span className="font-mono text-[10px]">
                  {detailTask.tasker_id}
                </span>
              ) : (
                <span className="italic text-orange-500">Unassigned</span>
              )
            }
          />
          <DetailRow label="Amount" value={fmt(detailTask.final_price_ngn)} />
          <DetailRow
            label="Tasker Earning"
            value={fmt(detailTask.tasker_earning_ngn)}
          />
          <DetailRow
            label="Platform Fee"
            value={fmt(detailTask.platform_fee_ngn)}
          />
          <DetailRow
            label="Scheduled Date"
            value={fmtDate(detailTask.scheduled_date)}
          />
          <DetailRow
            label="Status"
            value={<Badge value={detailTask.status} map={STATUS_COLORS} />}
          />
          <DetailRow
            label="Payment Status"
            value={
              <Badge value={detailTask.payment_status} map={PAYMENT_COLORS} />
            }
          />
        </Modal>
      )}

      {/* Assign Tasker */}
      {assignTask && (
        <Modal
          title="Assign Tasker"
          onClose={() => {
            setAssignTask(null);
            setSelectedTasker("");
          }}
        >
          <p className="text-sm text-gray-600 mb-4">
            Assigning a tasker to:{" "}
            <span className="font-semibold text-gray-800">
              {assignTask.title}
            </span>
          </p>
          {taskers.length === 0 ? (
            <p className="text-sm text-gray-400 italic mb-4">
              No approved taskers available.
            </p>
          ) : (
            <select
              value={selectedTasker}
              onChange={(e) => setSelectedTasker(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            >
              <option value="">Select a tasker…</option>
              {taskers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.full_name} ({t.id.slice(0, 8)}…)
                </option>
              ))}
            </select>
          )}
          <div className="flex justify-end gap-3">
            <button
              onClick={() => {
                setAssignTask(null);
                setSelectedTasker("");
              }}
              className="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleAssignTasker}
              disabled={!selectedTasker || actionLoading}
              className="px-4 py-2 text-sm text-white bg-[#11117C] rounded-lg hover:bg-indigo-800 disabled:opacity-50"
            >
              {actionLoading ? "Assigning…" : "Assign Tasker"}
            </button>
          </div>
        </Modal>
      )}

      {/* Mark as Paid */}
      {markPaidTask && (
        <Modal
          title="Mark Payment as Paid"
          onClose={() => setMarkPaidTask(null)}
        >
          <p className="text-sm text-gray-600 mb-2">
            Mark payment as{" "}
            <span className="font-semibold text-green-600">Paid</span> for:
          </p>
          <p className="text-sm font-semibold text-gray-800 mb-1">
            {markPaidTask.title}
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Amount: {fmt(markPaidTask.final_price_ngn)}
          </p>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setMarkPaidTask(null)}
              className="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleMarkPaid}
              disabled={actionLoading}
              className="px-4 py-2 text-sm text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {actionLoading ? "Saving…" : "Confirm Paid"}
            </button>
          </div>
        </Modal>
      )}

      {/* Flag Dispute */}
      {flagTask && (
        <Modal title="Flag as Disputed" onClose={() => setFlagTask(null)}>
          <p className="text-sm text-gray-600 mb-2">
            Flag this task as{" "}
            <span className="font-semibold text-purple-600">Disputed</span>?
          </p>
          <p className="text-sm font-semibold text-gray-800 mb-6">
            {flagTask.title}
          </p>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setFlagTask(null)}
              className="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleFlagDispute}
              disabled={actionLoading}
              className="px-4 py-2 text-sm text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50"
            >
              {actionLoading ? "Flagging…" : "Flag Dispute"}
            </button>
          </div>
        </Modal>
      )}

      {/* Cancel Task */}
      {cancelTask && (
        <Modal title="Cancel Task" onClose={() => setCancelTask(null)}>
          <p className="text-sm text-gray-600 mb-2">
            Are you sure you want to{" "}
            <span className="font-semibold text-red-600">cancel</span> this
            task?
          </p>
          <p className="text-sm font-semibold text-gray-800 mb-1">
            {cancelTask.title}
          </p>
          <p className="text-xs text-gray-400 mb-6">
            This action cannot be undone from this panel.
          </p>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setCancelTask(null)}
              className="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              Go Back
            </button>
            <button
              onClick={handleCancelTask}
              disabled={actionLoading}
              className="px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              {actionLoading ? "Cancelling…" : "Yes, Cancel Task"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Tasks;
