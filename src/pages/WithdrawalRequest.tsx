import { useEffect, useState, useCallback, useRef } from "react";
import * as RDT from "react-data-table-component";
import type { TableColumn, SortOrder } from "react-data-table-component";
import { supabase } from "../constants/supabaseClient";
import { fmtDate, fmt } from "../constants/constants";
import { Badge } from "../components/Badge";
import { STATUS_COLORS } from "../constants/constants";


const DataTable = (RDT as any).default?.default ?? (RDT as any).default;

//  Types 

type WithdrawalRequest = {
  id: string;
  tasker_id: string;
  bank_name: string;
  account_number: string;
  account_name: string;
  status: "pending" | "approved" | "rejected" | string;
  processed_at: string | null;
  created_at: string;
  gross_amount: number;
  wht_amount: number;
  net_payout: number;
  // joined from users table
  tasker_name: string | null;
  tasker_phone: string | null;
};

type StatusFilter = "all" | "pending" | "approved" | "rejected";

type SortField = "created_at" | "gross_amount" | "status";

// Helpers 

const PAGE_SIZE = 10;


//  Detail Modal 

const DetailModal = ({
  row,
  onClose,
  onApprove,
  onReject,
  actionLoading,
}: {
  row: WithdrawalRequest;
  onClose: () => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  actionLoading: string | null;
}) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
    onClick={onClose}
  >
    <div
      className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="bg-linear-to-r from-[#11117C] to-indigo-600 px-6 py-4 flex items-center justify-between">
        <div>
          <p className="text-white font-bold text-lg">Withdrawal Details</p>
          <p className="text-indigo-200 text-xs font-mono mt-0.5 truncate max-w-65">
            {row.id}
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-white/70 hover:text-white transition-colors"
        >
          <svg
            className="w-5 h-5"
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
      </div>

      {/* Body */}
      <div className="p-6 space-y-4">
        {/* Tasker */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-[#11117C] font-bold text-sm">
            {(row.tasker_name ?? "?")[0].toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-gray-800 text-sm">
              {row.tasker_name ?? "Unknown Tasker"}
            </p>
            <p className="text-gray-400 text-xs">
              {row.tasker_phone ?? row.tasker_id}
            </p>
          </div>
          <Badge value={row.status} map={STATUS_COLORS} />
        </div>

        <div className="h-px bg-gray-100" />

        {/* Amounts */}
        <div className="grid grid-cols-3 gap-3 text-center">
          {[
            {
              label: "Gross",
              value: fmt(row.gross_amount),
              color: "text-gray-800",
            },
            {
              label: "WHT (5%)",
              value: fmt(row.wht_amount),
              color: "text-red-500",
            },
            {
              label: "Net Payout",
              value: fmt(row.net_payout),
              color: "text-green-600 font-bold",
            },
          ].map((item) => (
            <div key={item.label} className="bg-gray-50 rounded-xl p-3">
              <p className={`text-sm ${item.color}`}>{item.value}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{item.label}</p>
            </div>
          ))}
        </div>

        <div className="h-px bg-gray-100" />

        {/* Bank details */}
        {[
          { label: "Bank", value: row.bank_name },
          { label: "Account Number", value: row.account_number },
          { label: "Account Name", value: row.account_name },
          { label: "Submitted", value: fmtDate(row.created_at) },
          {
            label: "Processed",
            value: row.processed_at ? fmtDate(row.processed_at) : "—",
          },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="flex justify-between items-center text-sm"
          >
            <span className="text-gray-400">{label}</span>
            <span className="text-gray-800 font-medium">{value ?? "—"}</span>
          </div>
        ))}
      </div>

      {/* Actions */}
      {row.status === "pending" && (
        <div className="px-6 pb-6 flex gap-3">
          <button
            disabled={actionLoading === row.id}
            onClick={() => onReject(row.id)}
            className="flex-1 py-2.5 rounded-xl border border-red-200 text-red-600 text-sm font-semibold hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            Reject
          </button>
          <button
            disabled={actionLoading === row.id}
            onClick={() => onApprove(row.id)}
            className="flex-1 py-2.5 rounded-xl bg-[#11117C] text-white text-sm font-semibold hover:bg-indigo-800 transition-colors disabled:opacity-50"
          >
            {actionLoading === row.id ? "Processing…" : "Approve"}
          </button>
        </div>
      )}
    </div>
  </div>
);

// ─── Main Component 

const WithdrawalRequest = () => {
  const [rows, setRows] = useState<WithdrawalRequest[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    completed: 0,
    totalVolume: 0,
  });

  // Detail / action state
  const [detailRow, setDetailRow] = useState<WithdrawalRequest | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // ─── Fetch Stats (once, independent of pagination) 

  const fetchStats = useCallback(async () => {
    const { data } = await supabase
      .from("withdrawal_requests")
      .select("status, gross_amount");

    if (!data) return;
    setStats({
      total: data.length,
      pending: data.filter((r) => r.status === "pending").length,
      completed: data.filter((r) => r.status === "completed").length,
      totalVolume: data.reduce((sum, r) => sum + (r.gross_amount ?? 0), 0),
    });
  }, []);

  // ─── Fetch Paginated Data 

  const fetchData = useCallback(
    async (page: number, searchVal: string, status: StatusFilter) => {
      setLoading(true);
      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from("withdrawal_requests")
        .select(
          `
          id,
          tasker_id,
          bank_name,
          account_number,
          account_name,
          status,
          processed_at,
          created_at,
          gross_amount,
          wht_amount,
          net_payout,
          users!withdrawal_requests_tasker_id_fkey (
            full_name,
            phone
          )
        `,
          { count: "exact" },
        )
        .order(sortField, { ascending: sortDir === "asc" })
        .range(from, to);

      if (status !== "all") {
        query = query.eq("status", status);
      }

      // Search against the joined name or account_name
      if (searchVal.trim()) {
        query = query.or(
          `account_name.ilike.%${searchVal}%,account_number.ilike.%${searchVal}%`,
        );
      }

      const { data, error, count } = await query;

      if (error) {
        console.error(error);
        setLoading(false);
        return;
      }

      const mapped: WithdrawalRequest[] = (data ?? []).map((r: any) => ({
        ...r,
        tasker_name: r.users?.full_name ?? null,
        tasker_phone: r.users?.phone ?? null,
      }));

      setRows(mapped);
      setTotalRows(count ?? 0);
      setLoading(false);
    },
    [sortField, sortDir],
  );

  //  Effects 

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Debounce search; immediate on filter/page/sort change
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setCurrentPage(1);
      fetchData(1, search, statusFilter);
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  useEffect(() => {
    fetchData(currentPage, search, statusFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, statusFilter, sortField, sortDir]);

  //  Approve / Reject 

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    const { error } = await supabase
      .from("withdrawal_requests")
      .update({ status: "completed", processed_at: new Date().toISOString() })
      .eq("id", id);
    if (error) alert("Failed to approve: " + error.message);
    else {
      setDetailRow(null);
      fetchData(currentPage, search, statusFilter);
      fetchStats();
    }
    setActionLoading(null);
  };

  const handleReject = async (id: string) => {
    setActionLoading(id);
    const { error } = await supabase
      .from("withdrawal_requests")
      .update({ status: "rejected", processed_at: new Date().toISOString() })
      .eq("id", id);
    if (error) alert("Failed to reject: " + error.message);
    else {
      setDetailRow(null);
      fetchData(currentPage, search, statusFilter);
      fetchStats();
    }
    setActionLoading(null);
  };

  //  Sort handler 

  const handleSort = (
    column: TableColumn<WithdrawalRequest>,
    direction: SortOrder,
  ) => {
    const fieldMap: Record<string, SortField> = {
      created_at: "created_at",
      gross_amount: "gross_amount",
      status: "status",
    };
    const key = column.id as string;
    if (fieldMap[key]) {
      setSortField(fieldMap[key]);
      setSortDir(direction === "asc" ? "asc" : "desc");
      setCurrentPage(1);
    }
  };

  //  Columns 
  const columns: TableColumn<WithdrawalRequest>[] = [
    {
      name: "#",
      cell: (_, index) => (
        <span className="text-gray-400 text-xs">
          {(currentPage - 1) * PAGE_SIZE + index + 1}
        </span>
      ),
      width: "50px",
      id: "index",
    },
    {
      name: "Tasker",
      id: "tasker",
      selector: (row) => row.tasker_name ?? row.account_name ?? "—",
      width: "180px",
      cell: (row) => (
        <div>
          <p className="text-xs font-semibold text-gray-700">
            {row.tasker_name ?? "—"}
          </p>
          <p className="text-[10px] text-gray-400">{row.tasker_phone ?? ""}</p>
        </div>
      ),
    },
    {
      name: "Bank / Account",
      id: "bank",
      width: "190px",
      cell: (row) => (
        <div>
          <p className="text-xs text-gray-700 font-medium">
            {row.account_name}
          </p>
          <p className="text-[10px] text-gray-400 font-mono">
            {row.bank_name} · {row.account_number}
          </p>
        </div>
      ),
    },
    {
      name: "Gross Amount",
      id: "gross_amount",
      selector: (row) => row.gross_amount,
      sortable: true,
      width: "130px",
      cell: (row) => (
        <span className="text-xs font-semibold text-gray-700">
          {fmt(row.gross_amount)}
        </span>
      ),
    },
    {
      name: "Net Payout",
      id: "net_payout",
      width: "120px",
      cell: (row) => (
        <span className="text-xs font-semibold text-green-700">
          {fmt(row.net_payout)}
        </span>
      ),
    },
    {
      name: "Status",
      id: "status",
      sortable: true,
      width: "120px",
      cell: (row) => <Badge value={row.status} map={STATUS_COLORS} />,
    },
    {
      name: "Submitted",
      id: "created_at",
      selector: (row) => row.created_at ?? "",
      sortable: true,
      width: "130px",
      cell: (row) => (
        <span className="text-xs text-gray-500">{fmtDate(row.created_at)}</span>
      ),
    },
    {
      name: "Actions",
      width: "80px",
      cell: (row) => (
        <button
          title="View details"
          onClick={() => setDetailRow(row)}
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
      ),
    },
  ];

  // Render 

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100 p-6">
      {/* Header */}
      <div className="mb-6">
        <p className="text-xl font-bold text-[#11117C]">Withdrawal Requests</p>
        <p className="text-sm text-gray-500 mt-0.5">
          Review and process tasker withdrawal requests
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          {
            label: "Total Requests",
            value: stats.total,
            color: "text-[#11117C]",
          },
          { label: "Pending", value: stats.pending, color: "text-amber-600" },
          {
            label: "Approved",
            value: stats.completed,
            color: "text-green-600",
          },
          {
            label: "Total Volume",
            value: fmt(stats.totalVolume),
            color: "text-indigo-600",
          },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-white rounded-xl p-4 shadow-sm border border-white/60"
          >
            <p className={`text-xl font-bold ${s.color} truncate`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-white/60 p-4 mb-4 flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="Search by account name or number…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
        />
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as StatusFilter);
            setCurrentPage(1);
          }}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        <button
          onClick={() => {
            setSearch("");
            setStatusFilter("all");
            setCurrentPage(1);
          }}
          className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Clear
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-white/60 overflow-hidden">
        <DataTable
          columns={columns}
          data={rows}
          progressPending={loading}
          pagination
          paginationServer
          paginationTotalRows={totalRows}
          paginationPerPage={PAGE_SIZE}
          paginationRowsPerPageOptions={[PAGE_SIZE]}
          onChangePage={(page: number) => setCurrentPage(page)}
          sortServer
          onSort={handleSort}
          highlightOnHover
          striped
          responsive
          noDataComponent={
            <div className="py-12 text-center text-gray-400 text-sm">
              No withdrawal requests found
            </div>
          }
          progressComponent={
            <div className="py-12 text-center text-gray-400 text-sm animate-pulse">
              Loading…
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

      {/* Detail modal */}
      {detailRow && (
        <DetailModal
          row={detailRow}
          onClose={() => setDetailRow(null)}
          onApprove={handleApprove}
          onReject={handleReject}
          actionLoading={actionLoading}
        />
      )}
    </div>
  );
};

export default WithdrawalRequest;
