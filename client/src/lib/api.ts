import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

export type Stage = {
  id: string;
  name: string;
  order: number;
};

export type CategoryStage = {
  name: string;
  location?: string;
};

export type Category = {
  id: string;
  name: string;
  description: string;
  stages: CategoryStage[]; // Array of stages with optional location
};

export type DocumentHistory = {
  stage: string;
  timestamp: string; // ISO date
  note?: string;
};

export type Document = {
  id: string;
  title: string;
  subject: string;
  categoryId: string;
  targetDate: string; // ISO date
  createdAt: string; // ISO date
  currentStageIndex: number; // Index in the category's stages array
  history: DocumentHistory[];
  status: "active" | "completed" | "archived";
};

// Initial Data
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
  {
    id: "cat-2",
    name: "HR Onboarding",
    description: "New employee onboarding documents",
    stages: [
      { name: "Pending Details", location: "Recruitment Site" },
      { name: "HR Review", location: "HR Office" },
      { name: "IT Provisioning", location: "IT Lab" },
      { name: "Employee Signature", location: "Employee Portal" },
      { name: "Active", location: "Internal System" }
    ],
  },
  {
    id: "cat-3",
    name: "Legal Contracts",
    description: "NDAs and Service Agreements",
    stages: [
      { name: "Drafting", location: "Legal Dept" },
      { name: "Internal Review", location: "Legal Dept" },
      { name: "External Review", location: "Client Site" },
      { name: "Finalizing", location: "Legal Dept" },
      { name: "Signed", location: "Digital Vault" }
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
    currentStageIndex: 1,
    history: [
      { stage: "Draft", timestamp: new Date(Date.now() - 86400000 * 2).toISOString() },
      { stage: "Manager Review", timestamp: new Date(Date.now() - 86400000 * 1).toISOString() },
    ],
    status: "active",
  },
  {
    id: "doc-2",
    title: "John Doe Contract",
    subject: "Senior Developer Role",
    categoryId: "cat-2",
    targetDate: new Date(Date.now() + 86400000 * 2).toISOString(),
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    currentStageIndex: 2,
    history: [
      { stage: "Pending Details", timestamp: new Date(Date.now() - 86400000 * 5).toISOString() },
      { stage: "HR Review", timestamp: new Date(Date.now() - 86400000 * 3).toISOString() },
      { stage: "IT Provisioning", timestamp: new Date(Date.now() - 86400000 * 1).toISOString() },
    ],
    status: "active",
  },
  {
    id: "doc-3",
    title: "Project Alpha NDA",
    subject: "External partner agreement",
    categoryId: "cat-3",
    targetDate: new Date(Date.now() - 86400000 * 1).toISOString(), // Overdue
    createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
    currentStageIndex: 0,
    history: [
      { stage: "Drafting", timestamp: new Date(Date.now() - 86400000 * 10).toISOString() },
    ],
    status: "active",
  },
];

// Mock API Functions
export const api = {
  getCategories: async (): Promise<Category[]> => {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return [...categories];
  },

  getCategory: async (id: string): Promise<Category | undefined> => {
    await new Promise((resolve) => setTimeout(resolve, 200));
    return categories.find((c) => c.id === id);
  },

  createCategory: async (category: Omit<Category, "id">): Promise<Category> => {
    await new Promise((resolve) => setTimeout(resolve, 400));
    const newCategory = { ...category, id: `cat-${Math.random().toString(36).substr(2, 9)}` };
    categories.push(newCategory);
    return newCategory;
  },

  updateCategory: async (id: string, updates: Partial<Category>): Promise<Category> => {
     await new Promise((resolve) => setTimeout(resolve, 400));
     const index = categories.findIndex((c) => c.id === id);
     if (index === -1) throw new Error("Category not found");
     categories[index] = { ...categories[index], ...updates };
     return categories[index];
  },

  deleteCategory: async (id: string): Promise<void> => {
    await new Promise((resolve) => setTimeout(resolve, 300));
    categories = categories.filter((c) => c.id !== id);
    // Also cleanup documents in that category or mark them orphaned
    documents = documents.filter((d) => d.categoryId !== id);
  },

  getDocuments: async (): Promise<Document[]> => {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return [...documents];
  },

  getDocument: async (id: string): Promise<Document | undefined> => {
    await new Promise((resolve) => setTimeout(resolve, 200));
    return documents.find((d) => d.id === id);
  },

  createDocument: async (doc: Omit<Document, "id" | "createdAt" | "currentStageIndex" | "history" | "status">): Promise<Document> => {
    await new Promise((resolve) => setTimeout(resolve, 400));
    const category = categories.find((c) => c.id === doc.categoryId);
    if (!category) throw new Error("Invalid category");

    const newDoc: Document = {
      ...doc,
      id: `doc-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      currentStageIndex: 0,
      history: [{ stage: category.stages[0].name, timestamp: new Date().toISOString() }],
      status: "active",
    };
    documents.push(newDoc);
    return newDoc;
  },

  updateDocument: async (id: string, updates: Partial<Document>): Promise<Document> => {
    await new Promise((resolve) => setTimeout(resolve, 300));
    const index = documents.findIndex((d) => d.id === id);
    if (index === -1) throw new Error("Document not found");
    documents[index] = { ...documents[index], ...updates };
    return documents[index];
  },

  deleteDocument: async (id: string): Promise<void> => {
    await new Promise((resolve) => setTimeout(resolve, 300));
    documents = documents.filter((d) => d.id !== id);
  },

  advanceStage: async (id: string): Promise<Document> => {
    await new Promise((resolve) => setTimeout(resolve, 400));
    const index = documents.findIndex((d) => d.id === id);
    if (index === -1) throw new Error("Document not found");

    const doc = documents[index];
    const category = categories.find((c) => c.id === doc.categoryId);
    if (!category) throw new Error("Category not found");

    if (doc.currentStageIndex >= category.stages.length - 1) {
      // Already at end, maybe mark complete?
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
        { stage: nextStageName, timestamp: new Date().toISOString() },
      ],
      status: nextStageIndex === category.stages.length - 1 ? "completed" as const : "active" as const
    };
    
    documents[index] = updatedDoc;
    return updatedDoc;
  },

  regressStage: async (id: string): Promise<Document> => {
    await new Promise((resolve) => setTimeout(resolve, 400));
    const index = documents.findIndex((d) => d.id === id);
    if (index === -1) throw new Error("Document not found");

    const doc = documents[index];
    const category = categories.find((c) => c.id === doc.categoryId);
    if (!category) throw new Error("Category not found");
    
    if (doc.currentStageIndex <= 0) return doc; // Can't regress beyond start

    const prevStageIndex = doc.currentStageIndex - 1;
    const prevStageName = category.stages[prevStageIndex].name;
    
    const updatedDoc = {
      ...doc,
      currentStageIndex: prevStageIndex,
      history: [
        ...doc.history,
        { stage: prevStageName, timestamp: new Date().toISOString(), note: "Regressed to previous stage" },
      ],
      status: "active" as const // If it was completed, it's active again
    };
    
    documents[index] = updatedDoc;
    return updatedDoc;
  }
};
