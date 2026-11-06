export type LevelId = "fresher" | "junior" | "mid" | "senior" | "architect";

export type TopicId =
  | "fundamentals"
  | "test-design"
  | "sql"
  | "git"
  | "programming"
  | "selenium"
  | "playwright"
  | "api"
  | "framework"
  | "cicd"
  | "performance"
  | "strategy";

export interface CodeSample {
  lang: "java" | "typescript" | "python" | "sql" | "bash" | "yaml" | "javascript" | "json" | "gherkin" | "text" | "groovy" | "xml";
  label?: string;
  code: string;
}

/** A question as authored in the content files. */
export interface QuestionInput {
  topic: TopicId;
  /** Study-path module (section) the question belongs to. Questions are listed in path order. */
  module: string;
  q: string;
  /** The answer you could say out loud in about 60 seconds. */
  a60: string;
  /** Deeper explanation. Paragraphs separated by blank lines. */
  explain: string;
  /** A concrete, real-world example. */
  example: string;
  code?: CodeSample[];
}

export interface Question extends QuestionInput {
  id: string;
  level: LevelId;
  /** 1-based position in the level's study path. */
  order: number;
  free: boolean;
}

/** Safe-to-ship summary (no answer content). */
export interface QuestionSummary {
  id: string;
  level: LevelId;
  order: number;
  topic: TopicId;
  module: string;
  q: string;
  free: boolean;
}
