import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      refetchOnWindowFocus: true,
      retry: 1,
    },
  },
});

async function compressImageFile(file: File, maxWidth = 1600, quality = 0.8): Promise<File | Blob> {
  if (!file.type.startsWith("image/")) return file;
  try {
    // Decode image
    const imgBitmap = await createImageBitmap(file as Blob);
    try {
      const ratio = imgBitmap.width / imgBitmap.height;
      let targetWidth = imgBitmap.width;
      let targetHeight = imgBitmap.height;
      if (imgBitmap.width > maxWidth) {
        targetWidth = maxWidth;
        targetHeight = Math.round(maxWidth / ratio);
      }

      const canvas = document.createElement("canvas");
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return file;
      ctx.drawImage(imgBitmap, 0, 0, targetWidth, targetHeight);

      return await new Promise((resolve) => {
        canvas.toBlob((blob) => {
          if (!blob) return resolve(file);
          const outFile = new File([blob], file.name.replace(/\.[^/.]+$/, ".jpg"), { type: blob.type });
          resolve(outFile);
        }, "image/jpeg", quality);
      });
    } finally {
      if ((imgBitmap as any).close) try { (imgBitmap as any).close(); } catch {};
    }
  } catch (e) {
    console.error("Image compression failed:", e);
    return file;
  }
}

export type UserRole = "user" | "admin" | "superuser";

export type User = {
  id: string;
  username: string;
  role: UserRole;
  fullName: string;
  position?: string;
  officeId?: string;
};

export type CategoryStage = {
  name: string;
  location?: string;
  slaHours?: number;
};

export type Category = {
  id: string;
  name: string;
  description: string;
  stages: CategoryStage[];
  createdBy?: string; // User ID who created the category (optional)
  officeId?: string; // Office/Division ID (optional)
};

export type DocumentHistory = {
  stage: string;
  timestamp: string;
  note?: string;
  userId?: string;
};

export type Document = {
  id: string;
  trackingNo: string;
  title: string;
  subject: string;
  categoryId: string;
  targetDate: string;
  createdAt: string;
  currentStageStartedAt?: string; // ISO String
  delayNotificationCount?: number;
  createdBy: string; // userId
  officeId?: string; // Division ID
  currentStageIndex: number;
  history: DocumentHistory[];
  status: "active" | "completed" | "archived" | "draft";
  isAccepted?: number; // 0 for false, 1 for true
  attachmentUrl?: string | null; // Optional URL/path to attached file
};

export type OrgNode = {
  id: string;
  name: string;
  parentId?: string;
  userId?: string;
};

// Mock Auth State
let currentUser: User | null = JSON.parse(localStorage.getItem("doc_track_user") || "null");

export type Notification = {
  id: string;
  userId: string;
  documentId: string;
  message: string;
  isRead: number;
  createdAt: string;
};

export type AuditLog = {
  id: string;
  documentId: string;
  userId?: string;
  action: string;
  details?: any;
  createdAt: string;
};

// Helper to ensure nested JSON fields (like history or stages) returned as string by some DB drivers are parsed
function parseJsonFields<T>(data: T): T {
  if (!data) return data;
  if (Array.isArray(data)) {
    return data.map(item => parseJsonFields(item)) as unknown as T;
  }
  if (typeof data === 'object') {
    const obj = data as any;
    if (typeof obj.history === 'string') {
      try { obj.history = JSON.parse(obj.history); } catch (e) {}
    }
    if (typeof obj.stages === 'string') {
      try { obj.stages = JSON.parse(obj.stages); } catch (e) {}
    }
    if (typeof obj.details === 'string') {
      try { obj.details = JSON.parse(obj.details); } catch (e) {}
    }
  }
  return data;
}

// Intercept fetch responses to parse JSON fields automatically
const originalFetch = window.fetch;
window.fetch = async (...args) => {
  const res = await originalFetch(...args);
  if (res.headers.get('content-type')?.includes('application/json')) {
     const clone = res.clone();
     res.json = async () => {
       const data = await clone.json();
       return parseJsonFields(data);
     };
  }
  return res;
};

