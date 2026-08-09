import { Meeting, DiscussionPoint, MasterData } from '../types';
import { apiRequest } from '../lib/api';

const getHeaders = (userId?: string) => {
  const h: any = {};
  if (userId) h["x-user-id"] = userId;
  return h;
};

export const createMeeting = async (projectId: string, title: string, authorId?: string, payload?: Partial<Meeting>, userId?: string) => {
  try {
    const data = await apiRequest(`/api/projects/${projectId}/meetings`, {
      method: "POST",
      headers: getHeaders(userId || authorId),
      body: { ...payload, title, authorId }
    });
    if (data.status === "success") {
      return data.data.id;
    }
    throw new Error(data.message || "Failed to create meeting");
  } catch (error) {
    console.error("createMeeting service error:", error);
    throw error;
  }
};

export const getMeetings = async (projectId: string, userId?: string) => {
  try {
    const data = await apiRequest(`/api/projects/${projectId}/meetings`, {
      headers: getHeaders(userId)
    });
    return data.status === "success" ? data.data : [];
  } catch (error) {
    console.error("getMeetings service error:", error);
    throw error;
  }
};

export const createDiscussionPoint = async (projectId: string, meetingId: string, point: Omit<DiscussionPoint, 'id' | 'meetingId' | 'createdAt'>, userId?: string) => {
  try {
    const data = await apiRequest(`/api/projects/${projectId}/meetings/${meetingId}/discussionPoints`, {
      method: "POST",
      headers: getHeaders(userId || point.authorId),
      body: point
    });
    if (data.status === "success") {
      return data.data.id;
    }
    throw new Error(data.message || "Failed to create discussion point");
  } catch (error) {
    console.error("createDiscussionPoint service error:", error);
    throw error;
  }
};

export const getDiscussionPoints = async (projectId: string, meetingId: string, userId?: string) => {
  try {
    const data = await apiRequest(`/api/projects/${projectId}/meetings/${meetingId}/discussionPoints`, {
      headers: getHeaders(userId)
    });
    return data.status === "success" ? data.data : [];
  } catch (error) {
    console.error("getDiscussionPoints service error:", error);
    throw error;
  }
};

export const updateDiscussionPoint = async (projectId: string, meetingId: string, pointId: string, updates: Partial<DiscussionPoint>, userId?: string) => {
  try {
    const data = await apiRequest(`/api/projects/${projectId}/meetings/${meetingId}/discussionPoints/${pointId}`, {
      method: "PUT",
      headers: getHeaders(userId),
      body: updates
    });
    if (data && data.status !== "success") {
      throw new Error(data.message || "Failed to update discussion point");
    }
    return data;
  } catch (error) {
    console.error("updateDiscussionPoint service error:", error);
    throw error;
  }
};

export const getMasterData = async (type: MasterData['type'], userId?: string) => {
  try {
    const data = await apiRequest("/api/master-data", {
      headers: getHeaders(userId)
    });
    if (data.status === "success" && Array.isArray(data.data)) {
      return data.data.filter((item: any) => item.type === type);
    }
    return [];
  } catch (error) {
    console.error("getMasterData error:", error);
    throw error;
  }
};

export const deleteDiscussionPoint = async (projectId: string, meetingId: string, pointId: string, userId?: string) => {
  try {
    const data = await apiRequest(`/api/projects/${projectId}/meetings/${meetingId}/discussionPoints/${pointId}`, {
      method: "DELETE",
      headers: getHeaders(userId)
    });
    if (data && data.status !== "success") {
      throw new Error(data.message || "Failed to delete discussion point");
    }
    return data;
  } catch (error) {
    console.error("deleteDiscussionPoint service error:", error);
    throw error;
  }
};

export const getDiscussionPointComments = async (pointId: string, userId?: string) => {
  try {
    const data = await apiRequest(`/api/discussion-points/${pointId}/comments`, {
      headers: getHeaders(userId)
    });
    return data.status === "success" ? data.data : [];
  } catch (error) {
    console.error("getDiscussionPointComments error:", error);
    return [];
  }
};

export const createDiscussionPointComment = async (
  pointId: string,
  payload: { userId?: string; userName?: string; commentText: string },
  userId?: string
) => {
  try {
    const data = await apiRequest(`/api/discussion-points/${pointId}/comments`, {
      method: "POST",
      headers: getHeaders(userId),
      body: payload
    });
    if (data && data.status !== "success") {
      throw new Error(data.message || "Failed to create comment");
    }
    return data.data;
  } catch (error) {
    console.error("createDiscussionPointComment error:", error);
    throw error;
  }
};

export const getUsers = async (userId?: string) => {
  try {
    const data = await apiRequest("/api/users", {
      headers: getHeaders(userId)
    });
    return data.status === "success" ? data.data : [];
  } catch (error) {
    console.error("getUsers service error:", error);
    throw error;
  }
};

export const updateMeeting = async (projectId: string, meetingId: string, updates: Partial<Meeting>, userId?: string) => {
  try {
    const data = await apiRequest(`/api/projects/${projectId}/meetings/${meetingId}`, {
      method: "PUT",
      headers: getHeaders(userId),
      body: updates
    });
    if (data && data.status !== "success") {
      throw new Error(data.message || "Failed to update meeting");
    }
    return data;
  } catch (error) {
    console.error("updateMeeting service error:", error);
    throw error;
  }
};

export const deleteMeeting = async (projectId: string, meetingId: string, userId?: string) => {
  try {
    const data = await apiRequest(`/api/projects/${projectId}/meetings/${meetingId}`, {
      method: "DELETE",
      headers: getHeaders(userId)
    });
    if (data && data.status !== "success") {
      throw new Error(data.message || "Failed to delete meeting");
    }
    return data;
  } catch (error) {
    console.error("deleteMeeting service error:", error);
    throw error;
  }
};
