import React from "react";

export const StatCard = ({
  label,
  value,
  icon,
  gradient = "linear-gradient(135deg, #16a34a 0%, #15803d 60%, #166534 100%)",
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  gradient?: string;
}) => (
  <div
    style={{
      position: "relative",
      overflow: "hidden",
      borderRadius: 16,
      padding: 20,
      background: gradient,
      minHeight: 120,
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
    }}
  >
    {/* Small icon badge top-left */}
    <div
      style={{
        width: 36,
        height: 36,
        borderRadius: 10,
        background: "rgba(255,255,255,0.18)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 16,
        fontSize: 18,
        color: "#fff",
      }}
    >
      {icon}
    </div>

    {/* Value + label */}
    <div>
      <p
        style={{
          fontSize: 30,
          fontWeight: 700,
          color: "#fff",
          margin: 0,
          lineHeight: 1,
        }}
      >
        {value}
      </p>
      <p
        style={{
          fontSize: 12,
          fontWeight: 500,
          color: "rgba(255,255,255,0.75)",
          margin: "6px 0 0",
          letterSpacing: "0.06em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </p>
    </div>

    {/* Large background icon overlay */}
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        right: -10,
        bottom: -12,
        color: "rgba(255,255,255,0.13)",
        lineHeight: 1,
        pointerEvents: "none",
        userSelect: "none",
      }}
    >
      {React.isValidElement(icon)
        ? React.cloneElement(icon as React.ReactElement<any>, {
            size: 88,
          })
        : icon}
    </div>
  </div>
);
