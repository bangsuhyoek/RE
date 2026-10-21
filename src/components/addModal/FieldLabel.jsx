import React from "react";

export const FieldLabel = React.memo(function FieldLabel({
  children,
  required = false,
}) {
  return (
    <label className="mb-1.5 block text-[13px] font-semibold text-[#252A28]">
      {children}
      {required && (
        <span className="ml-0.5 text-[#B42318]">
          *
        </span>
      )}
    </label>
  );
});
