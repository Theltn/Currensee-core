// Node ESM-safe script (works either way)
import { existsSync, copyFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function ensureEnv(dirRel) {
  const dir = join(__dirname, "..", dirRel);
  const env = join(dir, ".env");
  const example = join(dir, ".env.example");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  if (existsSync(example) && !existsSync(env)) {
    copyFileSync(example, env);
    console.log(`Created ${dirRel}/.env from ${dirRel}/.env.example`);
  }
}

// single-package layout (root .env)
ensureEnv(".");
