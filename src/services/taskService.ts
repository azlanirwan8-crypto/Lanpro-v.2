import { apiRequest } from "../lib/api";
import { Task } from "../types";

export const taskService = {
  updateTaskField: async (projectId: string, taskId: string, field: string, value: any) => {
    let updateData: any = {};
    if (field === "dates") {
      updateData = {
        startDate: value.startDate,
        endDate: value.endDate,
      };
    } else if (field === "assigneeId") {
      const isEmail = typeof value === 'string' && value.includes("@");
      if (isEmail) {
        updateData = {
          assigneeId: null,
          assigneeEmail: value,
        };
      } else {
        updateData = {
          assigneeId: value || null,
          assigneeEmail: null,
        };
      }
    } else {
      updateData = {
        [field]: value,
      };
    }

    const data = await apiRequest(`/api/projects/${projectId}/tasks/${taskId}`, {
      method: "PUT",
      body: updateData
    });

    if (data.status !== "success") throw new Error(data.message || "Failed to update task");

    return data;
  },
  
  // Add other task-related methods here as we extract them from App.tsx
};
