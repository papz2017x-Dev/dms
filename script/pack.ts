import { execSync } from "child_process";
import fs from "fs/promises";
import path from "path";

async function pack() {
  const rootDir = process.cwd();
  const tempDir = path.join(rootDir, "dist-deploy");
  const zipName = "docuflow-deploy.zip";
  const zipPath = path.join(rootDir, zipName);

  console.log("1. Building the application...");
  execSync("npm run build", { stdio: "inherit" });

  console.log("2. Generating database migrations...");
  // Set a dummy DATABASE_URL so drizzle-kit generate doesn't throw
  execSync("npx drizzle-kit generate", {
    env: { ...process.env, DATABASE_URL: "mysql://dummy:dummy@localhost:3306/dummy" },
    stdio: "inherit",
  });

  console.log("3. Preparing temporary deployment folder...");
  // Remove existing temp dir and zip
  await fs.rm(tempDir, { recursive: true, force: true });
  await fs.rm(zipPath, { force: true });
  await fs.mkdir(tempDir, { recursive: true });

  // Copy files
  console.log("Copying dist...");
  await fs.cp(path.join(rootDir, "dist"), path.join(tempDir, "dist"), { recursive: true });
  
  console.log("Copying migrations...");
  await fs.cp(path.join(rootDir, "migrations"), path.join(tempDir, "migrations"), { recursive: true });

  console.log("Copying app.js...");
  await fs.copyFile(path.join(rootDir, "app.js"), path.join(tempDir, "app.js"));

  console.log("Copying package config...");
  await fs.copyFile(path.join(rootDir, "package.json"), path.join(tempDir, "package.json"));
  await fs.copyFile(path.join(rootDir, "package-lock.json"), path.join(tempDir, "package-lock.json"));

  console.log("Copying environment template as .env.example (won't overwrite your live .env)...");
  await fs.copyFile(path.join(rootDir, ".env.hostinger"), path.join(tempDir, ".env.example"));

  console.log("4. Creating zip archive...");
  if (process.platform === "win32") {
    // On Windows, use PowerShell Compress-Archive
    execSync(`powershell -Command "Compress-Archive -Path '${tempDir}\\*' -DestinationPath '${zipPath}' -Force"`, { stdio: "inherit" });
  } else {
    // On Unix/Linux/macOS, use zip
    execSync(`cd "${tempDir}" && zip -r "${zipPath}" ./*`, { stdio: "inherit" });
  }

  console.log("5. Cleaning up temporary folder...");
  await fs.rm(tempDir, { recursive: true, force: true });

  console.log(`\n🎉 Success! Created deployment package: ${zipName}`);
  console.log("Upload this ZIP to your Hostinger file manager and extract it.");
  console.log("IMPORTANT: Rename .env.example to .env and fill in your credentials (only needed on first deploy).");
}

pack().catch((err) => {
  console.error("Packing failed:", err);
  process.exit(1);
});
