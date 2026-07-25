import { useEffect, useState, useCallback } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { supabase } from "../constants/supabaseClient";
import { FiUsers, FiUserCheck, FiRefreshCw } from "react-icons/fi";
import { StatCard } from "../components/StatCard";
import { FaMoneyBill } from "react-icons/fa";
import { FaMoneyBill1 } from "react-icons/fa6";
import { number } from "framer-motion";

// ─── Types ────────────────────────────────────────────────────────────────────

type Stats = {
  totalClients: number;
  totalOperators: number;
  totalCoordinators: number;
  recentJobs: number;
  // totalTasks: number;
  // activeTasks: number;
  // completedTasks: number;
  // pendingWithdrawals: number;
  // pendingKyc: number;
  totalPayouts: number;
};

type MonthlyPoint = { month: string; tasks: number; completions: number };
type UserGrowthPoint = { month: string; clients: number; operators: number };

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function fmtCurrency(val: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(val);
}

function fmtNumber(val: number) {
  if (val >= 1000) return `${(val / 1000).toFixed(1)}k`;
  return val.toString();
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-[#eef0f6] rounded-xl px-3 py-2 shadow-lg text-xs">
      <p className="font-bold text-[#11117C] mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }} className="m-0">
          {p.name}: <span className="font-semibold">{p.value}</span>
        </p>
      ))}
    </div>
  );
};

// ─── Section Header ───────────────────────────────────────────────────────────

