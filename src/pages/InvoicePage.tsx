import { useEffect, useState } from "react";
import { supabase } from "../constants/supabaseClient";
import { fmt, fmtDate } from "../constants/constants";
import { primaryBtn, inputStyle } from "../components/constants";
import { CreateInvoiceModal } from "../components/modals/CreateInvoiceModal";
import { STATUS_META } from "../constants/constants";
import { InvoiceDetailModal } from "../components/modals/InvoiceDetailModal";
import type { Client, Invoice } from "../components/types/Types";

export const InvoicePage = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<Invoice | null>(null);

  // Filters
  const [searchClient, setSearchClient] = useState("");
  const [filterStatus, setFilterStatus] = useState<Invoice["status"] | "">("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [{ data: invData }, { data: clientData }] = await Promise.all([
        supabase
          .from("invoices")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase.from("clients").select("id, business_name, email"),
      ]);
      setInvoices(invData || []);
      console.log(invData);
      setClients(clientData || []);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const updateStatus = async (
    invoiceId: string,
    newStatus: Invoice["status"],
  ) => {
    try {
      const { error } = await supabase
        .from("invoices")
        .update({ status: newStatus })
        .eq("id", invoiceId);

      if (error) throw error;

      // Update local state immediately — no need to refetch everything
      setInvoices((prev) =>
        prev.map((inv) =>
          inv.id === invoiceId ? { ...inv, status: newStatus } : inv,
        ),
      );

      // Sync the selected invoice if it's open
      setSelected((prev) =>
        prev?.id === invoiceId ? { ...prev, status: newStatus } : prev,
      );
    } catch (err: any) {
      console.error("Failed to update status:", err.message);
    }
  };

  const handleSuccess = () => {
    setShowCreate(false);
    fetchAll();
  };

  const clientMap = Object.fromEntries(clients.map((c) => [c.id, c]));

  const filtered = invoices.filter((inv) => {
    const client = clientMap[inv.client_id];
    const matchClient =
      !searchClient ||
      client?.business_name?.toLowerCase().includes(searchClient.toLowerCase());
    const matchStatus = !filterStatus || inv.status === filterStatus;
    const matchFrom = !dateFrom || inv.issue_date >= dateFrom;
    const matchTo = !dateTo || inv.issue_date <= dateTo;
    return matchClient && matchStatus && matchFrom && matchTo;
  });

  // Summary stats
  const totalRevenue = invoices
    .filter((i) => i.status === "paid")
    .reduce((s, i) => s + i.total, 0);
  const totalPending = invoices
    .filter((i) => i.status === "sent")
    .reduce((s, i) => s + i.total, 0);
  const overdueCount = invoices.filter((i) => i.status === "overdue").length;

  return (
    <div
      style={{
        padding: "32px",
        backgroundColor: "#F8FAFC",
        minHeight: "100vh",
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
      }}
    >
      {/* Page Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "28px",
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: "24px",
              fontWeight: 700,
              color: "#111827",
            }}
          >
            Invoices
          </h1>
          <p style={{ margin: "4px 0 0", color: "#6B7280", fontSize: "14px" }}>
            Manage and track client invoices
          </p>
        </div>
        <button onClick={() => setShowCreate(true)} style={primaryBtn}>
          + New Invoice
        </button>
      </div>

      {/* Stats Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "16px",
          marginBottom: "28px",
        }}
      >
        {[
          {
            label: "Total Invoices",
            value: invoices.length,
            sub: "all time",
            accent: "#3B82F6",
          },
          {
            label: "Revenue Collected",
            value: fmt(totalRevenue),
            sub: "paid invoices",
            accent: "#10B981",
          },
          {
            label: "Pending Payment",
            value: fmt(totalPending),
            sub: "sent invoices",
            accent: "#F59E0B",
          },
          {
            label: "Overdue",
            value: overdueCount,
            sub: `invoice${overdueCount !== 1 ? "s" : ""}`,
            accent: "#EF4444",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            style={{
              background: "#fff",
              borderRadius: "12px",
              padding: "20px",
              border: "1px solid #E5E7EB",
              borderLeft: `4px solid ${stat.accent}`,
            }}
          >
            <div
              style={{
                fontSize: "12px",
                color: "#9CA3AF",
                fontWeight: 600,
                letterSpacing: "0.5px",
                textTransform: "uppercase",
              }}
            >
              {stat.label}
            </div>
            <div
              style={{
                fontSize: "22px",
                fontWeight: 700,
                color: "#111827",
                marginTop: "6px",
              }}
            >
              {stat.value}
            </div>
            <div
              style={{ fontSize: "12px", color: "#9CA3AF", marginTop: "2px" }}
            >
              {stat.sub}
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div
        style={{
          background: "#fff",
          borderRadius: "12px",
          border: "1px solid #E5E7EB",
          padding: "16px 20px",
          marginBottom: "20px",
          display: "flex",
          gap: "12px",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <input
          style={{ ...inputStyle, width: "200px" }}
          placeholder="Search by client…"
          value={searchClient}
          onChange={(e) => setSearchClient(e.target.value)}
        />
        <select
          style={{ ...inputStyle, width: "160px" }}
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as any)}
        >
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="paid">Paid</option>
          <option value="overdue">Overdue</option>
        </select>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "13px", color: "#6B7280" }}>From</span>
          <input
            type="date"
            style={{ ...inputStyle, width: "150px" }}
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
          <span style={{ fontSize: "13px", color: "#6B7280" }}>To</span>
          <input
            type="date"
            style={{ ...inputStyle, width: "150px" }}
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>
        {(searchClient || filterStatus || dateFrom || dateTo) && (
          <button
            onClick={() => {
              setSearchClient("");
              setFilterStatus("");
              setDateFrom("");
              setDateTo("");
            }}
            style={{
              fontSize: "13px",
              color: "#6B7280",
              background: "none",
              border: "none",
              cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      <div
        style={{
          background: "#fff",
          borderRadius: "12px",
          border: "1px solid #E5E7EB",
          overflow: "hidden",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr
              style={{
                backgroundColor: "#F9FAFB",
                borderBottom: "1px solid #E5E7EB",
              }}
            >
              {[
                "Invoice #",
                "Client",
                "Issue Date",
                "Due Date",
                "Amount",
                "Status",
                "",
              ].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: "12px 16px",
                    textAlign: "left",
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "#6B7280",
                    letterSpacing: "0.3px",
                  }}
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
                  colSpan={7}
                  style={{
                    padding: "48px",
                    textAlign: "center",
                    color: "#9CA3AF",
                    fontSize: "14px",
                  }}
                >
                  Loading invoices…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  style={{
                    padding: "48px",
                    textAlign: "center",
                    color: "#9CA3AF",
                    fontSize: "14px",
                  }}
                >
                  No invoices found.
                </td>
              </tr>
            ) : (
              filtered.map((inv, i) => {
                const client = clientMap[inv.client_id];
                const sm = STATUS_META[inv.status];
                return (
                  <tr
                    key={inv.id}
                    style={{
                      borderBottom:
                        i < filtered.length - 1 ? "1px solid #F3F4F6" : "none",
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = "#FAFAFA")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                  >
                    <td
                      style={{
                        padding: "14px 16px",
                        fontSize: "13px",
                        fontWeight: 600,
                        color: "#1E3A5F",
                      }}
                    >
                      #{inv.invoice_number}
                    </td>
                    <td
                      style={{
                        padding: "14px 16px",
                        fontSize: "13px",
                        color: "#374151",
                      }}
                    >
                      {client?.business_name ?? "—"}
                    </td>
                    <td
                      style={{
                        padding: "14px 16px",
                        fontSize: "13px",
                        color: "#6B7280",
                      }}
                    >
                      {fmtDate(inv.issue_date)}
                    </td>
                    <td
                      style={{
                        padding: "14px 16px",
                        fontSize: "13px",
                        color: "#6B7280",
                      }}
                    >
                      {fmtDate(inv.due_date)}
                    </td>
                    <td
                      style={{
                        padding: "14px 16px",
                        fontSize: "13px",
                        fontWeight: 600,
                        color: "#111827",
                      }}
                    >
                      {fmt(inv.total)}
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <span
                        style={{
                          fontSize: "12px",
                          padding: "3px 10px",
                          borderRadius: "20px",
                          background: sm.bg,
                          color: sm.color,
                          fontWeight: 600,
                        }}
                      >
                        {sm.label}
                      </span>
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      <button
                        onClick={() => setSelected(inv)}
                        style={{
                          fontSize: "13px",
                          color: "#3B82F6",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          fontWeight: 500,
                        }}
                      >
                        View →
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Table Footer */}
        {filtered.length > 0 && (
          <div
            style={{
              padding: "12px 16px",
              borderTop: "1px solid #F3F4F6",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: "13px", color: "#9CA3AF" }}>
              Showing {filtered.length} of {invoices.length} invoices
            </span>
            <span
              style={{ fontSize: "13px", fontWeight: 600, color: "#111827" }}
            >
              Filtered total: {fmt(filtered.reduce((s, i) => s + i.total, 0))}
            </span>
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreate && (
        <CreateInvoiceModal
          clients={clients}
          onClose={() => setShowCreate(false)}
          onSuccess={handleSuccess}
        />
      )}
      {selected && (
        <InvoiceDetailModal
          invoice={selected}
          client={clientMap[selected.client_id]}
          onClose={() => setSelected(null)}
          onStatusChange={updateStatus}
        />
      )}
    </div>
  );
};
