import { fmt, fmtDate } from "../constants/constants";

type InvoiceItem = {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
};

type Client = {
  id: string;
  full_name: string;
  email?: string;
  address?: string;
};

type Invoice = {
  id: string;
  invoice_number: string;
  client_id: string;
  client?: Client;
  issue_date: string;
  due_date: string;
  status: "draft" | "sent" | "paid" | "overdue";
  items: InvoiceItem[];
  notes?: string;
  subtotal: number;
  tax_rate: number;
  total: number;
  created_by: string;
  created_at: string;
};

export const InvoiceTemplate = ({
  invoice,
  client,
}: {
  invoice: Partial<Invoice> & { items: InvoiceItem[] };
  client?: Client;
}) => {
  const subtotal = invoice.items.reduce(
    (s, i) => s + i.quantity * i.unit_price,
    0,
  );
  const tax = subtotal * ((invoice.tax_rate ?? 0) / 100);
  const total = subtotal + tax;

  return (
    <div
      style={{
        fontFamily: "'Georgia', serif",
        color: "#111827",
        backgroundColor: "#fff",
        padding: "60px",
        maxWidth: "800px",
        margin: "0 auto",
        fontSize: "14px",
        lineHeight: 1.6,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "48px",
        }}
      >
        <div>
          <div
            style={{
              fontSize: "28px",
              fontWeight: 700,
              letterSpacing: "-0.5px",
              color: "#1E3A5F",
            }}
          >
            TURA
          </div>
          <div
            style={{
              fontSize: "11px",
              color: "#6B7280",
              marginTop: "2px",
              letterSpacing: "2px",
            }}
          >
            LOGISTICS LIMITED
          </div>
          <div
            style={{
              marginTop: "16px",
              fontSize: "12px",
              color: "#6B7280",
              lineHeight: 1.8,
            }}
          >
            Lagos, Nigeria
            <br />
            hello@tura.ng
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div
            style={{
              fontSize: "32px",
              fontWeight: 700,
              color: "#1E3A5F",
              letterSpacing: "-1px",
            }}
          >
            INVOICE
          </div>
          <div style={{ marginTop: "8px", fontSize: "13px", color: "#6B7280" }}>
            <strong style={{ color: "#111" }}>
              #{invoice.invoice_number ?? "—"}
            </strong>
          </div>
          <div style={{ marginTop: "4px", fontSize: "12px", color: "#6B7280" }}>
            Issued: {invoice.issue_date ? fmtDate(invoice.issue_date) : "—"}
            <br />
            Due: {invoice.due_date ? fmtDate(invoice.due_date) : "—"}
          </div>
        </div>
      </div>

      {/* Divider */}
      <div style={{ borderTop: "2px solid #1E3A5F", marginBottom: "32px" }} />

      {/* Bill To */}
      <div style={{ marginBottom: "40px" }}>
        <div
          style={{
            fontSize: "10px",
            letterSpacing: "2px",
            color: "#9CA3AF",
            marginBottom: "8px",
          }}
        >
          BILL TO
        </div>
        <div style={{ fontSize: "16px", fontWeight: 600 }}>
          {client?.full_name ?? "—"}
        </div>
        {client?.email && (
          <div style={{ fontSize: "12px", color: "#6B7280" }}>
            {client.email}
          </div>
        )}
        {client?.address && (
          <div style={{ fontSize: "12px", color: "#6B7280" }}>
            {client.address}
          </div>
        )}
      </div>

      {/* Items Table */}
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          marginBottom: "32px",
        }}
      >
        <thead>
          <tr style={{ backgroundColor: "#1E3A5F", color: "#fff" }}>
            <th
              style={{
                padding: "10px 12px",
                textAlign: "left",
                fontSize: "11px",
                letterSpacing: "1px",
              }}
            >
              DESCRIPTION
            </th>
            <th
              style={{
                padding: "10px 12px",
                textAlign: "right",
                fontSize: "11px",
                letterSpacing: "1px",
              }}
            >
              QTY
            </th>
            <th
              style={{
                padding: "10px 12px",
                textAlign: "right",
                fontSize: "11px",
                letterSpacing: "1px",
              }}
            >
              UNIT PRICE
            </th>
            <th
              style={{
                padding: "10px 12px",
                textAlign: "right",
                fontSize: "11px",
                letterSpacing: "1px",
              }}
            >
              AMOUNT
            </th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.map((item, i) => (
            <tr
              key={item.id}
              style={{ backgroundColor: i % 2 === 0 ? "#F9FAFB" : "#fff" }}
            >
              <td style={{ padding: "10px 12px", fontSize: "13px" }}>
                {item.description || "—"}
              </td>
              <td
                style={{
                  padding: "10px 12px",
                  textAlign: "right",
                  fontSize: "13px",
                }}
              >
                {item.quantity}
              </td>
              <td
                style={{
                  padding: "10px 12px",
                  textAlign: "right",
                  fontSize: "13px",
                }}
              >
                {fmt(item.unit_price)}
              </td>
              <td
                style={{
                  padding: "10px 12px",
                  textAlign: "right",
                  fontSize: "13px",
                  fontWeight: 500,
                }}
              >
                {fmt(item.quantity * item.unit_price)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginBottom: "40px",
        }}
      >
        <div style={{ width: "240px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "6px 0",
              fontSize: "13px",
            }}
          >
            <span style={{ color: "#6B7280" }}>Subtotal</span>
            <span>{fmt(subtotal)}</span>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "6px 0",
              fontSize: "13px",
            }}
          >
            <span style={{ color: "#6B7280" }}>
              Tax ({invoice.tax_rate ?? 0}%)
            </span>
            <span>{fmt(tax)}</span>
          </div>
          <div
            style={{
              borderTop: "2px solid #1E3A5F",
              marginTop: "8px",
              paddingTop: "10px",
              display: "flex",
              justifyContent: "space-between",
              fontSize: "16px",
              fontWeight: 700,
            }}
          >
            <span>Total</span>
            <span style={{ color: "#1E3A5F" }}>{fmt(total)}</span>
          </div>
        </div>
      </div>

      {/* Notes */}
      {invoice.notes && (
        <div
          style={{
            borderTop: "1px solid #E5E7EB",
            paddingTop: "24px",
            fontSize: "12px",
            color: "#6B7280",
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: "4px", color: "#111" }}>
            Notes
          </div>
          {invoice.notes}
        </div>
      )}

      {/* Footer */}
      <div
        style={{
          marginTop: "60px",
          borderTop: "1px solid #E5E7EB",
          paddingTop: "16px",
          display: "flex",
          justifyContent: "space-between",
          fontSize: "11px",
          color: "#9CA3AF",
        }}
      >
        <span>Thank you for your business.</span>
        <span>Tura Logistics · Lagos, Nigeria</span>
      </div>
    </div>
  );
};