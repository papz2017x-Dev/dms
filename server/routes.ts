import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertCategorySchema, insertDocumentSchema, insertUserSchema, insertOrgNodeSchema, registerUserSchema, notifications, users } from "@shared/schema";
import { eq, desc, and, inArray } from "drizzle-orm";
import multer from "multer";
import path from "path";
import fs from "fs";

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer storage
const storageCfg = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
  },
});
const upload = multer({ storage: storageCfg });

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Helper to notify all users of a specific office name
  const notifyStageUsers = async (docId: string, docTitle: string, officeName: string, message: string) => {
    try {
      const nodes = await storage.getOrgNodes();
      const node = nodes.find(n => n.name.toLowerCase() === officeName.toLowerCase());
      if (node) {
        const users = await storage.getUsersByOffice(node.id);
        for (const user of users) {
          await storage.createNotification({
            userId: user.id,
            documentId: docId,
            message: message
          });
        }
      }
    } catch (error) {
      console.error(`Failed to notify users for stage ${officeName}:`, error);
    }
  };
  // Authentication
  app.post("/api/auth/register", async (req, res) => {
    const parsed = registerUserSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error);
    const existing = await storage.getUserByUsername(parsed.data.username);
    if (existing) return res.status(400).json({ message: "Username already exists" });
    
    // Default role to "user" and handle optional fields
    const userData = {
      ...parsed.data,
      role: "user", // Default role
      position: parsed.data.position || null,
      officeId: parsed.data.officeId || null,
    };

    const user = await storage.createUser(userData as any);
    res.status(201).json(user);
  });

  app.post("/api/auth/login", async (req, res) => {
    const { username, password } = req.body;
    const user = await storage.getUserByUsername(username);
    if (!user) return res.status(401).json({ message: "Invalid username" });
    if (user.password !== password) return res.status(401).json({ message: "Invalid password" });
    res.json(user);
  });

  // Users Management (Superuser)
  app.get("/api/users", async (_req, res) => {
    const users = await storage.getUsers();
    res.json(users);
  });

  app.get("/api/users/:id", async (req, res) => {
    const user = await storage.getUser(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  });

  app.patch("/api/users/:id", async (req, res) => {
    try {
      const user = await storage.updateUser(req.params.id, req.body);
      res.json(user);
    } catch (e) {
      res.status(404).json({ message: "User not found" });
    }
  });

  app.patch("/api/users/:id/role", async (req, res) => {
    const { role } = req.body;
    if (!role) return res.status(400).json({ message: "Role is required" });
    try {
      const user = await storage.updateUserRole(req.params.id, role);
      res.json(user);
    } catch (e) {
      res.status(404).json({ message: "User not found" });
    }
  });

  // Categories
  app.get("/api/categories", async (req, res) => {
    const { userId } = req.query;
    if (!userId) {
      const categories = await storage.getCategories();
      return res.json(categories);
    }

    const user = await storage.getUser(userId as string);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.role === "admin") {
      const categories = await storage.getCategories(user.officeId || undefined);
      return res.json(categories);
    }

    const allCategories = await storage.getCategories();
    res.json(allCategories);
  });

  app.post("/api/categories", async (req, res) => {
    const { userId, ...categoryData } = req.body;
    const parsed = insertCategorySchema.safeParse(categoryData);
    if (!parsed.success) return res.status(400).json(parsed.error);

    let officeId = parsed.data.officeId;
    if (userId) {
      const user = await storage.getUser(userId);
      if (user?.role === "admin") {
        officeId = user.officeId || undefined;
      }
    }

    const category = await storage.createCategory({
      ...parsed.data,
      officeId,
      createdBy: userId,
    });
    res.status(201).json(category);
  });

  app.patch("/api/categories/:id", async (req, res) => {
    const { userId, ...updates } = req.body;
    try {
      const category = await storage.getCategory(req.params.id);
      if (!category) return res.status(404).json({ message: "Category not found" });

      if (userId) {
        const user = await storage.getUser(userId);
        if (user) {
          // SuperAdmins cannot edit division-owned categories
          if (user.role === "superuser" && category.officeId) {
            return res.status(403).json({ message: "Super Admins cannot modify division-owned workflows." });
          }
          // Admins can only edit their own
          if (user.role === "admin" && user.officeId !== category.officeId) {
            return res.status(403).json({ message: "Unauthorized to modify this category" });
          }
        }
      }

      const updated = await storage.updateCategory(req.params.id, updates);
      res.json(updated);
    } catch (e) {
      res.status(500).json({ message: "Update failed" });
    }
  });

  app.delete("/api/categories/:id", async (req, res) => {
    const { userId } = req.query;
    try {
      const category = await storage.getCategory(req.params.id);
      if (!category) return res.status(404).json({ message: "Category not found" });

      if (userId) {
        const user = await storage.getUser(userId as string);
        if (user) {
          if (user.role === "superuser" && category.officeId) {
            return res.status(403).json({ message: "Super Admins cannot delete division-owned workflows." });
          }
          if (user.role === "admin" && user.officeId !== category.officeId) {
            return res.status(403).json({ message: "Unauthorized to delete this category" });
          }
        }
      }

      await storage.deleteCategory(req.params.id);
      res.status(204).end();
    } catch (e) {
      res.status(500).json({ message: "Deletion failed" });
    }
  });

  // Documents
  app.get("/api/documents", async (_req, res) => {
    const documents = await storage.getDocuments();
    res.json(documents);
  });

  app.get("/api/documents/:id", async (req, res) => {
    const doc = await storage.getDocument(req.params.id);
    if (!doc) return res.status(404).json({ message: "Document not found" });

    // Check SLA and Send Alerts if needed
    const category = await storage.getCategory(doc.categoryId);
    if (category && doc.status === "active" && doc.currentStageStartedAt) {
      const currentStage = category.stages[doc.currentStageIndex];
      if (currentStage.slaHours) {
        const startTime = new Date(doc.currentStageStartedAt).getTime();
        const now = Date.now();
        const hoursSpent = (now - startTime) / (1000 * 60 * 60);

        if (hoursSpent > currentStage.slaHours && (doc.delayNotificationCount || 0) < 3) {
          // Trigger alert
          await storage.createNotification({
            userId: doc.createdBy,
            documentId: doc.id,
            message: `URGENT: Document "${doc.title}" has exceeded its SLA in "${currentStage.name}". (Alert ${(doc.delayNotificationCount || 0) + 1}/3)`,
          });
          await storage.updateDocument(doc.id, {
            delayNotificationCount: (doc.delayNotificationCount || 0) + 1
          });
        }
      }
    }

    res.json(doc);
  });

  app.get("/api/documents/:id/audit-logs", async (req, res) => {
    const logs = await storage.getAuditLogs(req.params.id);
    res.json(logs);
  });

  app.post("/api/documents", async (req, res) => {
    const parsed = insertDocumentSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error);
    
    const { createdBy } = req.body; // In real app, get from session
    const category = await storage.getCategory(parsed.data.categoryId);
    if (!category) return res.status(400).json({ message: "Invalid category" });

    const year = new Date().getFullYear();
    const random = Math.floor(1000 + Math.random() * 9000);
    const trackingNo = `TRK-${year}-${random}`;

    const user = createdBy ? await storage.getUser(createdBy) : null;
    const officeId = user?.officeId || undefined;

    const doc = await storage.createDocument({
      ...parsed.data,
      trackingNo,
      createdAt: new Date().toISOString(),
      createdBy: createdBy || "anonymous",
      officeId,
      status: "draft",
      currentStageIndex: 0, // Points to the first real stage but won't activate until submitted
      history: [{ stage: "Draft Prepared", timestamp: new Date().toISOString(), userId: createdBy }],
    });

    await storage.createAuditLog({
      documentId: doc.id,
      userId: createdBy,
      action: "Document Drafted",
      details: { title: doc.title, trackingNo: doc.trackingNo }
    });

    res.status(201).json(doc);
  });

  app.patch("/api/documents/:id", async (req, res) => {
    try {
      const doc = await storage.updateDocument(req.params.id, req.body);
      res.json(doc);
    } catch (e) {
      res.status(404).json({ message: "Document not found" });
    }
  });

  app.post("/api/documents/:id/advance", async (req, res) => {
    const { id } = req.params;
    const { userId } = req.body; // User performing the action

    try {
      const doc = await storage.getDocument(id);
      if (!doc) return res.status(404).json({ message: "Document not found" });
      const category = await storage.getCategory(doc.categoryId);
      if (!category) return res.status(400).json({ message: "Category not found" });

      const updates: any = {};
      let notificationMessage = "";
      
      if (doc.status === "draft") {
        updates.status = "active";
        updates.currentStageIndex = 0; // Officially enters Stage 0
        updates.currentStageStartedAt = new Date().toISOString();
        updates.isAccepted = 0; // Stage 0 must accept it
        updates.history = [
          ...doc.history,
          { stage: category.stages[0].name, timestamp: new Date().toISOString(), userId, note: "Document formally submitted." }
        ];
        notificationMessage = `Action Required: Document "${doc.title}" has been forwarded to your office. Please accept it.`;
        
        await storage.createAuditLog({
          documentId: doc.id, userId, action: "Formally Submitted",
          details: { stage: category.stages[0].name }
        });
      } else if (doc.currentStageIndex >= category.stages.length - 1) {
        updates.status = "completed";
        notificationMessage = `Document "${doc.title}" has been completed.`;
        
        updates.history = [
          ...doc.history,
          { stage: "Completed", timestamp: new Date().toISOString(), userId, note: req.body.note }
        ];

        await storage.createAuditLog({
          documentId: doc.id, userId, action: "Document Completed",
          details: { note: req.body.note }
        });
        
        await storage.createNotification({
          userId: doc.createdBy,
          documentId: doc.id,
          message: notificationMessage
        });
      } else {
        const nextIndex = doc.currentStageIndex + 1;
        updates.currentStageIndex = nextIndex;
        updates.history = [
          ...doc.history,
          { stage: category.stages[nextIndex].name, timestamp: new Date().toISOString(), userId, note: req.body.note }
        ];
        notificationMessage = `Document moved to ${category.stages[nextIndex].name}.`;
      }

      const updatedDoc = await storage.updateDocument(id, {
        ...updates,
        currentStageStartedAt: new Date().toISOString(),
        delayNotificationCount: 0,
        isAccepted: 0, // Must be accepted by the new stage
      });

      // Audit Log
      await storage.createAuditLog({
        documentId: id,
        userId: userId,
        action: "Advanced Stage",
        details: { from: doc.currentStageIndex, to: updates.currentStageIndex || doc.currentStageIndex, stage: category.stages[updates.currentStageIndex || doc.currentStageIndex].name }
      });

      // Notify the new stage office
      const nextIndex = updates.currentStageIndex;
      if (nextIndex !== undefined && nextIndex < category.stages.length) {
        const stage = category.stages[nextIndex];
        if (stage.location) {
          await notifyStageUsers(
            id,
            doc.title,
            stage.location,
            `Action Required: Document "${doc.title}" has been forwarded to your office (${stage.name}). Please accept it to proceed.`
          );
        }
      }

      // Create notification for the document owner if someone else advanced it
      if (userId !== doc.createdBy) {
        await storage.createNotification({
          userId: doc.createdBy,
          documentId: doc.id,
          message: notificationMessage,
        });
      }

      res.json(updatedDoc);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/documents/:id/accept", async (req, res) => {
    const { id } = req.params;
    const { userId } = req.body;

    try {
      const doc = await storage.getDocument(id);
      if (!doc) return res.status(404).json({ message: "Document not found" });
      
      const updatedDoc = await storage.acceptDocument(id);
      const category = await storage.getCategory(doc.categoryId);
      const stageName = category?.stages[doc.currentStageIndex]?.name || "current stage";

      await storage.createAuditLog({
        documentId: id,
        userId: userId,
        action: "Accepted Document",
        details: { stage: stageName }
      });

      // Notify the owner
      const user = await storage.getUser(userId);
      await storage.createNotification({
        userId: doc.createdBy,
        documentId: id,
        message: `Your document "${doc.title}" was officially received and accepted at the ${stageName} stage by ${user?.fullName || "a staff member"}.`
      });

      res.json(updatedDoc);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/documents/:id/regress", async (req, res) => {
    const { id } = req.params;
    const { userId } = req.body; // User performing the action

    try {
      const doc = await storage.getDocument(id);
      if (!doc) return res.status(404).json({ message: "Document not found" });
      const category = await storage.getCategory(doc.categoryId);
      if (!category) return res.status(400).json({ message: "Category not found" });

      const updates: any = {};
      let notificationMessage = "";

      if (doc.currentStageIndex > 0) {
        const prevIndex = doc.currentStageIndex - 1;
        updates.currentStageIndex = prevIndex;
        updates.history = [
          ...doc.history,
          { stage: category.stages[prevIndex].name, timestamp: new Date().toISOString(), userId: userId }
        ];
        updates.status = "active"; // Revert to active if regressed from completed
        notificationMessage = `Document "${doc.title}" moved back to "${category.stages[prevIndex].name}".`;
      } else {
        return res.status(400).json({ message: "Document is already at the first stage." });
      }

      const updatedDoc = await storage.updateDocument(id, {
        ...updates,
        currentStageStartedAt: new Date().toISOString(),
        delayNotificationCount: 0,
      });

      // Audit Log
      await storage.createAuditLog({
        documentId: id,
        userId: userId,
        action: "Regressed Stage",
        details: { from: doc.currentStageIndex, to: updates.currentStageIndex, stage: category.stages[updates.currentStageIndex].name }
      });

      // Create notification for the document owner if someone else regressed it
      if (userId !== doc.createdBy) {
        await storage.createNotification({
          userId: doc.createdBy,
          documentId: doc.id,
          message: notificationMessage,
        });
      }

      res.json(updatedDoc);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.delete("/api/documents/:id", async (req, res) => {
    await storage.deleteDocument(req.params.id);
    res.status(204).end();
  });

  app.post("/api/documents/:id/attachment", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const fileUrl = `/uploads/${req.file.filename}`;
      const docId = req.params.id;

      const doc = await storage.getDocument(docId);
      if (!doc) return res.status(404).json({ message: "Document not found" });

      const updatedDoc = await storage.updateDocument(docId, { attachmentUrl: fileUrl });
      res.json(updatedDoc);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // List uploaded files
  app.get("/api/uploads", async (req, res) => {
    try {
      const dirents = await fs.promises.readdir(uploadsDir);
      const files = await Promise.all(
        dirents.map(async (name) => {
          const full = path.join(uploadsDir, name);
          try {
            const st = await fs.promises.stat(full);
            return {
              name,
              url: `/uploads/${encodeURIComponent(name)}`,
              size: st.size,
              mtime: st.mtime,
            };
          } catch (e) {
            return null;
          }
        }),
      );
      res.json(files.filter(Boolean));
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // Delete an uploaded file by filename (safe basename)
  app.delete("/api/uploads/:filename", async (req, res) => {
    try {
      const safeName = path.basename(req.params.filename);
      const target = path.join(uploadsDir, safeName);
      // Prevent deleting outside uploads
      if (!target.startsWith(uploadsDir)) return res.status(400).json({ message: "Invalid filename" });
      await fs.promises.unlink(target);
      res.status(204).end();
    } catch (e: any) {
      if (e.code === "ENOENT") return res.status(404).json({ message: "Not found" });
      res.status(500).json({ message: e.message });
    }
  });

  // Notifications
  app.get("/api/notifications", async (req, res) => {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ message: "User ID is required" });
    const notifs = await storage.getNotifications(userId as string);
    res.json(notifs);
  });

  app.post("/api/notifications/mark-read", async (req, res) => {
    const { userId, notificationIds } = req.body;
    if (!userId || !notificationIds) return res.status(400).json({ message: "User ID and Notification IDs are required" });
    await storage.markNotificationsAsRead(userId, notificationIds);
    res.status(204).end();
  });

  app.delete("/api/notifications/:id", async (req, res) => {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ message: "User ID required" });
    await storage.deleteNotification(req.params.id, userId as string);
    res.status(204).end();
  });

  app.delete("/api/notifications", async (req, res) => {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ message: "User ID required" });
    await storage.clearNotifications(userId as string);
    res.status(204).end();
  });

  // Org Chart
  app.get("/api/org-nodes", async (_req, res) => {
    const nodes = await storage.getOrgNodes();
    res.json(nodes);
  });

  app.post("/api/org-nodes", async (req, res) => {
    const parsed = insertOrgNodeSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(parsed.error);
    const node = await storage.createOrgNode(parsed.data);
    res.status(201).json(node);
  });

  app.patch("/api/org-nodes/:id", async (req, res) => {
    try {
      const node = await storage.updateOrgNode(req.params.id, req.body);
      res.json(node);
    } catch (e) {
      res.status(404).json({ message: "Node not found" });
    }
  });

  app.delete("/api/org-nodes/:id", async (req, res) => {
    await storage.deleteOrgNode(req.params.id);
    res.status(204).end();
  });

  return httpServer;
}
