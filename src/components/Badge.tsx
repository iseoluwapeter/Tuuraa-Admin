// import React from "react";
import { STATUS_COLORS } from "../constants/constants";

export const Badge = ({
  value,
  map,
}: {
  value: string;
  map: typeof STATUS_COLORS;
}) => {
  const style = map[value?.toLowerCase()] ?? {
    bg: "bg-gray-100",
    text: "text-gray-600",
  };
  return (
    <span
      className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${style.bg} ${style.text}`}
    >
      {value ?? "—"}
    </span>
  );
};
