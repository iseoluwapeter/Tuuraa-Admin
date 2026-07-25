import { modalBox, primaryBtn, overlay } from "../constants";
import type { Invoice, Client } from "../types/Types";
import { useRef } from "react";
import { STATUS_META } from "../../constants/constants";
import { InvoiceTemplate } from "../InvoiceTemplate";
import { useState } from "react";

export const InvoiceDetailModal = ({
  invoice,
  client,
  onClose,
  onStatusChange,
}: {
  invoice: Invoice;
  client?: Client;
  onClose: () => void;
  onStatusChange: (
    invoiceId: string,
    newStatus: Invoice["status"],
  ) => Promise<void>;
}) => {
  const [updating, setUpdating] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const handleStatusChange = async (
    e: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    setUpdating(true);
    await onStatusChange(invoice.id, e.target.value as Invoice["status"]);
    setUpdating(false);
  };

  const handlePrint = () => {
    if (!printRef.current) return;

    const iframe = document.createElement("iframe");
    iframe.style.position = "absolute";
    iframe.style.top = "-10000px";

    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    doc.open();
    doc.write(`
    <html>
      <head>
        <title>Invoice ${invoice.invoice_number}</title>
        <style>
          body { font-family: Arial; padding: 20px; }
        </style>
      </head>
      <body>
        ${printRef.current.innerHTML}
      </body>
    </html>
  `);
    doc.close();

    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();

    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 1000);
  };

  return (
    <div style={overlay}>
      <div
        style={{
          ...modalBox,
          maxWidth: "860px",
          maxHeight: "92vh",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            padding: "20px 28px",
            borderBottom: "1px solid #E5E7EB",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexShrink: 0,
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 700 }}>
              Invoice #{invoice.invoice_number}
            </h2>
            <select
              value={invoice.status}
              onChange={handleStatusChange}
              disabled={updating}
              style={{
                fontSize: "12px",
                padding: "3px 10px",
                borderRadius: "20px",
                background: STATUS_META[invoice.status].bg,
                color: STATUS_META[invoice.status].color,
                fontWeight: 600,
                border: `1px solid ${STATUS_META[invoice.status].color}`,
                cursor: "pointer",
                appearance: "none",
                paddingRight: "24px",
              }}
            >
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
            </select>
            {updating && (
              <span
                style={{
                  fontSize: "12px",
                  color: "#9CA3AF",
                  marginLeft: "8px",
                }}
              >
                Saving…
              </span>
            )}
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={handlePrint} style={primaryBtn}>
              ⬇ Download PDF
            </button>
            <button
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                fontSize: "20px",
                cursor: "pointer",
                color: "#9CA3AF",
              }}
            >
              ✕
            </button>
          </div>
        </div>
        <div style={{ overflowY: "auto", flex: 1 }} ref={printRef}>
          <InvoiceTemplate invoice={invoice} client={client} />
        </div>
      </div>
    </div>
  );
};
