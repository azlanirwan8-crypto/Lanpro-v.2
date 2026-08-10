import * as promClient from "prom-client";

export const register = new promClient.Registry();
register.clear();
promClient.collectDefaultMetrics({ register });

export const httpRequestsTotal = new promClient.Counter({
  name: "lanpro_http_requests_total",
  help: "Total HTTP requests received",
  labelNames: ["method", "route", "status"],
  registers: [register],
});

export const socketActiveConnections = new promClient.Gauge({
  name: "lanpro_socket_active_connections",
  help: "Jumlah koneksi socket yang aktif saat ini",
  registers: [register],
});

export const optimisticLockingConflicts = new promClient.Counter({
  name: "lanpro_optimistic_locking_conflicts_total",
  help: "Total kegagalan update karena versi data tidak cocok (status 409)",
  registers: [register],
});
