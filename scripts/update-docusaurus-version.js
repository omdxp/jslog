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

// Extract everything before "versions: {"
const beforeVersions = config.match(/([\s\S]*?versions:\s*\{)/)?.[1];
// Extract everything after the versions object closing brace
const afterVersions = config.match(/versions:\s*\{[\s\S]*?\n(\s*)\},/)?.[1];
const afterVersionsContent = config.substring(
  config.indexOf("versions: {") +
    config.match(/versions:\s*\{[\s\S]*?\n\s*\},/)?.[0].length
);

if (!beforeVersions || !afterVersionsContent) {
  console.error("Could not parse docusaurus.config.ts structure");
  process.exit(1);
}

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
          },`;

config = beforeVersions + newVersionsObject + afterVersionsContent;

fs.writeFileSync(configPath, config, "utf8");
console.log(
  `✓ Updated ${prevVersion} → ${newVersion} as latest in docusaurus.config.ts`
);
