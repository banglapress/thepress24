import { ROLE_GATE_STAGE, ROLES } from "./catalog";
import type { Member, Piece, RoleId, StageId } from "./types";

export function deskForStage(stage: StageId): RoleId | null {
  switch (stage) {
    case "scripting":
      return "writer";
    case "script_review":
      return "script_editor";
    case "shooting":
      return "producer";
    case "editing":
      return "video_editor";
    case "cut_review":
      return "planning_editor";
    case "upload":
      return "social";
    case "published":
      return null;
  }
}

export function deskForPiece(piece: Piece): RoleId | null {
  if (piece.stage === "shooting") {
    if (!piece.producerDone) return "producer";
    if (!piece.presenterDone) return "presenter";
    return "video_editor";
  }
  return deskForStage(piece.stage);
}

function assignedTo(
  assignedId: string | null,
  viewer: Pick<Member, "userId" | "isAdmin"> | null,
) {
  if (viewer?.isAdmin) return true;
  if (!assignedId) return true;
  return !!viewer?.userId && assignedId === viewer.userId;
}

export function inRoleQueue(
  piece: Piece,
  role: RoleId,
  viewer: Pick<Member, "userId" | "isAdmin"> | null,
): boolean {
  if (role === "writer") {
    if (piece.stage !== "scripting") return false;
    if (viewer?.isAdmin) return true;
    return !!viewer?.userId && piece.assignedWriterId === viewer.userId;
  }
  if (role === "planning_editor") {
    return piece.stage === "cut_review";
  }
  if (role === "producer") {
    return (
      piece.stage === "shooting" &&
      !piece.producerDone &&
      assignedTo(piece.assignedProducerId, viewer)
    );
  }
  if (role === "presenter") {
    return (
      piece.stage === "shooting" &&
      !piece.presenterDone &&
      assignedTo(piece.assignedPresenterId, viewer)
    );
  }
  if (role === "video_editor") {
    if (piece.stage !== "editing") return false;
    return assignedTo(piece.assignedEditorId, viewer);
  }
  const gate = ROLE_GATE_STAGE[role];
  return gate !== null && piece.stage === gate;
}

export function canPassGate(
  piece: Piece,
  role: RoleId | null,
  viewer: Pick<Member, "userId" | "isAdmin"> | null,
): boolean {
  if (viewer?.isAdmin) return true;
  if (!role || !viewer) return false;
  return inRoleQueue(piece, role, viewer);
}

export function lockReason(
  piece: Piece,
  role: RoleId | null,
  viewer: Pick<Member, "userId" | "isAdmin"> | null,
): string | null {
  if (canPassGate(piece, role, viewer)) return null;
  if (role === "writer" && piece.stage === "scripting") {
    if (piece.assignedWriterId && piece.assignedWriterId !== viewer?.userId) {
      return `এটি ${piece.assignedWriterName || "অন্য রাইটার"}-এর কিউ।`;
    }
  }
  if (role === "producer" && piece.stage === "shooting" && piece.producerDone) {
    return "আপনার শুট ডান। প্রেজেন্টার শেষ করলে এডিটিং কিউ খুলবে।";
  }
  if (role === "presenter" && piece.stage === "shooting" && piece.presenterDone) {
    return "আপনার প্রেজেন্টেশন ডান। প্রোডিউসার শেষ করলে এডিটিং কিউ খুলবে।";
  }
  if (role === "producer" && piece.stage === "shooting" && piece.assignedProducerId) {
    return `এটি ${piece.assignedProducerName || "অন্য প্রোডিউসার"}-এর কিউ।`;
  }
  if (role === "presenter" && piece.stage === "shooting" && piece.assignedPresenterId) {
    return `এটি ${piece.assignedPresenterName || "অন্য প্রেজেন্টার"}-এর কিউ।`;
  }
  const desk = deskForPiece(piece);
  if (desk) {
    if (desk === role) return null;
    return `এখন ${ROLES[desk].label} কাজ করবেন। আপনি এই ধাপ পাস করতে পারবেন না।`;
  }
  return "এই আইটেম প্রকাশিত। আর কোনো ধাপ বাকি নেই।";
}

export class GateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GateError";
  }
}
