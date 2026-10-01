import { Link } from "@tanstack/react-router";
import { ArrowRight, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ROLES, STAGES } from "@/lib/press/catalog";
import { canPassGate, deskForPiece, inRoleQueue, lockReason } from "@/lib/press/gates";
import type { Member, Piece, RoleId } from "@/lib/press/types";
import { cn } from "@/lib/utils";

function previewFor(piece: Piece, role: RoleId | null) {
  if (!role) return piece.topicNote;
  switch (role) {
    case "writer":
    case "script_editor":
    case "producer":
    case "presenter":
      return piece.scriptBody || piece.topicNote;
    case "video_editor":
      return piece.shootNote || piece.editNote || piece.topicNote;
    case "planning_editor":
      return piece.editNote || piece.cutLink || piece.topicNote;
    case "social": {
      const marks = [
        piece.uploadedFacebook ? "ফেসবুক হয়েছে" : "ফেসবুক বাকি",
        piece.uploadedYoutube ? "ইউটিউব হয়েছে" : "ইউটিউব বাকি",
      ].join(" · ");
      return piece.proposedTitle ? `${piece.proposedTitle} — ${marks}` : marks;
    }
    default:
      return piece.topicNote;
  }
}

export function PieceCard({
  piece,
  role,
  viewer,
  compact = false,
}: {
  piece: Piece;
  role: RoleId | null;
  viewer: Member | null;
  compact?: boolean;
}) {
  const mine = role ? inRoleQueue(piece, role, viewer) : false;
  const open = canPassGate(piece, role, viewer);
  const next = deskForPiece(piece);
  const reason = lockReason(piece, role, viewer);

  return (
    <Link
      to="/p/$id"
      params={{ id: piece.id }}
      className={cn(
        "block rounded-2xl bg-card p-4 shadow-[var(--shadow-border)] transition-shadow duration-150 hover:shadow-[var(--shadow-border-hover)]",
        open && "ring-1 ring-primary/35",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-pretty text-sm font-medium leading-snug">
          {piece.title}
        </h3>
        {mine ? (
          <Badge>আপনার কিউ</Badge>
        ) : open ? (
          <Badge>গেট খোলা</Badge>
        ) : viewer?.isAdmin ? null : (
          <Badge variant="lock">
            <Lock className="mr-1 size-3" />
            তালা
          </Badge>
        )}
      </div>
      <p className="mt-1.5 text-xs leading-snug text-muted-foreground">
        শুরু: {piece.pitchedByName || "—"} · রাইটার:{" "}
        {piece.assignedWriterName || "অ্যাসাইন হয়নি"}
        {piece.assignedPresenterName
          ? ` · প্রেজেন্টার: ${piece.assignedPresenterName}`
          : ""}
      </p>
      {compact ? null : (
        <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
          {previewFor(piece, role)}
        </p>
      )}
      <div className="mt-3 flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>{STAGES[piece.stage].label}</span>
        {next ? (
          <span className="inline-flex items-center gap-1">
            {ROLES[next].label}
            <ArrowRight className="size-3" />
          </span>
        ) : (
          <span>শেষ</span>
        )}
      </div>
      {reason && !open ? (
        <p className="mt-2 line-clamp-2 text-xs leading-snug text-muted-foreground">
          {reason}
        </p>
      ) : null}
    </Link>
  );
}
