import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

const sidebars: SidebarsConfig = {
  tutorialSidebar: [
    "intro",
    {
      type: "category",
      label: "Getting Started",
      items: [
        "getting-started/installation",
        "getting-started/quick-start",
        "getting-started/configuration",
      ],
    },
    {
      type: "category",
      label: "Core Concepts",
      items: [
        "core-concepts/loggers",
        "core-concepts/handlers",
        "core-concepts/attributes",
        "core-concepts/levels",
      ],
    },
    {
      type: "category",
      label: "Advanced Features",
      items: [
        "advanced/file-handler",
        "advanced/color-handler",
        "advanced/buffered-handler",
        "advanced/sampling-handler",
        "advanced/filter-handler",
        "advanced/async-handler",
        "advanced/context",
        "advanced/middleware",
        "advanced/utilities",
      ],
    },
    {
      type: "category",
      label: "API Reference",
      items: ["api/overview"],
    },
    {
      type: "category",
      label: "Examples",
      items: ["examples/basic-usage"],
    },
    {
      type: "doc",
      id: "comparison",
      label: "jslog vs Go slog",
    },
  ],
};

export default sidebars;
