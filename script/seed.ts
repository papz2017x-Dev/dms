import 'dotenv/config';
import { db } from "../server/db";
import { users, categories } from "../shared/schema";
import { eq } from "drizzle-orm";

async function seed() {
  console.log("Seeding database...");

  // Check if superuser exists
  const [existingSuperUser] = await db
    .select()
    .from(users)
    .where(eq(users.username, "superuser"));

  if (!existingSuperUser) {
    console.log("Creating superuser...");
    await db.insert(users).values({
      username: "superuser",
      password: "admin123", // In a production app, this should be hashed
      fullName: "System Super User",
      role: "superuser",
    });
    console.log("Superuser created successfully.");
    console.log("Username: superuser");
    console.log("Password: P455w0rd!");
  } else {
    console.log("Superuser already exists.");
  }

  // Add categories if fewer than needed
  const existingCategories = await db.select().from(categories);
  if (existingCategories.length <= 1) {
    console.log("Updating/Creating categories with SLA and Office tagging...");
    
    // Clear and re-seed categories for a fresh start with the new schema
    await db.delete(categories);
    
    // 1. Finance Procurement (Managed by Finance)
    const financeOfficeId = "2594dba2-1773-11f1-9ba7-88aedd894ad0"; // FCD from org-nodes
    await db.insert(categories).values({
      name: "Financial Requisition",
      description: "Critical budget and payment processing workflow",
      officeId: financeOfficeId,
      stages: [
        { name: "Draft", location: "User Office", slaHours: 4 },
        { name: "Budget Verification", location: "Finance Dept", slaHours: 24 },
        { name: "Treasury Approval", location: "Finance Dept", slaHours: 48 },
        { name: "Disbursement", location: "Fin-Treasury", slaHours: 72 },
        { name: "Completed", location: "Archive", slaHours: 1 }
      ],
    });

    // 2. HR Leave Application (Managed by HR)
    const hrOfficeId = "822fe451-1773-11f1-9ba7-88aedd894ad0"; // AHRD from org-nodes
    await db.insert(categories).values({
      name: "Leave & Attendance",
      description: "Personnel leave processing workflow",
      officeId: hrOfficeId,
      stages: [
        { name: "Draft", location: "Employee", slaHours: 2 },
        { name: "Division Approval", location: "Division Head", slaHours: 24 },
        { name: "HR Verification", location: "HR Office", slaHours: 48 },
        { name: "Management Approval", location: "OGM", slaHours: 72 },
        { name: "Archived", location: "HR-Files", slaHours: 1 }
      ],
    });

    console.log("Advanced categories seeded.");
  }

  console.log("Seeding complete.");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
