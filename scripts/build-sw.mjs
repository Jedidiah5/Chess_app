/**
 * After `next build`, stamps a unique cache version into public/sw.js
 * so an already-installed app picks up the new deploy (skipWaiting + claim).
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

const buildId =
  process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ||
  process.env.NEXT_PUBLIC_BUILD_ID ||
  (fs.existsSync(nextBuildIdPath)
    ? fs.readFileSync(nextBuildIdPath, "utf8").trim().slice(0, 12)
    : crypto.randomBytes(6).toString("hex"));

const template = fs.readFileSync(templatePath, "utf8");
const sw = template.replace(/chess-v__SW_BUILD_ID__/g, `chess-v${buildId}`);
fs.writeFileSync(swPath, sw);
console.log(`Wrote public/sw.js with cache chess-v${buildId}`);
