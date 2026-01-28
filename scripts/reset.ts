import { Redis } from "@upstash/redis";
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
      if ((value.startsWith('"') && value.endsWith('"')) || 
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      process.env[key.trim()] = value;
    }
  }
}

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

async function reset() {
  const backupsDir = join(process.cwd(), "backups");
  
  if (!existsSync(backupsDir)) {
    mkdirSync(backupsDir, { recursive: true });
  }

  try {
    // First, backup existing data
    const links = await redis.get("links");
    
    if (links) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `links-${timestamp}-before-reset.json`;
      const filepath = join(backupsDir, filename);
      
      writeFileSync(filepath, JSON.stringify({ links }, null, 2));
      console.log(`Backup saved to: ${filepath}`);
    }

    // Reset to empty
    await redis.set("links", []);
    console.log("Data reset to empty");
  } catch (error) {
    console.error("Reset failed:", error);
    process.exit(1);
  }
}

reset();
