import { themes as prismThemes } from "prism-react-renderer";
import type { Config } from "@docusaurus/types";
import type * as Preset from "@docusaurus/preset-classic";
import versions from "./versions.json";

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const latestVersion = versions[versions.length - 1];

const config: Config = {
  title: "jslog",
  tagline: "Structured logging for Node.js that makes Go's log/slog look basic",

  // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
  },

  // Set the production url of your site here
  url: "https://omdxp.github.io",
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: "/jslog/",

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: "omdxp", // Usually your GitHub org/user name.
  projectName: "jslog", // Usually your repo name.

  onBrokenLinks: "throw",

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: "en",
    locales: ["en"],
  },

  presets: [
    [
      "classic",
      {
        docs: {
          sidebarPath: "./sidebars.ts",
          editUrl: "https://github.com/omdxp/jslog/tree/main/website/",
          lastVersion: latestVersion,
          versions: {
            current: {
              label: "Next",
              path: "next",
            },
            "1.4.0": {
              label: `${latestVersion} (latest)`,
              path: "/",
            },
            "1.3.1": {
              label: "1.3.1",
              path: "1.3.1",
            },
            "1.3.0": {
              label: "1.3.0",
              path: "1.3.0",
            },
            "1.2.0": {
              label: "1.2.0",
              path: "1.2.0",
            },
            "1.1.2": {
              label: "1.1.2",
              path: "1.1.2",
            },
            "1.0.0": {
              label: "1.0.0",
              path: "1.0.0",
            },
          },
        },
        blog: false,
        theme: {
          customCss: "./src/css/custom.css",
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    colorMode: {
      respectPrefersColorScheme: true,
    },
    algolia: {
      appId: "CHW4BZRW0J",
      apiKey: "a36b29e2861f66a5004fa91227c97de8",
      indexName: "jslog",
      contextualSearch: true,
    },
    navbar: {
      title: "jslog",
      items: [
        {
          type: "docSidebar",
          sidebarId: "tutorialSidebar",
          position: "left",
          label: "Docs",
        },
        {
          type: "docsVersionDropdown",
          position: "left",
          dropdownActiveClassDisabled: true,
        },
        {
          href: "https://www.npmjs.com/package/@omdxp/jslog",
          label: "npm",
          position: "right",
        },
        {
          href: "https://github.com/omdxp/jslog",
          label: "GitHub",
          position: "right",
        },
      ],
    },
    footer: {
      style: "dark",
      links: [
        {
          title: "Docs",
          items: [
            {
              label: "Getting Started",
              to: "/docs/",
            },
            {
              label: "API Reference",
              to: "/docs/api/overview",
            },
          ],
        },
        {
          title: "Community",
          items: [
            {
              label: "GitHub",
              href: "https://github.com/omdxp/jslog",
            },
            {
              label: "Issues",
              href: "https://github.com/omdxp/jslog/issues",
            },
          ],
        },
        {
          title: "More",
          items: [
            {
              label: "npm",
              href: "https://www.npmjs.com/package/@omdxp/jslog",
            },
            {
              label: "License (MIT)",
              href: "https://github.com/omdxp/jslog/blob/main/LICENSE",
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} @omdxp/jslog. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
