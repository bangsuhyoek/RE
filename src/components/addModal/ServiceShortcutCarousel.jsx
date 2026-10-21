import React from "react";
import { Check } from "lucide-react";
import { POPULAR_SERVICE_SHORTCUTS } from "../../data/popularServiceShortcuts";
import { ServiceMark } from "../ui";

export const ServiceShortcutCarousel = React.memo(function ServiceShortcutCarousel({
  catalog,
  selectedId,
  onSelect,
}) {
  return (
    <div className="mt-3">
      <p className="mb-2.5 text-[12px] font-semibold text-[#6B7684]">
        자주 쓰는 서비스
      </p>

      <div className="-mx-4 overflow-x-auto px-4 pb-1 no-scrollbar sm:-mx-5 sm:px-5">
        <div className="flex w-max gap-3">
          {POPULAR_SERVICE_SHORTCUTS.map(
            (shortcut) => {
              const catalogService =
                catalog.find(
                  (service) =>
                    service.id === shortcut.id
                ) || shortcut;

              const selected =
                selectedId === shortcut.id;

              return (
                <button
                  key={shortcut.id}
                  type="button"
                  onClick={() =>
                    onSelect(catalogService)
                  }
                  className="group flex w-[66px] shrink-0 flex-col items-center gap-1.5"
                >
                  <span className="relative">
                    <ServiceMark
                      serviceId={shortcut.id}
                      name={shortcut.name}
                      monogram={shortcut.monogram}
                      className={`h-12 w-12 rounded-[14px] transition-all ${
                        selected
                          ? "ring-2 ring-[#153D2E] ring-offset-2"
                          : ""
                      }`}
                    />

                    {selected && (
                      <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-[#153D2E] text-white ring-2 ring-white">
                        <Check
                          size={11}
                          strokeWidth={3}
                        />
                      </span>
                    )}
                  </span>

                  <span
                    className={`max-w-[66px] truncate text-center text-[11px] leading-4 ${
                      selected
                        ? "font-semibold text-[#153D2E]"
                        : "font-medium text-[#6B7684]"
                    }`}
                  >
                    {shortcut.name}
                  </span>
                </button>
              );
            }
          )}
        </div>
      </div>
    </div>
  );
});
