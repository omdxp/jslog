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

// Find the old latest version config and replace it
const oldLatestPattern = new RegExp(
  `"${prevVersion}":\\s*\\{\\s*label:\\s*\\\`\\$\\{latestVersion\\}\\s*\\(latest\\)\\\`,\\s*path:\\s*"/",\\s*\\}`,
  "m"
);

// Replace old latest with regular version entry
const oldVersionConfig = `"${prevVersion}": {
              label: "${prevVersion}",
              path: "${prevVersion}",
            }`;

config = config.replace(oldLatestPattern, oldVersionConfig);

// Now add the new version as latest after "current" entry
const currentPattern = /("current":\s*\{[^}]*\},)/;
const newLatestConfig = `$1
            "${newVersion}": {
              label: \`\${latestVersion} (latest)\`,
              path: "/",
            },`;

config = config.replace(currentPattern, newLatestConfig);

fs.writeFileSync(configPath, config, "utf8");
console.log(
  `✓ Updated ${prevVersion} → ${newVersion} as latest in docusaurus.config.ts`
);
