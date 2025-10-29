#!/usr/bin/env node

/**
 * Updates docusaurus.config.ts to set the new version as latest
 */

const fs = require("fs");
const path = require("path");

const newVersion = process.argv[2];
if (!newVersion) {
  console.error("Usage: node update-docusaurus-version.js <new-version>");
  process.exit(1);
}

const configPath = path.join(__dirname, "../website/docusaurus.config.ts");
let config = fs.readFileSync(configPath, "utf8");

// Get versions to find the previous latest
const versionsPath = path.join(__dirname, "../website/versions.json");
const versions = JSON.parse(fs.readFileSync(versionsPath, "utf8"));
const prevVersion = versions[versions.length - 2]; // Second to last is the previous latest

if (!prevVersion) {
  console.log("No previous version found, skipping update");
  process.exit(0);
}

// Find and replace the version config
// Pattern: "1.1.2": { label: `${latestVersion} (latest)`, path: "/", }
const prevPattern = new RegExp(
  `"${prevVersion}":\\s*{[^}]*label:\\s*\`\\$\\{latestVersion\\}\\s*\\(latest\\)\`[^}]*path:\\s*"/"[^}]*}`,
  "gs"
);

const newLatestConfig = `"${newVersion}": {
              label: \`\${latestVersion} (latest)\`,
              path: "/",
            }`;

const oldVersionConfig = `"${prevVersion}": {
              label: "${prevVersion}",
              path: "${prevVersion}",
            }`;

// Replace old latest with new latest + old version entry
config = config.replace(
  prevPattern,
  `${newLatestConfig},\n            ${oldVersionConfig}`
);

fs.writeFileSync(configPath, config, "utf8");
console.log(
  `✓ Updated ${prevVersion} → ${newVersion} as latest in docusaurus.config.ts`
);
