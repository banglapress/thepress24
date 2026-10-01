import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PIPELINE_STAGES, ROLES, STAGES } from "@/lib/press/catalog";
import { canPassGate, deskForPiece } from "@/lib/press/gates";
import {
  approveCut,
  approveScript,
  getPiece,
  listRoleMembers,
  markPresent,
  markShoot,
  markUpload,
  rejectCut,
  rejectScript,
  saveCut,
  saveScript,
  submitCut,
  submitScript,
} from "@/lib/press/server";
import type { Member, Piece, RoleId } from "@/lib/press/types";
import { cn } from "@/lib/utils";

function errMsg(error: unknown) {
  return error instanceof Error ? error.message : "কাজটি সম্পন্ন হয়নি";
}

function usePieceMutations(id: string) {
  const queryClient = useQueryClient();
  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["piece", id] });
    void queryClient.invalidateQueries({ queryKey: ["pieces"] });
    void queryClient.invalidateQueries({ queryKey: ["my-report"] });
  };
  const fail = (error: unknown) => toast.error(errMsg(error));
  const saveScriptMut = useMutation({
    mutationFn: (scriptBody: string) => saveScript({ data: { id, scriptBody } }),
    onSuccess: () => {
      toast.success("খসড়া সেভ হয়েছে");
      invalidate();
    },
    onError: fail,
  });
  const submitScriptMut = useMutation({
    mutationFn: (scriptBody: string) => submitScript({ data: { id, scriptBody } }),
    onSuccess: () => {
      toast.success("স্ক্রিপ্ট এডিটরের গেটে গেছে");
      invalidate();
    },
    onError: fail,
  });
  const approveScriptMut = useMutation({
    mutationFn: (input: { producerId: string; presenterId: string }) =>
      approveScript({ data: { id, ...input } }),
    onSuccess: () => {
      toast.success("প্রোডাকশন ফোল্ডারে");
      invalidate();
    },
    onError: fail,
  });
  const rejectScriptMut = useMutation({
    mutationFn: (reason: string) => rejectScript({ data: { id, reason } }),
    onSuccess: () => {
      toast.success("রাইটারের ডেস্কে ফিরেছে");
      invalidate();
    },
    onError: fail,
  });
  const markShootMut = useMutation({
    mutationFn: (shootNote: string) => markShoot({ data: { id, shootNote } }),
    onSuccess: () => {
      toast.success("শুট ডান");
      invalidate();
    },
    onError: fail,
  });
  const markPresentMut = useMutation({
    mutationFn: (presentNote: string) =>
      markPresent({ data: { id, presentNote } }),
    onSuccess: () => {
      toast.success("প্রেজেন্টেশন ডান");
      invalidate();
    },
    onError: fail,
  });
  const saveCutMut = useMutation({
    mutationFn: (input: { cutLink: string; editNote: string }) =>
      saveCut({ data: { id, ...input } }),
    onSuccess: () => {
      toast.success("কাট নোট সেভ");
      invalidate();
    },
    onError: fail,
  });
  const submitCutMut = useMutation({
    mutationFn: (input: { cutLink: string; editNote: string }) =>
      submitCut({ data: { id, ...input } }),
    onSuccess: () => {
      toast.success("ভিডিও রিভিউয়ের গেটে");
      invalidate();
    },
    onError: fail,
  });
  const approveCutMut = useMutation({
    mutationFn: (input: { proposedTitle: string; thumbnailNote: string }) =>
      approveCut({ data: { id, ...input } }),
    onSuccess: () => {
      toast.success("আপলোড কিউ খুলেছে");
      invalidate();
    },
    onError: fail,
  });
  const rejectCutMut = useMutation({
    mutationFn: (reason: string) => rejectCut({ data: { id, reason } }),
    onSuccess: () => {
      toast.success("এডিটরে ফেরত");
      invalidate();
    },
    onError: fail,
  });
  const markUploadMut = useMutation({
    mutationFn: (channel: "facebook" | "youtube") =>
      markUpload({ data: { id, channel } }),
    onSuccess: () => {
      toast.success("আপলোড মার্ক");
      invalidate();
    },
    onError: fail,
  });
  return {
    saveScript: saveScriptMut,
    submitScript: submitScriptMut,
    approveScript: approveScriptMut,
    rejectScript: rejectScriptMut,
    markShoot: markShootMut,
    markPresent: markPresentMut,
    saveCut: saveCutMut,
    submitCut: submitCutMut,
    approveCut: approveCutMut,
    rejectCut: rejectCutMut,
    markUpload: markUploadMut,
  };
}

