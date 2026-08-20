import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, "..");

const rootPkg = JSON.parse(
  readFileSync(path.join(rootDir, "package.json"), "utf8")
);
const serverPkg = JSON.parse(
  readFileSync(path.join(rootDir, "server", "package.json"), "utf8")
);

const rootDeps = rootPkg.dependencies || {};
const serverDeps = serverPkg.dependencies || {};

const missing = Object.keys(serverDeps).filter((name) => !(name in rootDeps));

if (missing.length > 0) {
  console.error(
    "Dependency drift: the following server/package.json dependencies are missing from the root package.json:"
  );
  for (const name of missing) {
    console.error(`  - ${name}`);
  }
  console.error(
    "\nVercel serverless functions resolve dependencies from the root package.json. Add these there too."
  );
  process.exit(1);
}

console.log("OK: all server dependencies are present in the root package.json.");
