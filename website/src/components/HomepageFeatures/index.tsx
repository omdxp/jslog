import type { ReactNode } from "react";
import clsx from "clsx";
import Heading from "@theme/Heading";
import styles from "./styles.module.css";

type FeatureItem = {
  title: string;
  description: ReactNode;
};

const FeatureList: FeatureItem[] = [
  {
    title: "Go slog API in Node.js",
    description: (
      <>
        Full API compatibility with Go's log/slog. If you know Go's slog, you
        already know jslog. Familiar patterns, same mental model.
      </>
    ),
  },
  {
    title: "20+ Advanced Features",
    description: (
      <>
        File rotation, buffering, sampling, filtering, async handlers,
        middleware, metrics, and more! Everything Go slog has, plus features it
        doesn't.
      </>
    ),
  },
  {
    title: "Production Ready",
    description: (
      <>
        Built for production with TypeScript support, zero dependencies, and
        performance in mind. Easy to debug in development, powerful in
        production.
      </>
    ),
  },
  {
    title: "Structured Logging",
    description: (
      <>
        Key-value attributes for machine-parseable logs. Perfect for log
        aggregators like Elasticsearch, Splunk, or any JSON-based system.
      </>
    ),
  },
  {
    title: "Colorful Development",
    description: (
      <>
        Beautiful ANSI color-coded console output with ColorHandler. Make your
        development logs easy to read and debug.
      </>
    ),
  },
  {
    title: "Type Safe",
    description: (
      <>
        Full TypeScript support with complete type safety and IntelliSense.
        Catch errors at compile time, not runtime.
      </>
    ),
  },
];

function Feature({ title, description }: FeatureItem) {
  return (
    <div className={clsx("col col--4")}>
      <div className="text--center padding-horiz--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