export const api = {
  getCurrentUser: () => currentUser,
  
  login: async (username: string, password?: string): Promise<User> => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) throw new Error(await res.text());
    const user = await res.json();
    currentUser = user;
    localStorage.setItem("doc_track_user", JSON.stringify(user));
    return user;
  },

  logout: () => {
    currentUser = null;
    localStorage.removeItem("doc_track_user");
  },

  register: async (data: { username: string, fullName: string, password?: string, position?: string, officeId?: string }): Promise<User> => {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    const user = await res.json();
    currentUser = user;
    localStorage.setItem("doc_track_user", JSON.stringify(user));
    return user;
  },

  getUsers: async (): Promise<User[]> => {
    const res = await fetch("/api/users");
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  getUser: async (id: string): Promise<User | undefined> => {
    const res = await fetch(`/api/users/${id}`);
    if (!res.ok) {
      if (res.status === 404) return undefined;
      throw new Error(await res.text());
    }
    return res.json();
  },

  updateUserRole: async (id: string, role: UserRole): Promise<User> => {
    const res = await fetch(`/api/users/${id}/role`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  updateUser: async (id: string, updates: Partial<User & { password?: string }>): Promise<User> => {
    const res = await fetch(`/api/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error(await res.text());
    const user = await res.json();
    if (id === currentUser?.id) {
      currentUser = user;
      localStorage.setItem("doc_track_user", JSON.stringify(user));
    }
    return user;
  },

  getCategories: async (fetchAll?: boolean): Promise<Category[]> => {
    const url = currentUser && !fetchAll ? `/api/categories?userId=${currentUser.id}` : "/api/categories";
    const res = await fetch(url);
    return res.json();
  },

  createCategory: async (category: Omit<Category, "id">): Promise<Category> => {
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...category, userId: currentUser?.id }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  updateCategory: async (id: string, updates: Partial<Category>): Promise<Category> => {
    const res = await fetch(`/api/categories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...updates, userId: currentUser?.id }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  deleteCategory: async (id: string): Promise<void> => {
    const url = currentUser ? `/api/categories/${id}?userId=${currentUser.id}` : `/api/categories/${id}`;
    await fetch(url, { method: "DELETE" });
  },

  getDocuments: async (): Promise<Document[]> => {
    const res = await fetch("/api/documents");
    return res.json();
  },

  getDocument: async (id: string): Promise<Document | undefined> => {
    const res = await fetch(`/api/documents/${id}`);
    if (!res.ok) return undefined;
    return res.json();
  },

  createDocument: async (doc: Omit<Document, "id" | "trackingNo" | "createdAt" | "currentStageIndex" | "history" | "status" | "createdBy">): Promise<Document> => {
    const res = await fetch("/api/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...doc, createdBy: currentUser?.id }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  updateDocument: async (id: string, updates: Partial<Document>): Promise<Document> => {
    const res = await fetch(`/api/documents/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  deleteDocument: async (id: string): Promise<void> => {
    await fetch(`/api/documents/${id}`, { method: "DELETE" });
  },

  uploadDocumentAttachment: async (id: string, file: File): Promise<Document> => {
    try {
      let uploadFile: File | Blob = file;
      // Try to compress large images client-side to avoid memory/time issues on mobile devices
      if (file.type.startsWith("image/")) {
        uploadFile = await compressImageFile(file);
      }

      const formData = new FormData();
      formData.append("file", uploadFile, (uploadFile as File).name || file.name);
      const res = await fetch(`/api/documents/${id}/attachment`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    } catch (e) {
      console.error("Attachment upload failed, retrying with original file:", e);
      // Fallback: upload original file
      const fallback = new FormData();
      fallback.append("file", file);
      const res = await fetch(`/api/documents/${id}/attachment`, { method: "POST", body: fallback });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    }
  },

  acceptStage: async (id: string): Promise<Document> => {
    const res = await fetch(`/api/documents/${id}/accept`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: currentUser?.id }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  
  advanceStage: async (id: string): Promise<Document> => {
    const res = await fetch(`/api/documents/${id}/advance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: currentUser?.id }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  regressStage: async (id: string): Promise<Document> => {
    const res = await fetch(`/api/documents/${id}/regress`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: currentUser?.id }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  getOrgNodes: async (): Promise<OrgNode[]> => {
    const res = await fetch("/api/org-nodes");
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  createOrgNode: async (node: Omit<OrgNode, "id">): Promise<OrgNode> => {
    const res = await fetch("/api/org-nodes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(node),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  updateOrgNode: async (id: string, updates: Partial<OrgNode>): Promise<OrgNode> => {
    const res = await fetch(`/api/org-nodes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  deleteOrgNode: async (id: string): Promise<void> => {
    await fetch(`/api/org-nodes/${id}`, { method: "DELETE" });
  },
  getNotifications: async (): Promise<Notification[]> => {
    if (!currentUser) return [];
    const res = await fetch(`/api/notifications?userId=${currentUser.id}`);
    if (!res.ok) throw new Error("Failed to fetch notifications");
    return res.json();
  },
  markNotificationsRead: async (notificationIds: string[]): Promise<void> => {
    if (!currentUser) return;
    await fetch("/api/notifications/mark-read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: currentUser.id, notificationIds }),
    });
  },
  deleteNotification: async (id: string): Promise<void> => {
    if (!currentUser) return;
    await fetch(`/api/notifications/${id}?userId=${currentUser.id}`, { method: "DELETE" });
  },
  clearNotifications: async (): Promise<void> => {
    if (!currentUser) return;
    await fetch(`/api/notifications?userId=${currentUser.id}`, { method: "DELETE" });
  },
  getAuditLogs: async (documentId: string): Promise<AuditLog[]> => {
    const res = await fetch(`/api/documents/${documentId}/audit-logs`);
    if (!res.ok) throw new Error("Failed to fetch audit logs");
    return res.json();
  }
};