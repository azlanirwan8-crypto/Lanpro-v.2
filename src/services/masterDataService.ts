import { apiRequest } from "../lib/api";
import { toast } from "sonner";

export const masterDataService = {
  restore: async () => {
    const statuses = [
      { type: "status", label: "Backlog", color: "#6B7280", order: 0 },
      { type: "status", label: "To Do", color: "#3B82F6", order: 1 },
      { type: "status", label: "In Progress", color: "#F59E0B", order: 2 },
      { type: "status", label: "Code Review", color: "#8B5CF6", order: 3 },
      { type: "status", label: "UAT", color: "#EC4899", order: 4 },
      { type: "status", label: "Done", color: "#10B981", order: 5 },
    ];
    const priorities = [
      {
        type: "priority",
        label: "P0 - Blocker",
        color: "#EF4444",
        icon: "ChevronsUp",
        order: 0,
      },
      {
        type: "priority",
        label: "P1 - Critical",
        color: "#F97316",
        icon: "ChevronUp",
        order: 1,
      },
      {
        type: "priority",
        label: "P2 - Major",
        color: "#EAB308",
        icon: "Equal",
        order: 2,
      },
      {
        type: "priority",
        label: "P3 - Minor",
        color: "#22C55E",
        icon: "ChevronDown",
        order: 3,
      },
    ];
    const categories = [
      { type: "category", label: "Security", color: "#000000", order: 0 },
      { type: "category", label: "Backend API", color: "#2563EB", order: 1 },
      { type: "category", label: "Frontend UI", color: "#DB2777", order: 2 },
      { type: "category", label: "Testing", color: "#059669", order: 3 },
    ];

    const releases = [
      { type: "release", label: "v1.0", color: "#3b82f6", order: 0 },
    ];
    const issueTypes = [
      {
        type: "issue_type",
        label: "Task",
        color: "#3b82f6",
        icon: "CheckCircle2",
        order: 0,
      },
      {
        type: "issue_type",
        label: "Epic",
        color: "#9333ea",
        icon: "Zap",
        order: 1,
      },
      {
        type: "issue_type",
        label: "Bug",
        color: "#ef4444",
        icon: "Bug",
        order: 2,
      },
    ];
    const fitness = [
      { type: "fitur", label: "Feature A", order: 0 },
      { type: "fitur", label: "Feature B", order: 1 },
    ];
    const systems = [
      { type: "system", label: "System X", order: 0 },
      { type: "system", label: "System Y", order: 1 },
    ];
    const surroundings = [
      { type: "surrounding", label: "Environment 1", order: 0 },
      { type: "surrounding", label: "Environment 2", order: 1 },
    ];

    try {
      const allItems = [
        ...statuses,
        ...priorities,
        ...categories,
        ...releases,
        ...issueTypes,
        ...fitness,
        ...systems,
        ...surroundings,
      ];
      for (const item of allItems) {
        await apiRequest('/api/master-data', {
          method: 'POST',
          body: item
        });
      }
      toast.success("Master data restored successfully!");
    } catch (e) {
      console.error("Restore failed", e);
      toast.error("Failed to restore master data");
    }
  }
};