const SectionHeader = ({ title, sub }: { title: string; sub?: string }) => (
  <div className="mb-4">
    <h2 className="m-0 text-[15px] font-bold text-[#159143]">{title}</h2>
    {sub && <p className="m-0 mt-0.5 text-[12px] text-gray-400">{sub}</p>}
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const Dashboard = () => {
  const [stats, setStats] = useState<Stats>({
    totalClients: 0,
    totalOperators: 0,
    totalCoordinators: 0,
    totalPayouts: 0,
    recentJobs: 0,
  });
  const [monthlyData, setMonthlyData] = useState<MonthlyPoint[]>([]);
  const [userGrowth, setUserGrowth] = useState<UserGrowthPoint[]>([]);
  const [recentTasks, setRecentTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const now = new Date();
    try {
      // Parallel fetches
      const [
        clientsRes,
        operatorsRes,
        coordinatorsRes,
        recentJobRes,
        allJobsRes,
        invoicesRes,
      ] = await Promise.all([
        supabase.from("clients").select("id, created_at", { count: "exact" }),
        supabase
          .from("operators")
          .select("id, created_at", { count: "exact" }),
        supabase
          .from("users")
          .select("id, created_at", { count: "exact" })
          .eq("role", "coordinator"),
        supabase
          .from("manifests")
          .select(
            `id,ref_number,created_at,drops_count,client:clients (business_name),operator:operators!manifests_operator_id_fkey (full_name )`,
          )
          .order("created_at", { ascending: false })
          .limit(6),
        supabase
          .from("manifests")
          .select("id, created_at")
          .gte(
            "created_at",
            new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString(),
          ),
        supabase.from("invoices").select("id, subtotal").eq("status", "paid"),
      ]);

      const totalRevenue =
        invoicesRes.data?.reduce(
          (sum, invoice) => sum + (invoice.subtotal ?? 0),
          0,
        ) ?? 0;

      setStats({
        totalClients: clientsRes.count ?? 0,
        totalOperators: operatorsRes.count ?? 0,
        totalCoordinators: coordinatorsRes.count ?? 0,
        recentJobs: 0,
        // totalTasks: tasks.length,
        totalPayouts: totalRevenue,
      });
      console.log(invoicesRes);

      const recentjobs = recentJobRes.data ?? [];
      const allJobs = allJobsRes.data ?? [];
      console.log("total jobs", allJobsRes.data);

      // Monthly tasks (last 6 months from tasks data)
      const monthly: MonthlyPoint[] = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
        const y = d.getFullYear();
        const m = d.getMonth();
        const monthJobs = allJobs.filter((t) => {
          const td = new Date(t.created_at);
          return td.getFullYear() === y && td.getMonth() === m;
        });
        return {
          month: MONTHS[m],
          tasks: monthJobs.length,
          completions: 0, // remove or use a real status field
        };
      });

      setMonthlyData(monthly);

      // User growth (last 6 months)
      const clients = clientsRes.data ?? [];
      const operators = operatorsRes.data ?? [];
      const growth: UserGrowthPoint[] = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
        const y = d.getFullYear();
        const m = d.getMonth();
        const inMonth = (list: any[]) =>
          list.filter((u) => {
            const ud = new Date(u.created_at);
            return ud.getFullYear() === y && ud.getMonth() === m;
          }).length;
        return {
          month: MONTHS[m],
          clients: inMonth(clients),
          operators: inMonth(operators),
        };
      });
      setUserGrowth(growth);

      setRecentTasks(recentJobRes.data ?? []);
      console.log("ercnt job", recentJobRes.data);
      setLastRefreshed(new Date());
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return (
    <div className="min-h-screen bg-[#f5f6fa] px-6 py-7">
      {/* ── Header ── */}
      <div className="flex justify-between items-start mb-7">
        <div>
          <h1 className="m-0 text-[22px] font-extrabold text-[#159143] tracking-tight">
            Operations Overview
          </h1>
          <p className="mt-1 mb-0 text-[13px] text-gray-400">
            Last refreshed at{" "}
            {lastRefreshed.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
        <button
          onClick={fetchAll}
          disabled={loading}
          className="flex items-center gap-2 bg-white border border-[#eef0f6] text-[#159143] rounded-xl px-4 py-2.5 text-[13px] font-semibold cursor-pointer shadow-sm hover:shadow-md transition-all duration-150 disabled:opacity-50"
        >
          <FiRefreshCw size={13} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* ──  Stat Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-5">
        <StatCard
          label="Total Clients"
          value={loading ? "—" : fmtNumber(stats.totalClients)}
          icon={<FiUsers size={16} />}
          // accent="#11117C"
        />
        <StatCard
          label="Operators"
          value={loading ? "—" : fmtNumber(stats.totalOperators)}
          icon={<FiUserCheck size={16} />}
          // accent="#0ea5e9"
        />
        <StatCard
          label="Coordinators"
          value={loading ? "—" : fmtNumber(stats.totalCoordinators)}
          icon={<FiUsers size={16} />}
          // accent="#8b5cf6"
        />
        <StatCard
          label="Total Revenue"
          value={loading ? "—" : fmtCurrency(stats.totalPayouts)}
          icon={<FaMoneyBill1 />}
          // accent="#11117C"
        />
      </div>

      {/* ── Charts Row 1 ── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-4">
        {/* Task Activity Area Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#eef0f6] p-5 shadow-[0_2px_8px_rgba(17,17,124,0.04)]">
          <SectionHeader
            title="Job Volume"
            sub="Total jobs created per month (last 6 months)"
          />
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={monthlyData}
              margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#f0f2f8"
                vertical={false}
              />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="bg-white border border-[#eef0f6] rounded-xl px-3 py-2 shadow-lg">
                      <p className="text-[11px] font-bold text-[#159143] mb-1">
                        {label}
                      </p>
                      <p className="text-[11px] text-gray-500 m-0">
                        Jobs:{" "}
                        <span className="font-semibold text-gray-700">
                          {payload[0].value}
                        </span>
                      </p>
                    </div>
                  );
                }}
              />
              <Bar
                dataKey="tasks"
                name="Jobs"
                radius={[4, 4, 0, 0]}
                maxBarSize={36}
              >
                {monthlyData.map((_, i) => (
                  <Cell
                    key={i}
                    fill={i === monthlyData.length - 1 ? "#159143" : "#c7c9e8"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-5 mt-3">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-[#159143]" />
              <span className="text-[11px] text-gray-400">Current month</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-[#c7c9e8]" />
              <span className="text-[11px] text-gray-400">Previous months</span>
            </div>
          </div>
        </div>

        {/* User Growth Bar Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#eef0f6] p-5 shadow-[0_2px_8px_rgba(17,17,124,0.04)]">
          <SectionHeader
            title="User Growth"
            sub="New clients & operators per month"
          />
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={userGrowth}
              margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
              barGap={4}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#f0f2f8"
                vertical={false}
              />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#159143" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<ChartTooltip />} />
              <Bar
                dataKey="clients"
                name="Clients"
                fill="#159143"
                radius={[4, 4, 0, 0]}
                maxBarSize={20}
              />
              <Bar
                dataKey="operators"
                name="Operators"
                fill="#0ea5e9"
                radius={[4, 4, 0, 0]}
                maxBarSize={20}
              />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-5 mt-3">
            {[
              { color: "#11117C", label: "Clients" },
              { color: "#0ea5e9", label: "Operators" },
            ].map((l) => (
              <div key={l.label} className="flex items-center gap-1.5">
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ background: l.color }}
                />
                <span className="text-[11px] text-gray-400">{l.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Recent Tasks Table ── */}
      <div className="bg-white rounded-2xl border border-[#eef0f6] overflow-hidden shadow-[0_2px_8px_rgba(17,17,124,0.04)]">
        <div className="px-5 py-4 border-b border-[#f0f2f8]">
          <SectionHeader
            title="Recent Jobs"
            sub="Latest task activity on the platform"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-[#f8f9ff] border-b-2 border-[#eef0f6]">
                {[
                  "#",
                  "Manifest Ref",
                  "Client",
                  "Operator",
                  "Drops",
                  "Created",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-5 py-3 text-left text-[11px] font-bold text-[#159143] uppercase tracking-widest"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={5}
                    className="text-center py-10 text-gray-400 text-[13px]"
                  >
                    Loading recent tasks…
                  </td>
                </tr>
              ) : recentTasks.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="text-center py-10 text-gray-400 text-[13px]"
                  >
                    No tasks yet
                  </td>
                </tr>
              ) : (
                recentTasks.map((task, i) => (
                  <tr
                    key={task.id}
                    className="border-b border-[#f5f6fa] hover:bg-[#f5f7ff] transition-colors duration-100"
                  >
                    <td className="px-5 py-3.5 text-[11px] font-semibold text-gray-300">
                      {i + 1}
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-gray-800 max-w-50 truncate">
                      {task.ref_number}
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-gray-800 max-w-50 truncate">
                      {task.client?.business_name}
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-gray-800 max-w-50 truncate">
                      {task.operator?.full_name}
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-gray-800 max-w-50 truncate">
                      {task.drops_count}
                    </td>

                    <td className="px-5 py-3.5 text-[12px] text-gray-400">
                      {new Date(task.created_at).toLocaleDateString("en-NG", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
