import { useState, useEffect } from "react";
import { apiRequest } from "../lib/api";
import { MasterData } from "../types";
import { useAppStore } from "../store/useAppStore";

export const useMasterData = (isLoggedIn: boolean, userId?: string) => {
  const { setMasterData } = useAppStore();
  const [newTaskStatus, setNewTaskStatus] = useState<string>("");
  const [newTaskPriority, setNewTaskPriority] = useState<string>("");

  const fetchMasterData = async () => {
    try {
      const data = await apiRequest("/api/master-data");
      if (data.status === "success") {
        const result = data.data as MasterData[];
        const uniqueData = Array.from(
          new Map(result.map((m) => [`${m.type}-${m.label}`, m])).values(),
        );
        setMasterData(uniqueData);

        if (uniqueData.length > 0) {
          const statuses = uniqueData.filter((d) => d.type === "status");
          const priorities = uniqueData.filter((d) => d.type === "priority");
          if (statuses.length > 0 && !newTaskStatus) {
            setNewTaskStatus(statuses[0].label);
          }
          if (priorities.length > 0 && !newTaskPriority) {
            setNewTaskPriority(priorities[0].label);
          }
        }
      }
    } catch (error: any) {
      const msg = error?.message || String(error);
      if (msg.includes("Sesi Anda telah berakhir") || msg.includes("Sesi berakhir") || msg.includes("token tidak valid") || msg.includes("Failed to fetch") || msg.includes("fetch")) {
        console.warn("fetchMasterData: Sesi pengguna berakhir atau tidak valid.");
      } else {
        console.error("fetchMasterData error", error);
      }
    }
  };

  useEffect(() => {
    if (!isLoggedIn) return;
    fetchMasterData();
  }, [userId, isLoggedIn]);

  return { fetchMasterData, newTaskStatus, setNewTaskStatus, newTaskPriority, setNewTaskPriority };
};
