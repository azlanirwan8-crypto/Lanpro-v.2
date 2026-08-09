import React, { useEffect, useState } from "react";
import { ShieldAlert, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface ActiveLimitItem {
  backoff: number;
  retriesLeft: number;
}

export function RateLimitIndicator() {
  const [activeLimits, setActiveLimits] = useState<Record<string, ActiveLimitItem>>({});

  useEffect(() => {
    const handleStatus = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { active, url, backoff, retriesLeft } = customEvent.detail || {};
      
      if (active && url) {
        setActiveLimits((prev) => ({
          ...prev,
          [url]: { backoff, retriesLeft }
        }));
      } else if (url) {
        setActiveLimits((prev) => {
          const next = { ...prev };
          delete next[url];
          return next;
        });
      }
    };

    window.addEventListener("rate_limit_status", handleStatus);
    return () => {
      window.removeEventListener("rate_limit_status", handleStatus);
    };
  }, []);

  const limitUrls = Object.keys(activeLimits);
  if (limitUrls.length === 0) return null;

  // Grab the maximum active backoff item
  const maxLimit = limitUrls.reduce((max, url) => {
    const item = activeLimits[url];
    if (!max || item.backoff > max.backoff) {
      return { url, ...item };
    }
    return max;
  }, null as (ActiveLimitItem & { url: string }) | null);

  if (!maxLimit) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -24, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -24, scale: 0.95 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="fixed top-6 left-1/2 -translate-x-1/2 z-[10000] max-w-sm w-full px-4"
        id="rate-limit-global-indicator"
      >
        <div className="bg-amber-600 dark:bg-amber-700 text-white shadow-2xl rounded-2xl p-4 flex items-center gap-3.5 border border-amber-500/30 backdrop-blur-md bg-opacity-95 dark:bg-opacity-95 font-sans">
          <div className="p-2 bg-white/10 rounded-xl animate-pulse">
            <ShieldAlert className="w-5 h-5 text-amber-100" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-black uppercase tracking-wider text-amber-50">
              Antrean Server (Rate Limit)
            </h4>
            <p className="text-[11px] text-amber-100/90 leading-tight mt-0.5 font-medium">
              Koneksi tertunda, mencoba kembali dalam <span className="font-bold underline">{(maxLimit.backoff / 1000).toFixed(1)}s</span>...
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-black uppercase tracking-wider bg-white/15 px-2 py-1 rounded-lg border border-white/5 whitespace-nowrap">
              Sisa: {maxLimit.retriesLeft}x
            </span>
            <Loader2 className="w-4 h-4 animate-spin text-white/80 shrink-0" />
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
