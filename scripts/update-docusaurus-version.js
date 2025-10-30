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

// Strategy: Replace the entire versions object
// Find the versions object and rebuild it with the new version

// Find the start of the versions object
const versionsStart = config.indexOf("versions: {");
if (versionsStart === -1) {
  console.error("Could not find 'versions: {' in docusaurus.config.ts");
  process.exit(1);
}

// Find the matching closing brace for the versions object
// We need to count braces to find the right one
let braceCount = 0;
let versionsEnd = -1;
let inVersionsObject = false;

for (let i = versionsStart; i < config.length; i++) {
  if (config[i] === "{") {
    braceCount++;
    inVersionsObject = true;
  } else if (config[i] === "}") {
    braceCount--;
    if (inVersionsObject && braceCount === 0) {
      versionsEnd = i + 1;
      break;
    }
  }
}

if (versionsEnd === -1) {
  console.error("Could not find closing brace for versions object");
  process.exit(1);
}

const beforeVersions = config.substring(0, versionsStart);
const afterVersions = config.substring(versionsEnd);

// Build versions config entries for all versions except the new one
const versionEntries = versions
  .filter((v) => v !== newVersion)
  .map((v) => {
    return `            "${v}": {
              label: "${v}",
              path: "${v}",
            },`;
  })
  .join("\n");

// Build the complete versions object
const newVersionsObject = `versions: {
            current: {
              label: "Next",
              path: "next",
            },
            "${newVersion}": {
              label: \`\${latestVersion} (latest)\`,
              path: "/",
            },
${versionEntries}
          }`;

config = beforeVersions + newVersionsObject + afterVersions;

fs.writeFileSync(configPath, config, "utf8");
console.log(
  `✓ Updated ${prevVersion} → ${newVersion} as latest in docusaurus.config.ts`
);