function ReturnBox({
  onSubmit,
  pending,
}: {
  onSubmit: (reason: string) => void;
  pending: boolean;
}) {
  const [reason, setReason] = useState("");
  return (
    <form
      className="space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(reason);
      }}
    >
      <Label htmlFor="reason">ফেরতের কারণ</Label>
      <Textarea
        id="reason"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="কী বদলাতে হবে"
        required
      />
      <p className="text-xs text-muted-foreground">
        কারণটি লিখে তারপর গেট থেকে ফেরত পাঠান।
      </p>
      <Button type="submit" variant="destructive" disabled={pending}>
        ফেরত পাঠান
      </Button>
    </form>
  );
}

function RoleSelect({
  role,
  label,
  empty,
  value,
  onChange,
}: {
  role: RoleId;
  label: string;
  empty: string;
  value: string;
  onChange: (id: string) => void;
}) {
  const members = useQuery({
    queryKey: ["crew", role],
    queryFn: () => listRoleMembers({ data: role }),
  });
  if (members.isLoading) {
    return <p className="text-sm text-muted-foreground">{label} তালিকা আসছে…</p>;
  }
  const list = members.data ?? [];
  if (list.length === 0) {
    return <p className="text-sm text-muted-foreground">{empty}</p>;
  }
  return (
    <div>
      <Label htmlFor={`crew-${role}`}>{label}</Label>
      <select
        id={`crew-${role}`}
        className="mt-2 flex h-11 w-full rounded-md border border-input bg-card px-3 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">{label} বেছে দিন</option>
        {list.map((m) => (
          <option key={m.userId} value={m.userId}>
            {m.displayName}
          </option>
        ))}
      </select>
    </div>
  );
}

