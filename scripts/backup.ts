import { head } from "@vercel/blob";
import { writeFileSync, mkdirSync, existsSync, readFileSync } from "fs";
import { join } from "path";

// Load .env file
const envPath = join(process.cwd(), ".env");
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const [key, ...valueParts] = line.split("=");
    if (key && valueParts.length > 0) {
      let value = valueParts.join("=").trim();
      // Remove surrounding quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) || 
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      process.env[key.trim()] = value;
    }
  }
}

async function backup() {
  const backupsDir = join(process.cwd(), "backups");
  
  if (!existsSync(backupsDir)) {
    mkdirSync(backupsDir, { recursive: true });
  }

  try {
    const blob = await head("links.json");
    if (!blob) {
      console.log("No data to backup");
      return;
    }

    const response = await fetch(blob.url);
    const data = await response.json();
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `links-${timestamp}.json`;
    const filepath = join(backupsDir, filename);
    
    writeFileSync(filepath, JSON.stringify(data, null, 2));
    console.log(`Backup saved to: ${filepath}`);
  } catch (error) {
    console.error("Backup failed:", error);
    process.exit(1);
  }
}

backup();
