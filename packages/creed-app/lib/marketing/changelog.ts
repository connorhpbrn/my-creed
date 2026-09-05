// Curated public releases, newest first. Keep this aligned with Creed's
// application version and the workflow in CHANGELOG.md.

export type ChangelogEntry = {
  date: string;
  title: string;
  body: string;
  highlights?: string[];
};

export const changelog: ChangelogEntry[] = [
  {
    date: "2026-08-18",
    title: "Creed Open v1.0.0",
    body: "The base Open release. One Personal Creed you host and connect to your agents.",
    highlights: [
      "Setup for local and Vercel.",
      "The file, connections, and settings.",
      "MCP and HTTP connections.",
    ],
  },
];