function StageActions({
  piece,
  member,
}: {
  piece: Piece;
  member: Member;
}) {
  const mut = usePieceMutations(piece.id);
  const [writerId, setWriterId] = useState(piece.assignedWriterId ?? "");
  const [producerId, setProducerId] = useState(piece.assignedProducerId ?? "");
  const [presenterId, setPresenterId] = useState(piece.assignedPresenterId ?? "");
  const [script, setScript] = useState(piece.scriptBody);
  const [shootNote, setShootNote] = useState(piece.shootNote);
  const [presentNote, setPresentNote] = useState(piece.presentNote);
  const [cutLink, setCutLink] = useState(piece.cutLink);
  const [editNote, setEditNote] = useState(piece.editNote);
  const [proposedTitle, setProposedTitle] = useState(piece.proposedTitle);
  const [thumb, setThumb] = useState(piece.thumbnailNote);
  const open = canPassGate(piece, member.role, member);

  if (piece.stage === "published") {
    return (
      <div className="rounded-2xl bg-card p-4 shadow-[var(--shadow-border)]">
        <p className="font-medium">দুই চ্যানেলেই প্রকাশিত। পাইপলাইন শেষ।</p>
      </div>
    );
  }

  if (piece.stage === "shooting") {
    const canShoot =
      (member.isAdmin || member.role === "producer") &&
      !piece.producerDone &&
      (member.isAdmin ||
        !piece.assignedProducerId ||
        piece.assignedProducerId === member.userId);
    const canPresent =
      (member.isAdmin || member.role === "presenter") &&
      !piece.presenterDone &&
      (member.isAdmin ||
        !piece.assignedPresenterId ||
        piece.assignedPresenterId === member.userId);
    return (
      <div className="space-y-4">
        <div className="rounded-2xl bg-card p-4 shadow-[var(--shadow-border)]">
          <h2 className="font-serif text-lg font-semibold">শুট ও প্রেজেন্টেশন</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            প্রোডিউসার ও প্রেজেন্টার দুজনেই ডান করলেই ভিডিও এডিটরের কিউ খুলবে।
          </p>
          <ul className="mt-3 space-y-1 text-sm">
            <li>
              প্রোডিউসার: {piece.assignedProducerName || "অ্যাসাইন হয়নি"} —{" "}
              {piece.producerDone ? "ডান" : "বাকি"}
            </li>
            <li>
              প্রেজেন্টার: {piece.assignedPresenterName || "অ্যাসাইন হয়নি"} —{" "}
              {piece.presenterDone ? "ডান" : "বাকি"}
            </li>
          </ul>
        </div>
        {canShoot ? (
          <div className="space-y-3 rounded-2xl bg-card p-4 shadow-[var(--shadow-border)]">
            <h3 className="font-serif text-lg font-semibold">শুট</h3>
            {piece.scriptBody ? (
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                {piece.scriptBody}
              </p>
            ) : null}
            <Label htmlFor="shoot">শুট নোট</Label>
            <Textarea
              id="shoot"
              value={shootNote}
              onChange={(e) => setShootNote(e.target.value)}
              placeholder="লোকেশন, শট, সমস্যা…"
            />
            <Button
              disabled={mut.markShoot.isPending}
              onClick={() => mut.markShoot.mutate(shootNote)}
            >
              শুট ডান
            </Button>
          </div>
        ) : null}
        {canPresent ? (
          <div className="space-y-3 rounded-2xl bg-card p-4 shadow-[var(--shadow-border)]">
            <h3 className="font-serif text-lg font-semibold">প্রেজেন্টেশন</h3>
            {piece.scriptBody ? (
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                {piece.scriptBody}
              </p>
            ) : null}
            <Label htmlFor="present">প্রেজেন্ট নোট</Label>
            <Textarea
              id="present"
              value={presentNote}
              onChange={(e) => setPresentNote(e.target.value)}
              placeholder="টেক, টেক, যা বাকি"
            />
            <Button
              disabled={mut.markPresent.isPending}
              onClick={() => mut.markPresent.mutate(presentNote)}
            >
              প্রেজেন্টেশন ডান
            </Button>
          </div>
        ) : null}
        {!canShoot && !canPresent ? (
          <div className="rounded-2xl bg-muted/60 p-4 text-sm text-muted-foreground">
            দুজনের কাজ শেষ হলে এডিটিং কিউ খুলবে।
          </div>
        ) : null}
      </div>
    );
  }

  if (!open) {
    return (
      <div className="rounded-2xl bg-muted/60 p-4 text-sm text-muted-foreground">
        পাইপলাইন রোল ছাড়া এই ধাপ পাস করা যাবে না। রোল অপেক্ষমান থাকলেও বিষয় পাঠাতে পারেন।
      </div>
    );
  }

  if (piece.stage === "scripting") {
    const isWriter =
      member.isAdmin ||
      (member.role === "writer" && piece.assignedWriterId === member.userId);
    if (!isWriter) {
      return (
        <div className="rounded-2xl bg-muted/60 p-4 text-sm text-muted-foreground">
          এই স্ক্রিপ্টটি নির্ধারিত রাইটারের কিউ।
        </div>
      );
    }
    return (
      <div className="space-y-3 rounded-2xl bg-card p-4 shadow-[var(--shadow-border)]">
        <div>
          <h2 className="font-serif text-lg font-semibold">স্ক্রিপ্ট</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            এখানেই লেখা, এখান থেকেই স্ক্রিপ্ট রিভিউতে জমা দিন।
          </p>
        </div>
        <Textarea
          value={script}
          onChange={(e) => setScript(e.target.value)}
          placeholder="হুক, বডি, সিটিএ…"
          className="min-h-48"
        />
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            disabled={mut.saveScript.isPending}
            onClick={() => mut.saveScript.mutate(script)}
          >
            খসড়া সেভ
          </Button>
          <Button
            disabled={mut.submitScript.isPending}
            onClick={() => mut.submitScript.mutate(script)}
          >
            এডিটরের কাছে জমা
          </Button>
        </div>
      </div>
    );
  }

  if (piece.stage === "script_review") {
    return (
      <div className="space-y-4 rounded-2xl bg-card p-4 shadow-[var(--shadow-border)]">
        <h2 className="font-serif text-lg font-semibold">স্ক্রিপ্ট রিভিউ</h2>
        <p className="whitespace-pre-wrap text-sm leading-relaxed">
          {piece.scriptBody || "স্ক্রিপ্ট খালি"}
        </p>
        <p className="text-sm text-muted-foreground">
          পাস করতে প্রোডিউসার ও প্রেজেন্টার দুজনকেই অ্যাসাইন করতে হবে। দুজনে ডান করলেই এডিটিং কিউ খুলবে।
        </p>
        <RoleSelect
          role="producer"
          label="প্রোডিউসার"
          empty="অ্যাডমিনকে প্রোডিউসার রোল দিতে বলুন।"
          value={producerId}
          onChange={setProducerId}
        />
        <RoleSelect
          role="presenter"
          label="প্রেজেন্টার"
          empty="অ্যাডমিনকে প্রেজেন্টার রোল দিতে বলুন।"
          value={presenterId}
          onChange={setPresenterId}
        />
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={!producerId || !presenterId || mut.approveScript.isPending}
            onClick={() =>
              mut.approveScript.mutate({ producerId, presenterId })
            }
          >
            অনুমোদন — প্রোডাকশনে
          </Button>
        </div>
        <ReturnBox
          pending={mut.rejectScript.isPending}
          onSubmit={(reason) => mut.rejectScript.mutate(reason)}
        />
      </div>
    );
  }

  if (piece.stage === "editing") {
    return (
      <div className="space-y-3 rounded-2xl bg-card p-4 shadow-[var(--shadow-border)]">
        <h2 className="font-serif text-lg font-semibold">এডিটিং ও কাট</h2>
        <div>
          <Label htmlFor="cut">কাট লিংক</Label>
          <Input
            id="cut"
            className="mt-2"
            value={cutLink}
            onChange={(e) => setCutLink(e.target.value)}
            placeholder="drive বা এডিট ফোল্ডার পাথ"
          />
        </div>
        <div>
          <Label htmlFor="edit">এডিট নোট</Label>
          <Textarea
            id="edit"
            className="mt-2"
            value={editNote}
            onChange={(e) => setEditNote(e.target.value)}
            placeholder="দৈর্ঘ্য, হুক, যা বাকি"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            disabled={mut.saveCut.isPending}
            onClick={() => mut.saveCut.mutate({ cutLink, editNote })}
          >
            নোট সেভ
          </Button>
          <Button
            disabled={mut.submitCut.isPending}
            onClick={() => mut.submitCut.mutate({ cutLink, editNote })}
          >
            রিভিউতে পাঠান
          </Button>
        </div>
      </div>
    );
  }

  if (piece.stage === "cut_review") {
    return (
      <div className="space-y-3 rounded-2xl bg-card p-4 shadow-[var(--shadow-border)]">
        <div>
          <h2 className="font-serif text-lg font-semibold">ভিডিও রিভিউ</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            নিচে শিরোনাম ও থাম্বনেইল ছাড়া পাস করা যাবে না। ভিডিও রিভিউ শিরোনাম ও থাম্বনেইল দিয়ে গেট খোলেন। সোশ্যাল ম্যানেজার আগে আপলোড করতে পারবেন না।
          </p>
        </div>
        <div>
          <Label htmlFor="ptitle">প্রস্তাবিত শিরোনাম</Label>
          <Input
            id="ptitle"
            className="mt-2"
            value={proposedTitle}
            onChange={(e) => setProposedTitle(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="thumb">থাম্বনেইল নির্দেশনা</Label>
          <Textarea
            id="thumb"
            className="mt-2"
            value={thumb}
            onChange={(e) => setThumb(e.target.value)}
          />
        </div>
        <Button
          disabled={mut.approveCut.isPending}
          onClick={() =>
            mut.approveCut.mutate({
              proposedTitle,
              thumbnailNote: thumb,
            })
          }
        >
          পাস — আপলোড কিউ
        </Button>
        <ReturnBox
          pending={mut.rejectCut.isPending}
          onSubmit={(reason) => mut.rejectCut.mutate(reason)}
        />
      </div>
    );
  }

  if (piece.stage === "upload") {
    return (
      <div className="space-y-3 rounded-2xl bg-card p-4 shadow-[var(--shadow-border)]">
        <h2 className="font-serif text-lg font-semibold">আপলোড</h2>
        {piece.proposedTitle ? (
          <p className="text-sm">{piece.proposedTitle}</p>
        ) : (
          <p className="text-sm text-muted-foreground">
            থাম্বনেইল এখনো লক — ভিডিও রিভিউ না খুললে সোশ্যাল দেখবে না।
          </p>
        )}
        {piece.thumbnailNote ? (
          <p className="text-sm text-muted-foreground">{piece.thumbnailNote}</p>
        ) : null}
        <p className="text-sm text-muted-foreground">
          ভিডিও রিভিউ পাস না করা পর্যন্ত আপলোড মার্ক করা যাবে না।
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={piece.uploadedFacebook ? "secondary" : "outline"}
            disabled={piece.uploadedFacebook || mut.markUpload.isPending}
            onClick={() => mut.markUpload.mutate("facebook")}
          >
            ফেসবুক {piece.uploadedFacebook ? "হয়েছে" : "বাকি"}
          </Button>
          <Button
            variant={piece.uploadedYoutube ? "secondary" : "outline"}
            disabled={piece.uploadedYoutube || mut.markUpload.isPending}
            onClick={() => mut.markUpload.mutate("youtube")}
          >
            ইউটিউব {piece.uploadedYoutube ? "হয়েছে" : "বাকি"}
          </Button>
        </div>
      </div>
    );
  }

  return null;
}

export function PiecePage({
  id,
  member,
}: {
  id: string;
  member: Member;
}) {
  const query = useQuery({
    queryKey: ["piece", id],
    queryFn: () => getPiece({ data: id }),
  });

  if (query.isLoading) {
    return (
      <div className="space-y-3">
        <div className="h-10 animate-pulse rounded-xl bg-muted" />
        <div className="h-40 animate-pulse rounded-2xl bg-muted" />
      </div>
    );
  }
  if (query.isError || !query.data) {
    return (
      <p className="text-sm text-destructive">
        {query.error instanceof Error ? query.error.message : "আইটেম নেই"}
      </p>
    );
  }

  const { piece, events } = query.data;
  const desk = deskForPiece(piece);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {member.isAdmin ? (
          <Link to="/admin" className="text-sm text-muted-foreground hover:text-foreground">
            অ্যাডমিনে ফিরুন
          </Link>
        ) : member.role ? (
          <Link
            to="/desk/$role"
            params={{ role: member.role }}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ডেস্কে ফিরুন
          </Link>
        ) : (
          <Link to="/pending" className="text-sm text-muted-foreground hover:text-foreground">
            ফিরুন
          </Link>
        )}
        <span className="rounded-full bg-muted px-3 py-1 text-xs">
          {STAGES[piece.stage].label}
        </span>
      </div>
      <div>
        <h1 className="font-serif text-2xl font-semibold tracking-tight sm:text-3xl">
          {piece.title}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          তৈরি করেছেন: {piece.pitchedByName} · রাইটার: {piece.assignedWriterName || "অ্যাসাইন হয়নি"}
          {" · "}প্রেজেন্টার: {piece.assignedPresenterName || "অ্যাসাইন হয়নি"}
          {" · "}এডিটর: {piece.assignedEditorName || "অ্যাসাইন হয়নি"}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          এখন কার ডেস্ক: {desk ? ROLES[desk].label : "শেষ"}
        </p>
      </div>
      {piece.topicNote ? (
        <p className="max-w-2xl text-sm leading-relaxed">{piece.topicNote}</p>
      ) : null}
      <ol className="flex flex-wrap gap-1.5">
        {PIPELINE_STAGES.map((stage) => (
          <li
            key={stage}
            className={cn(
              "rounded-full px-2.5 py-1 text-xs",
              piece.stage === stage
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground",
            )}
          >
            {STAGES[stage].label}
          </li>
        ))}
      </ol>
      <StageActions piece={piece} member={member} />
      <section className="rounded-2xl bg-card p-4 shadow-[var(--shadow-border)]">
        <h2 className="font-serif text-lg font-semibold">অডিট</h2>
        {events.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">এখনো কোনো ধাপ হয়নি।</p>
        ) : (
          <ol className="mt-3 space-y-2">
            {events.map((event) => (
              <li key={event.id} className="text-sm">
                <span className="font-medium">{event.action}</span>
                <span className="text-muted-foreground"> · {event.actorName}</span>
                {event.detail ? (
                  <p className="text-xs text-muted-foreground">{event.detail}</p>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
