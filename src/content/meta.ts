import type { LevelId, TopicId } from "./types";

export interface LevelMeta {
  id: LevelId;
  name: string;
  years: string;
  blurb: string;
  focus: string[];
}

export const LEVELS: LevelMeta[] = [
  {
    id: "fresher",
    name: "Fresher",
    years: "0–1 yrs",
    blurb: "Testing basics, test design, first SQL and Git, and your first Selenium script.",
    focus: ["Testing fundamentals", "Test case design", "Bug life cycle", "SQL & Git basics", "Java basics", "Selenium intro"],
  },
  {
    id: "junior",
    name: "Junior QA",
    years: "1–3 yrs",
    blurb: "Hands-on automation: locators, waits, TestNG, Page Object Model, Postman and REST basics.",
    focus: ["Selenium in depth", "TestNG / JUnit", "Page Object Model", "API testing with Postman", "SQL joins", "Agile QA"],
  },
  {
    id: "mid",
    name: "Mid-level QA",
    years: "3–5 yrs",
    blurb: "Own a framework: Playwright, REST Assured, data-driven tests, CI pipelines and flaky tests.",
    focus: ["Framework design", "Playwright", "REST Assured", "CI/CD with GitHub Actions & Jenkins", "Parallel runs", "Intro to performance"],
  },
  {
    id: "senior",
    name: "Senior SDET",
    years: "5–8 yrs",
    blurb: "Scale and quality engineering: design patterns, contract tests, performance, test infra.",
    focus: ["Design patterns", "Contract & microservice testing", "Performance with JMeter & k6", "Test infra & Docker", "Flakiness at scale", "Mentoring"],
  },
  {
    id: "architect",
    name: "Lead / Architect",
    years: "8+ yrs",
    blurb: "Strategy and leadership: test strategy, architecture, metrics, shift-left, org-wide quality.",
    focus: ["Test strategy", "Automation architecture", "Quality metrics", "Shift-left & shift-right", "Tooling decisions", "Leading QA teams"],
  },
];

export const TOPICS: Record<TopicId, { name: string; short: string }> = {
  fundamentals: { name: "Testing Fundamentals", short: "Fundamentals" },
  "test-design": { name: "Manual & Test Design", short: "Test Design" },
  sql: { name: "SQL", short: "SQL" },
  git: { name: "Git", short: "Git" },
  programming: { name: "Java / Python", short: "Programming" },
  selenium: { name: "Selenium", short: "Selenium" },
  playwright: { name: "Playwright", short: "Playwright" },
  api: { name: "API Testing", short: "API" },
  framework: { name: "Frameworks & Design Patterns", short: "Frameworks" },
  cicd: { name: "CI/CD", short: "CI/CD" },
  performance: { name: "Performance", short: "Performance" },
  strategy: { name: "Strategy & Architecture", short: "Strategy" },
};

export function levelMeta(id: string) {
  return LEVELS.find((l) => l.id === id);
}
