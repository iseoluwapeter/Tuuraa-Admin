import {
  labelStyle,
  modalBox,
  outlineBtn,
  primaryBtn,
  overlay,
  addItemBtn,
  inputStyle,
} from "../constants";
import { useState } from "react";
import { useRef } from "react";
import { useAuthStore } from "../../store/authStore";
import { supabase } from "../../constants/supabaseClient";
import { fmt } from "../../constants/constants";
import { InvoiceTemplate } from "../InvoiceTemplate";
import type { ClientSummary, InvoiceItem, Invoice } from "../types/Types";

const newItem = (): InvoiceItem => ({
  id: crypto.randomUUID(),
  description: "",
  quantity: 1,
  unit_price: 0,
});

const INITIAL_FORM = {
  client_id: "",
  issue_date: new Date().toISOString().split("T")[0],
  due_date: "",
  tax_rate: 0,
  notes: "",
  status: "draft" as Invoice["status"],
  items: [newItem()],
};

export const CreateInvoiceModal = ({
  clients,
  onClose,
  onSuccess,
}: {
  clients: ClientSummary[];
  onClose: () => void;
  onSuccess: () => void;
}) => {
  const [form, setForm] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const user = useAuthStore((s) => s.user);

  const selectedClient = clients.find((c) => c.id === form.client_id);

  const subtotal = form.items.reduce(
    (s, i) => s + i.quantity * i.unit_price,
    0,
  );
  const tax = subtotal * (form.tax_rate / 100);
  const total = subtotal + tax;

  const updateItem = (
    id: string,
    field: keyof InvoiceItem,
    value: string | number,
  ) =>
    setForm((f) => ({
      ...f,
      items: f.items.map((item) =>
        item.id === id ? { ...item, [field]: value } : item,
      ),
    }));

  const addItem = () =>
    setForm((f) => ({ ...f, items: [...f.items, newItem()] }));
  const removeItem = (id: string) =>
    setForm((f) => ({ ...f, items: f.items.filter((i) => i.id !== id) }));

  const handlePrint = () => {
    if (!printRef.current) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html><head><title>Invoice</title>
      <style>@media print { body { margin: 0; } }</style>
      </head><body>${printRef.current.innerHTML}</body></html>
    `);
    win.document.close();
    win.focus();
    win.print();
    win.close();
  };

  const handleSubmit = async (saveStatus: Invoice["status"] = "draft") => {
    setError(null);

    if (!form.client_id) {
      setError("Please select a client.");
      return;
    }
    if (!form.due_date) {
      setError("Due date is required.");
      return;
    }
    if (form.items.some((i) => !i.description.trim())) {
      setError("All line items must have a description.");
      return;
    }

    setSubmitting(true);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke(
        "send-invoice",
        {
          body: {
            client_id: form.client_id,
            issue_date: form.issue_date,
            due_date: form.due_date,
            tax_rate: form.tax_rate,
            notes: form.notes,
            status: saveStatus,
            items: form.items,
            created_by: user?.id,
          },
        },
      );

      if (fnErr) throw fnErr;

      // Warn user if invoice saved but email failed (HTTP 207)
      if (data?.warning) {
        setError(`Invoice saved. Note: ${data.warning}`);
        // Still treat as success — invoice exists in DB
        setTimeout(() => onSuccess(), 2000);
        return;
      }

      onSuccess();
    } catch (err: any) {
      setError(err?.message ?? "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <div style={overlay}>
      <div
        style={{
          ...modalBox,
          maxWidth: "780px",
          maxHeight: "92vh",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: "24px 28px 20px",
            borderBottom: "1px solid #E5E7EB",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexShrink: 0,
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: "18px",
                fontWeight: 700,
                color: "#111827",
              }}
            >
              New Invoice
            </h2>
            <p
              style={{ margin: "2px 0 0", fontSize: "13px", color: "#6B7280" }}
            >
              Fill in the details below to generate an invoice
            </p>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={() => setPreview((p) => !p)} style={outlineBtn}>
              {preview ? "← Edit" : "Preview"}
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

        {/* Scrollable Body */}
        <div style={{ overflowY: "auto", flex: 1, padding: "24px 28px" }}>
          {error && (
            <div
              style={{
                background: "#FEF2F2",
                border: "1px solid #FECACA",
                borderRadius: "8px",
                padding: "10px 14px",
                marginBottom: "16px",
                color: "#DC2626",
                fontSize: "13px",
              }}
            >
              {error}
            </div>
          )}

          {preview ? (
            <div ref={printRef}>
              <InvoiceTemplate
                invoice={{ ...form, invoice_number: "PREVIEW" }}
                client={selectedClient}
              />
            </div>
          ) : (
            <>
              {/* Meta fields */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "16px",
                  marginBottom: "24px",
                }}
              >
                <div>
                  <label style={labelStyle}>Client *</label>
                  <select
                    style={inputStyle}
                    value={form.client_id}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, client_id: e.target.value }))
                    }
                  >
                    <option value="">Select client</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.business_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Status</label>
                  <select
                    style={inputStyle}
                    value={form.status}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        status: e.target.value as Invoice["status"],
                      }))
                    }
                  >
                    <option value="draft">Draft</option>
                    <option value="sent">Sent</option>
                    <option value="paid">Paid</option>
                    <option value="overdue">Overdue</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Issue Date *</label>
                  <input
                    type="date"
                    style={inputStyle}
                    value={form.issue_date}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, issue_date: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label style={labelStyle}>Due Date *</label>
                  <input
                    type="date"
                    style={inputStyle}
                    value={form.due_date}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, due_date: e.target.value }))
                    }
                  />
                </div>
              </div>

              {/* Line Items */}
              <div style={{ marginBottom: "24px" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "12px",
                  }}
                >
                  <label style={{ ...labelStyle, margin: 0 }}>Line Items</label>
                  <button onClick={addItem} style={addItemBtn}>
                    + Add Item
                  </button>
                </div>

                {/* Table header */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 80px 130px 130px 36px",
                    gap: "8px",
                    marginBottom: "6px",
                    padding: "0 4px",
                  }}
                >
                  {["Description", "Qty", "Unit Price", "Amount", ""].map(
                    (h) => (
                      <span
                        key={h}
                        style={{
                          fontSize: "11px",
                          fontWeight: 600,
                          color: "#9CA3AF",
                          letterSpacing: "0.5px",
                          textTransform: "uppercase",
                        }}
                      >
                        {h}
                      </span>
                    ),
                  )}
                </div>

                {form.items.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 80px 130px 130px 36px",
                      gap: "8px",
                      marginBottom: "8px",
                      alignItems: "center",
                    }}
                  >
                    <input
                      style={inputStyle}
                      placeholder="Service description"
                      value={item.description}
                      onChange={(e) =>
                        updateItem(item.id, "description", e.target.value)
                      }
                    />
                    <input
                      type="number"
                      min={1}
                      style={inputStyle}
                      value={item.quantity}
                      onChange={(e) =>
                        updateItem(item.id, "quantity", Number(e.target.value))
                      }
                    />
                    <input
                      type="number"
                      min={0}
                      style={inputStyle}
                      placeholder="0.00"
                      value={item.unit_price}
                      onChange={(e) =>
                        updateItem(
                          item.id,
                          "unit_price",
                          Number(e.target.value),
                        )
                      }
                    />
                    <div
                      style={{
                        ...inputStyle,
                        background: "#F9FAFB",
                        color: "#374151",
                        fontWeight: 500,
                      }}
                    >
                      {fmt(item.quantity * item.unit_price)}
                    </div>
                    <button
                      onClick={() => removeItem(item.id)}
                      disabled={form.items.length === 1}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "#EF4444",
                        fontSize: "16px",
                        padding: "4px",
                        opacity: form.items.length === 1 ? 0.3 : 1,
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))}

                {/* Totals summary */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    marginTop: "16px",
                  }}
                >
                  <div
                    style={{
                      width: "260px",
                      background: "#F9FAFB",
                      borderRadius: "10px",
                      padding: "14px 18px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: "13px",
                        marginBottom: "6px",
                      }}
                    >
                      <span style={{ color: "#6B7280" }}>Subtotal</span>
                      <span>{fmt(subtotal)}</span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        fontSize: "13px",
                        marginBottom: "6px",
                      }}
                    >
                      <span style={{ color: "#6B7280" }}>Tax (%)</span>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        style={{
                          ...inputStyle,
                          width: "70px",
                          textAlign: "right",
                          padding: "4px 8px",
                        }}
                        value={form.tax_rate}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            tax_rate: Number(e.target.value),
                          }))
                        }
                      />
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: "15px",
                        fontWeight: 700,
                        borderTop: "1px solid #E5E7EB",
                        paddingTop: "10px",
                        marginTop: "6px",
                      }}
                    >
                      <span>Total</span>
                      <span style={{ color: "#1E3A5F" }}>{fmt(total)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label style={labelStyle}>Notes (optional)</label>
                <textarea
                  style={{ ...inputStyle, height: "72px", resize: "vertical" }}
                  placeholder="Payment terms, bank details, or any additional information…"
                  value={form.notes}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, notes: e.target.value }))
                  }
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "16px 28px",
            borderTop: "1px solid #E5E7EB",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexShrink: 0,
          }}
        >
          {preview ? (
            <button onClick={handlePrint} style={primaryBtn}>
              ⬇ Download / Print PDF
            </button>
          ) : (
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={onClose}
                style={outlineBtn}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                onClick={() => handleSubmit("draft")}
                style={outlineBtn}
                disabled={submitting}
              >
                Save as Draft
              </button>
              <button
                onClick={() => handleSubmit("sent")}
                style={primaryBtn}
                disabled={submitting}
              >
                {submitting ? "Saving…" : "Save & Send"}
              </button>
            </div>
          )}
          {preview && (
            <button onClick={() => setPreview(false)} style={outlineBtn}>
              ← Back to Edit
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
