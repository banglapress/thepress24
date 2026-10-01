export const ROLE_IDS = [
  "writer",
  "script_editor",
  "producer",
  "presenter",
  "video_editor",
  "planning_editor",
  "social",
] as const;

export type RoleId = (typeof ROLE_IDS)[number];

export const STAGE_IDS = [
  "scripting",
  "script_review",
  "shooting",
  "editing",
  "cut_review",
  "upload",
  "published",
] as const;

export type StageId = (typeof STAGE_IDS)[number];

export type Member = {
  userId: string;
  email: string | null;
  displayName: string;
  role: RoleId | null;
  isAdmin: boolean;
};

export type Piece = {
  id: string;
  title: string;
  topicNote: string;
  stage: StageId;
  pitchedByUserId: string;
  pitchedByName: string;
  assignedWriterId: string | null;
  assignedWriterName: string | null;
  assignedProducerId: string | null;
  assignedProducerName: string | null;
  assignedPresenterId: string | null;
  assignedPresenterName: string | null;
  assignedEditorId: string | null;
  assignedEditorName: string | null;
  scriptBody: string;
  shootNote: string;
  presentNote: string;
  editNote: string;
  cutLink: string;
  proposedTitle: string;
  thumbnailNote: string;
  uploadedFacebook: boolean;
  uploadedYoutube: boolean;
  producerDone: boolean;
  presenterDone: boolean;
  returnReason: string;
  createdAt: string;
  updatedAt: string;
};

export type PieceEvent = {
  id: string;
  at: string;
  actorName: string;
  action: string;
  detail: string;
};

export function isRoleId(value: string): value is RoleId {
  return (ROLE_IDS as readonly string[]).includes(value);
}

export function isStageId(value: string): value is StageId {
  return (STAGE_IDS as readonly string[]).includes(value);
}

export function sheetStatus(piece: Piece): string {
  if (piece.stage === "published") return "আপলোড ডান";
  if (piece.stage === "upload") return "রিভিউ ডান";
  if (piece.stage === "cut_review") return "এডিট ডান";
  if (piece.stage === "editing" || piece.stage === "shooting") return "স্ক্রিপ্ট ডান";
  return "চলমান";
}
