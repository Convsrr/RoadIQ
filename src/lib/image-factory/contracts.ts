export type ImageFactoryQaStatus = "pending" | "pass" | "warning" | "fail";
export type ImageFactoryApprovalStatus = "pending" | "approved" | "rejected";
export type ImageWorkflowStatus = "missing" | "legacy" | "generating" | "pending_qa" | "qa_pass" | "qa_warning" | "qa_fail" | "approved" | "published";

export type ImageFactoryMetrics = {
  totalChallenges: number;
  missing: number;
  legacy: number;
  generating: number;
  pendingQa: number;
  qaPass: number;
  qaWarning: number;
  qaFail: number;
  approved: number;
  published: number;
  updatedAt: number;
};

export type ImageFactorySpec = {
  styleProfile: string;
  camera: string;
  scene: string;
  roadEnvironment: string;
  composition: string;
  mustShow: string[];
  mustNotShow: string[];
  criticalFacts: string[];
  regionRules: string[];
  prompt: string;
  negativePrompt: string;
  candidateCount: number;
  status: "draft" | "ready" | "needs_review";
  promptVersion: number;
  updatedAt: number;
};

export type ImageFactoryQa = {
  status: Exclude<ImageFactoryQaStatus, "pending">;
  score: number;
  issues: string[];
  confirmedFacts: string[];
  missingFacts: string[];
  contradictions: string[];
  summary: string;
  model: string;
};

export type ImageFactoryCandidate = {
  id: string;
  imageUrl: string;
  provider: "mock" | "gemini";
  model: string;
  promptVersion: number;
  candidateIndex: number;
  qaStatus: ImageFactoryQaStatus;
  approvalStatus: ImageFactoryApprovalStatus;
  approvalNotes: string | null;
  qa: ImageFactoryQa | null;
  createdAt: number;
};

export type ImageFactoryAsset = {
  id: string;
  version: number;
  sourceType: "legacy" | "generated";
  imageUrl: string;
  imageAlt: string;
  imagePosition: string;
  isActive: boolean;
  publishedAt: number | null;
};

export type ImageFactoryReviewItem = {
  id: string;
  question: string;
  answers: Array<{ id: string; text: string }>;
  correctAnswerId: string | null;
  category: string;
  difficulty: string;
  challengeType: "objective" | "community";
  imageWorkflowStatus: ImageWorkflowStatus;
  currentImage: ImageFactoryAsset | null;
  spec: ImageFactorySpec | null;
  candidates: ImageFactoryCandidate[];
  assets: ImageFactoryAsset[];
  imageAlt: string;
  imagePosition: string;
};

export type ImageFactoryDashboard = {
  metrics: ImageFactoryMetrics;
  page: ImageFactoryReviewItem[];
  isDone: boolean;
  continueCursor: string;
};
