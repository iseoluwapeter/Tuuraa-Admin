import React from "react";

export const DetailRow = ({
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
