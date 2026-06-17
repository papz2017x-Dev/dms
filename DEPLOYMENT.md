# DocuFlow Production Deployment Guide (Hostinger)

This guide provides step-by-step instructions for deploying DocuFlow on Hostinger Shared Hosting via the Node.js Application Manager.

---

## Prerequisites

Before starting, make sure you have:
1. Access to your Hostinger hPanel.
2. Node.js installed on your local machine to build the deployment package.

---

## Step-by-Step Deployment

### 1. Build the Deployment Package Locally
Open a terminal in your project root on your local machine and run:
```bash
npm run build:deploy
```
This script will:
- Build the client static assets (Vite) and server bundle (esbuild).
- Automatically generate the Drizzle SQL database migration files into the `./migrations` folder.
- Pack all necessary production files (including `dist/`, `migrations/`, `app.js`, `package.json`, and an `.env` template) into a single zip archive named **`docuflow-deploy.zip`** in the project root.

---

### 2. Create a MySQL Database on Hostinger
1. Log in to your Hostinger hPanel.
2. Go to **Databases** > **MySQL Databases**.
3. Create a new database:
   - **MySQL Database Name**: e.g., `u123456789_docuflow`
   - **MySQL User Name**: e.g., `u123456789_docu_user`
   - **Password**: Choose a strong password.
4. Note down these details, along with the Host (typically `localhost` or `127.0.0.1`).

---

### 3. Set up the Node.js App in Hostinger hPanel
1. In the Hostinger hPanel, go to **Advanced** > **Node.js** (or search for "Node.js").
2. Click **Create Application**.
3. Configure the settings:
   - **Node.js Version**: Select **Node.js 18** or **Node.js 20**.
   - **Application Mode**: Select **Production**.
   - **Application Root**: The directory where your files will go (e.g., `public_html/docuflow`).
   - **Application Startup File**: Enter `app.js`.
4. Click **Create**. This will initialize the application directory and a default sample server.

---

### 4. Upload and Extract files
1. Open the **File Manager** in Hostinger hPanel.
2. Navigate to the **Application Root** directory you specified in the previous step (e.g. `domains/yourdomain.com/public_html/docuflow`).
3. Delete the default files created by Hostinger (like a default `app.js` or `package.json` if they exist).
4. Upload **`docuflow-deploy.zip`** to this folder.
5. Right-click the zip file and choose **Extract**. Extract the files directly into the Application Root directory.
6. You can now delete the uploaded `docuflow-deploy.zip` file to save disk space.

---

### 5. Configure Environment Variables
Locate the `.env` file that was extracted in the Application Root:
1. Double-click to edit it.
2. Fill in the variables:
   - Set database credentials using the individual MySQL fields (Hostinger standard):
     ```env
     MYSQL_HOST=localhost
     MYSQL_PORT=3306
     MYSQL_USER=u123456789_docu_user
     MYSQL_PASSWORD=your_database_password
     MYSQL_DATABASE=u123456789_docuflow
     ```
   - Set a strong random session secret:
     ```env
     SESSION_SECRET=a_very_strong_random_string_here
     ```
   - Set your domain's API base URL:
     ```env
     VITE_API_BASE=https://your-domain.com
     ```
   - Update SMTP settings if you want to enable email notifications (otherwise default/placeholders can remain).
3. Save the `.env` file.

---

### 6. Install Node.js Dependencies
1. Go back to the **Node.js** manager panel in Hostinger hPanel.
2. Find your application and click **NPM Install** (or **Install Dependencies**).
3. Wait for the process to complete. This installs the required runtime dependencies (like `mysql2` and `dotenv`). The devDependencies (which are large and not needed) are ignored.

---

### 7. Start/Restart the Application
1. In the Node.js manager panel, click **Start Application** (or **Restart** if it is already running).
2. On startup, the server will:
   - Read the `.env` file.
   - Automatically execute all SQL migration files in the `migrations/` folder on your Hostinger database to set up or update the tables.
   - Seed default initial data (like the `superuser` and default categories) if they do not exist.
   - Start the server and serve the static React frontend and the backend API on the port provided by Hostinger.

Your application is now live!
