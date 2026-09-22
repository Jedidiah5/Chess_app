/**
 * After `next build`, stamps a unique cache version into public/sw.js and
 * injects `/_next/static/*` URLs so the offline shell (play / local / computer)
 * has JS, CSS, and fonts without a network.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";

const root = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(root, "..");
const templatePath = path.join(root, "sw.template.js");
const swPath = path.join(projectRoot, "public", "sw.js");
const nextBuildIdPath = path.join(projectRoot, ".next", "BUILD_ID");
const nextStaticDir = path.join(projectRoot, ".next", "static");

const buildId =
  process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ||
  process.env.NEXT_PUBLIC_BUILD_ID ||
  (fs.existsSync(nextBuildIdPath)
    ? fs.readFileSync(nextBuildIdPath, "utf8").trim().slice(0, 12)
    : crypto.randomBytes(6).toString("hex"));

function walkStaticFiles(dir, base = "") {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = base ? `${base}/${entry.name}` : entry.name;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // Dev/HMR leftovers — never ship these in the PWA cache.
      if (entry.name === "development" || entry.name === "webpack") continue;
      out.push(...walkStaticFiles(full, rel));
      continue;
    }
    if (entry.name.endsWith(".map")) continue;
    if (entry.name.includes("hot-update")) continue;
    out.push(`/_next/static/${rel.replace(/\\/g, "/")}`);
  }
  return out;
}

const staticAssets = walkStaticFiles(nextStaticDir).sort();
const staticLiteral = staticAssets.map((u) => JSON.stringify(u)).join(",\n  ");

let template = fs.readFileSync(templatePath, "utf8");
template = template.replace(/chess-v__SW_BUILD_ID__/g, `chess-v${buildId}`);
template = template.replace(
  "/* __BUILD_STATIC_ASSETS__ */",
  staticLiteral ? `\n  ${staticLiteral}\n` : "",
);

fs.writeFileSync(swPath, template);

const stockfishDir = path.join(projectRoot, "public", "stockfish");
let stockfishBytes = 0;
if (fs.existsSync(stockfishDir)) {
  for (const name of fs.readdirSync(stockfishDir)) {
    const full = path.join(stockfishDir, name);
    if (fs.statSync(full).isFile()) stockfishBytes += fs.statSync(full).size;
  }
}

let staticBytes = 0;
for (const url of staticAssets) {
  const rel = url.replace("/_next/static/", "");
  const full = path.join(nextStaticDir, ...rel.split("/"));
  if (fs.existsSync(full)) staticBytes += fs.statSync(full).size;
}

const totalMb = ((staticBytes + stockfishBytes) / (1024 * 1024)).toFixed(2);
console.log(
  `Wrote public/sw.js with cache chess-v${buildId} (${staticAssets.length} static assets, ~${totalMb} MB with Stockfish)`,
);
