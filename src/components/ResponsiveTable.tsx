import React from 'react';

/**
 * ResponsiveTable wraps a standard HTML table in a container that provides:
 *  • Horizontal scrolling on overflow (mobile screens)
 *  • Consistent Tailwind classes for a clean Velzon‑styled look
 *
 * Props:
 *  - className: additional Tailwind classes applied to the <table> element.
 *  - children : table head, body, etc.
 */
export const ResponsiveTable: React.FC<{ className?: string; children: React.ReactNode }> = ({
  className = '',
  children,
}) => {
  return (
    <div className="w-full overflow-x-auto">
      <table className={`min-w-full border-collapse text-left ${className}`}>{children}</table>
    </div>
  );
};
