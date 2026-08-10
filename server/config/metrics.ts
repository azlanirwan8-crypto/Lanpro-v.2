import * as promClient from "prom-client";

export const register = new promClient.Registry();
promClient.collectDefaultMetrics({ register });

export const httpRequestsTotal = new promClient.Counter({
  name: "lanpro_http_requests_total",
  help: "Total HTTP requests received",
  labelNames: ["method", "route", "status"],
});

export const socketActiveConnections = new promClient.Gauge({
  name: "lanpro_socket_active_connections",
  help: "Jumlah koneksi socket yang aktif saat ini",
});

export const optimisticLockingConflicts = new promClient.Counter({
  name: "lanpro_optimistic_locking_conflicts_total",
  help: "Total kegagalan update karena versi data tidak cocok (status 409)",
});

register.registerMetric(httpRequestsTotal);
register.registerMetric(socketActiveConnections);
register.registerMetric(optimisticLockingConflicts);
