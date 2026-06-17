import { 
  type User, type InsertUser, 
  type Category, type InsertCategory,
  type Document, type InsertDocument,
  type OrgNode, type InsertOrgNode,
  type Notification,
  users, categories, documents, orgNodes, notifications, auditLogs
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, inArray } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUsers(): Promise<User[]>;
  getUsersByOffice(officeId: string): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User>;
  updateUserRole(id: string, role: string): Promise<User>;

  // Category methods
  getCategories(officeId?: string): Promise<Category[]>;
  getCategory(id: string): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: string, updates: Partial<Category>): Promise<Category>;
  deleteCategory(id: string): Promise<void>;

  // Document methods
  getDocuments(): Promise<Document[]>;
  getDocument(id: string): Promise<Document | undefined>;
  createDocument(doc: InsertDocument & { trackingNo: string, createdAt: string, createdBy: string, history: any, isAccepted?: number, status?: string, currentStageIndex?: number, officeId?: string }): Promise<Document>;
  updateDocument(id: string, updates: Partial<Document>): Promise<Document>;
  acceptDocument(id: string): Promise<Document>;
  deleteDocument(id: string): Promise<void>;

  // Org Chart methods
  getOrgNodes(): Promise<OrgNode[]>;
  createOrgNode(node: InsertOrgNode): Promise<OrgNode>;
  updateOrgNode(id: string, updates: Partial<OrgNode>): Promise<OrgNode>;
  deleteOrgNode(id: string): Promise<void>;

  // Notifications
  getNotifications(userId: string): Promise<Notification[]>;
  createNotification(notification: Omit<Notification, "id" | "createdAt" | "isRead">): Promise<Notification>;
  markNotificationsAsRead(userId: string, notificationIds: string[]): Promise<void>;
  deleteNotification(id: string, userId: string): Promise<void>;
  clearNotifications(userId: string): Promise<void>;

  // Audit Log methods
  createAuditLog(log: any): Promise<void>;
  getAuditLogs(documentId: string): Promise<any[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUsers(): Promise<User[]> {
    return await db.select().from(users);
  }
  
  async getUsersByOffice(officeId: string): Promise<User[]> {
    return await db.select().from(users).where(eq(users.officeId, officeId));
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    await db.insert(users).values(insertUser);
    const user = await this.getUserByUsername(insertUser.username);
    if (!user) throw new Error("User creation failed");
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    await db.update(users).set(updates).where(eq(users.id, id));
    const user = await this.getUser(id);
    if (!user) throw new Error("User not found");
    return user;
  }

  async updateUserRole(id: string, role: string): Promise<User> {
    return this.updateUser(id, { role });
  }

  async acceptDocument(id: string): Promise<Document> {
    await db.update(documents).set({ isAccepted: 1 }).where(eq(documents.id, id));
    const doc = await this.getDocument(id);
    if (!doc) throw new Error("Document not found");
    return doc;
  }

  async getCategories(officeId?: string): Promise<Category[]> {
    if (officeId) {
      return await db.select().from(categories).where(eq(categories.officeId, officeId));
    }
    return await db.select().from(categories);
  }

  async getCategory(id: string): Promise<Category | undefined> {
    const [category] = await db.select().from(categories).where(eq(categories.id, id));
    return category;
  }

  async createCategory(insertCategory: InsertCategory): Promise<Category> {
    await db.insert(categories).values(insertCategory);
    const [category] = await db.select().from(categories).where(eq(categories.name, insertCategory.name));
    return category;
  }

  async updateCategory(id: string, updates: Partial<Category>): Promise<Category> {
    await db
      .update(categories)
      .set(updates)
      .where(eq(categories.id, id));
    
    const category = await this.getCategory(id);
    if (!category) throw new Error("Category not found");
    return category;
  }

  async deleteCategory(id: string): Promise<void> {
    await db.delete(categories).where(eq(categories.id, id));
  }

  async getDocuments(): Promise<Document[]> {
    return await db.select().from(documents);
  }

  async getDocument(id: string): Promise<Document | undefined> {
    const [doc] = await db.select().from(documents).where(eq(documents.id, id));
    return doc;
  }

  async createDocument(doc: InsertDocument & { trackingNo: string, createdAt: string, createdBy: string, history: any, officeId?: string, status?: string, currentStageIndex?: number }): Promise<Document> {
    await db.insert(documents).values({
      ...doc,
      currentStageIndex: doc.currentStageIndex ?? 0,
      status: doc.status ?? "active",
      currentStageStartedAt: new Date().toISOString(),
      delayNotificationCount: 0,
    });
    const [newDoc] = await db.select().from(documents).where(eq(documents.trackingNo, doc.trackingNo));
    return newDoc;
  }

  async updateDocument(id: string, updates: Partial<Document>): Promise<Document> {
    await db
      .update(documents)
      .set(updates)
      .where(eq(documents.id, id));
    
    const doc = await this.getDocument(id);
    if (!doc) throw new Error("Document not found");
    return doc;
  }

  async deleteDocument(id: string): Promise<void> {
    await db.delete(documents).where(eq(documents.id, id));
  }

  async getOrgNodes(): Promise<OrgNode[]> {
    return await db.select().from(orgNodes);
  }

  async createOrgNode(node: InsertOrgNode): Promise<OrgNode> {
    await db.insert(orgNodes).values(node);
    const [newNode] = await db.select().from(orgNodes).where(eq(orgNodes.name, node.name));
    return newNode;
  }

  async updateOrgNode(id: string, updates: Partial<OrgNode>): Promise<OrgNode> {
    await db.update(orgNodes).set(updates).where(eq(orgNodes.id, id));
    const [node] = await db.select().from(orgNodes).where(eq(orgNodes.id, id));
    if (!node) throw new Error("Node not found");
    return node;
  }

  async deleteOrgNode(id: string): Promise<void> {
    await db.delete(orgNodes).where(eq(orgNodes.id, id));
  }

  // Notifications
  async getNotifications(userId: string): Promise<Notification[]> {
    return await db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt));
  }

  async createNotification(notification: Omit<Notification, "id" | "createdAt" | "isRead">): Promise<Notification> {
    const newNotif = {
      ...notification,
      createdAt: new Date().toISOString(),
    };
    await db.insert(notifications).values(newNotif as any);
    const result = await db.select().from(notifications).where(and(
      eq(notifications.userId, notification.userId),
      eq(notifications.documentId, notification.documentId),
      eq(notifications.message, notification.message)
    )).orderBy(desc(notifications.createdAt)).limit(1);
    return result[0];
  }

  async markNotificationsAsRead(userId: string, notificationIds: string[]): Promise<void> {
    await db.update(notifications).set({ isRead: 1 }).where(and(
      eq(notifications.userId, userId),
      inArray(notifications.id, notificationIds)
    ));
  }

  async deleteNotification(id: string, userId: string): Promise<void> {
    await db.delete(notifications).where(and(
      eq(notifications.id, id),
      eq(notifications.userId, userId)
    ));
  }

  async clearNotifications(userId: string): Promise<void> {
    await db.delete(notifications).where(eq(notifications.userId, userId));
  }

  // Audit
  async createAuditLog(log: any): Promise<void> {
    await db.insert(auditLogs).values({
      ...log,
      createdAt: new Date().toISOString(),
    });
  }

  async getAuditLogs(documentId: string): Promise<any[]> {
    return await db.select().from(auditLogs).where(eq(auditLogs.documentId, documentId)).orderBy(desc(auditLogs.createdAt));
  }
}

export const storage = new DatabaseStorage();
