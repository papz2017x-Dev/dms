import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

export type UserRole = "user" | "admin" | "superuser";

export type User = {
  id: string;
  username: string;
  role: UserRole;
  fullName: string;
};

export type CategoryStage = {
  name: string;
  location?: string;
};

export type Category = {
  id: string;
  name: string;
  description: string;
  stages: CategoryStage[];
};

export type DocumentHistory = {
  stage: string;
  timestamp: string;
  note?: string;
  userId?: string;
};

export type Document = {
  id: string;
  title: string;
  subject: string;
  categoryId: string;
  targetDate: string;
  createdAt: string;
  createdBy: string; // userId
  currentStageIndex: number;
  history: DocumentHistory[];
  status: "active" | "completed" | "archived";
};

// Mock Auth State
let currentUser: User | null = JSON.parse(localStorage.getItem("doc_track_user") || "null");

let users: User[] = [
  { id: "u-1", username: "user", role: "user", fullName: "Regular User" },
  { id: "u-2", username: "admin", role: "admin", fullName: "Admin User" },
  { id: "u-3", username: "superuser", role: "superuser", fullName: "Super User" },
];

let categories: Category[] = [
  {
    id: "cat-1",
    name: "Procurement",
    description: "Purchase orders and vendor contracts",
    stages: [
      { name: "Draft", location: "Procurement Office" },
      { name: "Manager Review", location: "Management Hub" },
      { name: "Finance Approval", location: "Finance Dept" },
      { name: "Vendor Signed", location: "External" },
      { name: "Completed", location: "Archive" }
    ],
  },
];

let documents: Document[] = [
  {
    id: "doc-1",
    title: "Q1 Office Supplies",
    subject: "Bulk order for pens and paper",
    categoryId: "cat-1",
    targetDate: new Date(Date.now() + 86400000 * 5).toISOString(),
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    createdBy: "u-1",
    currentStageIndex: 1,
    history: [
      { stage: "Draft", timestamp: new Date(Date.now() - 86400000 * 2).toISOString(), userId: "u-1" },
      { stage: "Manager Review", timestamp: new Date(Date.now() - 86400000 * 1).toISOString(), userId: "u-2" },
    ],
    status: "active",
  },
];

export const api = {
  getCurrentUser: () => currentUser,
  
  login: async (username: string): Promise<User> => {
    await new Promise(r => setTimeout(r, 500));
    const user = users.find(u => u.username === username);
    if (!user) throw new Error("User not found. Try 'user', 'admin', or 'superuser'");
    currentUser = user;
    localStorage.setItem("doc_track_user", JSON.stringify(user));
    return user;
  },

  logout: () => {
    currentUser = null;
    localStorage.removeItem("doc_track_user");
  },

  register: async (data: { username: string, fullName: string, role: UserRole }): Promise<User> => {
    await new Promise(r => setTimeout(r, 500));
    const newUser = { ...data, id: `u-${Math.random().toString(36).substr(2, 9)}` };
    users.push(newUser);
    currentUser = newUser;
    localStorage.setItem("doc_track_user", JSON.stringify(newUser));
    return newUser;
  },

  getCategories: async (): Promise<Category[]> => {
    return [...categories];
  },

  getDocuments: async (): Promise<Document[]> => {
    if (!currentUser) return [];
    if (currentUser.role === "superuser") return [...documents];
    // Users and Admins can see documents they created OR all documents? 
    // Requirement: "user can only view the progress, create new document, edit his document and delete his own created document"
    // Usually means they can see all but only edit theirs.
    return [...documents];
  },

  getDocument: async (id: string): Promise<Document | undefined> => {
    return documents.find((d) => d.id === id);
  },

  createDocument: async (doc: Omit<Document, "id" | "createdAt" | "currentStageIndex" | "history" | "status" | "createdBy">): Promise<Document> => {
    if (!currentUser) throw new Error("Unauthorized");
    const category = categories.find((c) => c.id === doc.categoryId);
    if (!category) throw new Error("Invalid category");

    const newDoc: Document = {
      ...doc,
      id: `doc-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      createdBy: currentUser.id,
      currentStageIndex: 0,
      history: [{ stage: category.stages[0].name, timestamp: new Date().toISOString(), userId: currentUser.id }],
      status: "active",
    };
    documents.push(newDoc);
    return newDoc;
  },

  updateDocument: async (id: string, updates: Partial<Document>): Promise<Document> => {
    const index = documents.findIndex((d) => d.id === id);
    if (index === -1) throw new Error("Document not found");
    
    // Authorization check
    if (currentUser?.role !== "superuser" && documents[index].createdBy !== currentUser?.id) {
       throw new Error("You can only edit your own documents");
    }

    documents[index] = { ...documents[index], ...updates };
    return documents[index];
  },

  deleteDocument: async (id: string): Promise<void> => {
    const doc = documents.find(d => d.id === id);
    if (!doc) return;

    if (currentUser?.role !== "superuser" && doc.createdBy !== currentUser?.id) {
       throw new Error("You can only delete your own documents");
    }

    documents = documents.filter((d) => d.id !== id);
  },

  advanceStage: async (id: string): Promise<Document> => {
    if (currentUser?.role === "user") throw new Error("Users cannot advance stages");
    
    const index = documents.findIndex((d) => d.id === id);
    if (index === -1) throw new Error("Document not found");

    const doc = documents[index];
    const category = categories.find((c) => c.id === doc.categoryId);
    if (!category) throw new Error("Category not found");

    if (doc.currentStageIndex >= category.stages.length - 1) {
      const updatedDoc = { ...doc, status: "completed" as const };
      documents[index] = updatedDoc;
      return updatedDoc;
    }

    const nextStageIndex = doc.currentStageIndex + 1;
    const nextStageName = category.stages[nextStageIndex].name;
    
    const updatedDoc = {
      ...doc,
      currentStageIndex: nextStageIndex,
      history: [
        ...doc.history,
        { stage: nextStageName, timestamp: new Date().toISOString(), userId: currentUser?.id },
      ],
      status: nextStageIndex === category.stages.length - 1 ? "completed" as const : "active" as const
    };
    
    documents[index] = updatedDoc;
    return updatedDoc;
  },

  regressStage: async (id: string): Promise<Document> => {
    if (currentUser?.role === "user") throw new Error("Users cannot regress stages");

    const index = documents.findIndex((d) => d.id === id);
    if (index === -1) throw new Error("Document not found");

    const doc = documents[index];
    const category = categories.find((c) => c.id === doc.categoryId);
    if (!category) throw new Error("Category not found");
    
    if (doc.currentStageIndex <= 0) return doc;

    const prevStageIndex = doc.currentStageIndex - 1;
    const prevStageName = category.stages[prevStageIndex].name;
    
    const updatedDoc = {
      ...doc,
      currentStageIndex: prevStageIndex,
      history: [
        ...doc.history,
        { stage: prevStageName, timestamp: new Date().toISOString(), note: "Regressed", userId: currentUser?.id },
      ],
      status: "active" as const
    };
    
    documents[index] = updatedDoc;
    return updatedDoc;
  }
};