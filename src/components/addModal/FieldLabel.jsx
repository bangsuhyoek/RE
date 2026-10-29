import React from "react";

export const FieldLabel = React.memo(function FieldLabel({
  children,
  required = false,
}) {
  return (
    <label className="mb-1.5 block text-[14px] font-medium text-ink-tertiary">
      {children}
      {required && (
        <span className="ml-0.5 text-danger">
          *
        </span>
      )}
    </label>
  );
});

