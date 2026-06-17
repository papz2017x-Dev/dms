import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from "@shared/schema";

// Build the mysql2 connection config object.
// Using an object (not a URL string) avoids issues with special characters
// in passwords that would break URL parsing (e.g. ?, >, @, #).
function getConnectionConfig(): mysql.PoolOptions {
  // Option 1: individual MYSQL_* variables (recommended for Hostinger)
  if (process.env.MYSQL_HOST) {
    return {
      host:     process.env.MYSQL_HOST,
      port:     parseInt(process.env.MYSQL_PORT || "3306", 10),
      user:     process.env.MYSQL_USER     || "",
      password: process.env.MYSQL_PASSWORD || "",
      database: process.env.MYSQL_DATABASE || "",
    };
  }

  // Option 2: single DATABASE_URL string (URL-encode the password if it has special chars)
  if (process.env.DATABASE_URL) {
    return { uri: process.env.DATABASE_URL };
  }

  throw new Error(
    "Database configuration missing. Set MYSQL_HOST/MYSQL_USER/MYSQL_PASSWORD/MYSQL_DATABASE, " +
    "or set DATABASE_URL in your .env file."
  );
}

export const pool = mysql.createPool(getConnectionConfig());
export const db = drizzle(pool, { schema, mode: 'default' });
