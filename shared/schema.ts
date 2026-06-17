import { sql } from "drizzle-orm";
import { mysqlTable, text, varchar, int, json } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = mysqlTable("users", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  username: varchar("username", { length: 255 }).notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  role: varchar("role", { length: 50 }).notNull(), // "user", "admin", "superuser"
  position: text("position"),
  officeId: varchar("office_id", { length: 36 }), // Foreign key to orgNodes
});

export const categories = mysqlTable("categories", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  name: text("name").notNull(),
  description: text("description").notNull(),
  stages: json("stages").$type<{ name: string; location?: string; slaHours?: number }[]>().notNull(), // Array of { name: string, location?: string, slaHours?: number }
  createdBy: varchar("created_by", { length: 36 }), // User who created the category (nullable for now)
  officeId: varchar("office_id", { length: 36 }), // Reference to orgNode ID
});

export const documents = mysqlTable("documents", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  trackingNo: varchar("tracking_no", { length: 255 }).notNull().unique(),
  title: text("title").notNull(),
  subject: text("subject").notNull(),
  categoryId: varchar("category_id", { length: 36 }).notNull(),
  targetDate: text("target_date").notNull(),
  createdAt: text("created_at").notNull(),
  currentStageStartedAt: text("current_stage_started_at"), // ISO String
  delayNotificationCount: int("delay_notification_count").default(0),
  createdBy: varchar("created_by", { length: 36 }).notNull(),
  currentStageIndex: int("current_stage_index").notNull().default(0),
  history: json("history").$type<{ stage: string; timestamp: string; note?: string; userId?: string }[]>().notNull(), // Array of { stage: string, timestamp: string, note?: string, userId?: string }
  status: varchar("status", { length: 50 }).notNull().default("active"), // "active", "completed", "archived", "draft"
  officeId: varchar("office_id", { length: 36 }), // Reference to orgNode ID (inherited from creator)
  isAccepted: int("is_accepted").notNull().default(1), // 0 for false, 1 for true
  attachmentUrl: text("attachment_url"), // URL/path to the uploaded document or image scan
});

export const auditLogs = mysqlTable("audit_logs", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  documentId: varchar("document_id", { length: 36 }).notNull(),
  userId: varchar("user_id", { length: 36 }),
  action: text("action").notNull(),
  details: json("details"),
  createdAt: text("created_at").notNull(),
});

export const orgNodes = mysqlTable("org_nodes", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  name: text("name").notNull(),
  parentId: varchar("parent_id", { length: 36 }),
  userId: varchar("user_id", { length: 36 }), // Optional link to a user
});

export const notifications = mysqlTable("notifications", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`(UUID())`),
  userId: varchar("user_id", { length: 36 }).notNull(), // User who receives the notification
  documentId: varchar("document_id", { length: 36 }).notNull(),
  message: text("message").notNull(),
  isRead: int("is_read").notNull().default(0), // 0 for false, 1 for true
  createdAt: text("created_at").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  fullName: true,
  role: true,
  position: true,
  officeId: true,
});

export const registerUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  fullName: true,
  position: true,
  officeId: true,
});

export const insertOrgNodeSchema = createInsertSchema(orgNodes).pick({
  name: true,
  parentId: true,
  userId: true,
});

export const insertCategorySchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  officeId: z.string().optional(),
  createdBy: z.string().optional(),
  stages: z.array(z.object({
    name: z.string(),
    location: z.string().optional(),
    slaHours: z.number().optional(),
  })),
});

export const insertDocumentSchema = z.object({
  title: z.string().min(1),
  subject: z.string().min(1),
  categoryId: z.string(),
  targetDate: z.string(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type RegisterUser = z.infer<typeof registerUserSchema>;
export type User = typeof users.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Document = typeof documents.$inferSelect;
export type OrgNode = typeof orgNodes.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type InsertOrgNode = z.infer<typeof insertOrgNodeSchema>;
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
