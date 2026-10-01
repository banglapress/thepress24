import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { isRoleId, isStageId, type Member, type Piece, type PieceEvent, type RoleId } from "./types";
import { GateError, canPassGate } from "./gates";
import { monthStartIso, nextMonthStartIso } from "./dates";

type Sql = Awaited<ReturnType<typeof getSql>>;

type MemberRow = {
  user_id: string;
  email: string | null;
  display_name: string;
  role: string | null;
  is_admin: boolean;
};

type PieceRow = {
  id: string;
  title: string;
  topic_note: string;
  stage: string;
  pitched_by_user_id: string;
  pitched_by_name: string;
  assigned_writer_id: string | null;
  assigned_writer_name: string | null;
  assigned_producer_id: string | null;
  assigned_producer_name: string | null;
  assigned_presenter_id: string | null;
  assigned_presenter_name: string | null;
  assigned_editor_id: string | null;
  assigned_editor_name: string | null;
  script_body: string;
  shoot_note: string;
  present_note: string;
  edit_note: string;
  cut_link: string;
  proposed_title: string;
  thumbnail_note: string;
  uploaded_facebook: boolean;
  uploaded_youtube: boolean;
  producer_done: boolean;
  presenter_done: boolean;
  return_reason: string;
  created_at: string;
  updated_at: string;
};

type EventRow = {
  id: string;
  at: string;
  actor_name: string;
  action: string;
  detail: string;
};

type AuthUserRow = { id: string; name: string; email: string };

function asBool(value: unknown): boolean {
  return value === true || value === "t" || value === "true" || value === 1;
}

function mapMember(row: MemberRow): Member {
  return {
    userId: row.user_id,
    email: row.email,
    displayName: row.display_name,
    role: row.role && isRoleId(row.role) ? row.role : null,
    isAdmin: asBool(row.is_admin),
  };
}

function mapPiece(row: PieceRow): Piece {
  const stage = isStageId(row.stage) ? row.stage : "scripting";
  return {
    id: row.id,
    title: row.title,
    topicNote: row.topic_note ?? "",
    stage,
    pitchedByUserId: row.pitched_by_user_id,
    pitchedByName: row.pitched_by_name,
    assignedWriterId: row.assigned_writer_id,
    assignedWriterName: row.assigned_writer_name,
    assignedProducerId: row.assigned_producer_id,
    assignedProducerName: row.assigned_producer_name,
    assignedPresenterId: row.assigned_presenter_id,
    assignedPresenterName: row.assigned_presenter_name,
    assignedEditorId: row.assigned_editor_id,
    assignedEditorName: row.assigned_editor_name,
    scriptBody: row.script_body ?? "",
    shootNote: row.shoot_note ?? "",
    presentNote: row.present_note ?? "",
    editNote: row.edit_note ?? "",
    cutLink: row.cut_link ?? "",
    proposedTitle: row.proposed_title ?? "",
    thumbnailNote: row.thumbnail_note ?? "",
    uploadedFacebook: asBool(row.uploaded_facebook),
    uploadedYoutube: asBool(row.uploaded_youtube),
    producerDone: asBool(row.producer_done),
    presenterDone: asBool(row.presenter_done),
    returnReason: row.return_reason ?? "",
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

async function loadAuthUser(sql: Sql, userId: string) {
  const rows = await sql<AuthUserRow>`
    select id, name, email from "user" where id = ${userId} limit 1
  `;
  return rows[0] ?? { id: userId, name: "সদস্য", email: "" };
}

async function ensureMember(sql: Sql, userId: string): Promise<Member> {
  const authUser = await loadAuthUser(sql, userId);
  const existing = await sql<MemberRow>`
    select user_id, email, display_name, role, is_admin
    from members where user_id = ${userId} limit 1
  `;
  if (existing[0]) {
    const displayName = authUser.name || existing[0].display_name;
    const email = authUser.email || existing[0].email;
    if (displayName !== existing[0].display_name || email !== existing[0].email) {
      await sql`
        update members
        set display_name = ${displayName}, email = ${email}
        where user_id = ${userId}
      `;
    }
    return mapMember({
      ...existing[0],
      display_name: displayName,
      email,
    });
  }

  const countRows = await sql<{ n: number }>`select count(*)::int as n from members`;
  const isFirst = (countRows[0]?.n ?? 0) === 0;
  const displayName = authUser.name || authUser.email || "সদস্য";
  await sql`
    insert into members (user_id, email, display_name, role, is_admin)
    values (${userId}, ${authUser.email || null}, ${displayName}, ${null}, ${isFirst})
  `;
  return {
    userId,
    email: authUser.email || null,
    displayName,
    role: null,
    isAdmin: isFirst,
  };
}

async function loadPiece(sql: Sql, id: string): Promise<Piece> {
  const rows = await sql<PieceRow>`select * from pieces where id = ${id} limit 1`;
  if (!rows[0]) throw new GateError("আইটেম নেই");
  return mapPiece(rows[0]);
}

async function addEvent(
  sql: Sql,
  pieceId: string,
  member: Member,
  action: string,
  detail = "",
) {
  await sql`
    insert into piece_events (id, piece_id, actor_user_id, actor_name, action, detail)
    values (${crypto.randomUUID()}, ${pieceId}, ${member.userId}, ${member.displayName}, ${action}, ${detail})
  `;
}

function assertPass(piece: Piece, member: Member, roleHint: RoleId | null) {
  const role = member.isAdmin ? roleHint ?? member.role : member.role;
  if (!canPassGate(piece, role, member) && !member.isAdmin) {
    throw new GateError("পাইপলাইন রোল ছাড়া ধাপ পাস করা যাবে না");
  }
}

export const getMe = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    return ensureMember(sql, context.userId);
  });

export const listMembers = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    await ensureMember(sql, context.userId);
    const rows = await sql<MemberRow>`
      select user_id, email, display_name, role, is_admin
      from members
      order by is_admin desc, display_name
    `;
    return rows.map(mapMember);
  });

export const listWriters = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    await ensureMember(sql, context.userId);
    const rows = await sql<MemberRow>`
      select user_id, email, display_name, role, is_admin
      from members
      where role = 'writer'
      order by display_name
    `;
    return rows.map(mapMember);
  });

export const listRoleMembers = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((role: string) => role)
  .handler(async ({ context, data: role }) => {
    if (!isRoleId(role)) return [];
    const sql = await getSql();
    await ensureMember(sql, context.userId);
    const rows = await sql<MemberRow>`
      select user_id, email, display_name, role, is_admin
      from members
      where role = ${role}
      order by display_name
    `;
    return rows.map(mapMember);
  });

export const listPieces = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    await ensureMember(sql, context.userId);
    const rows = await sql<PieceRow>`
      select * from pieces
      order by updated_at desc
    `;
    return rows.map(mapPiece);
  });

export const getPiece = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((id: string) => id)
  .handler(async ({ context, data: id }) => {
    const sql = await getSql();
    await ensureMember(sql, context.userId);
    const piece = await loadPiece(sql, id);
    const events = await sql<EventRow>`
      select id, at, actor_name, action, detail
      from piece_events
      where piece_id = ${id}
      order by at asc
    `;
    const mapped: PieceEvent[] = events.map((e) => ({
      id: e.id,
      at: String(e.at),
      actorName: e.actor_name,
      action: e.action,
      detail: e.detail ?? "",
    }));
    return { piece, events: mapped };
  });

export const setMemberRole = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { userId: string; role: string | null }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const me = await ensureMember(sql, context.userId);
    if (!me.isAdmin) throw new GateError("শুধু অ্যাডমিন রোল দিতে পারেন");
    const role = data.role && isRoleId(data.role) ? data.role : null;
    await sql`
      update members set role = ${role} where user_id = ${data.userId}
    `;
    return { ok: true };
  });

export const setMemberAdmin = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { userId: string; isAdmin: boolean }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const me = await ensureMember(sql, context.userId);
    if (!me.isAdmin) throw new GateError("শুধু অ্যাডমিন অন্য অ্যাডমিন নিয়োগ দিতে পারেন");
    if (!data.isAdmin) {
      const counts = await sql<{ n: number }>`
        select count(*)::int as n from members where is_admin = true
      `;
      const target = await sql<MemberRow>`
        select user_id, email, display_name, role, is_admin
        from members where user_id = ${data.userId} limit 1
      `;
      if (asBool(target[0]?.is_admin) && (counts[0]?.n ?? 0) <= 1) {
        throw new GateError("শেষ অ্যাডমিনকে নামানো যাবে না");
      }
    }
    await sql`
      update members set is_admin = ${data.isAdmin} where user_id = ${data.userId}
    `;
    return { ok: true };
  });

export const createScript = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { title: string; topicNote: string }) => input)
  .handler(async ({ context, data }) => {
    const title = data.title.trim();
    if (!title) throw new GateError("শিরোনাম লাগবে");
    const sql = await getSql();
    const me = await ensureMember(sql, context.userId);
    if (!me.isAdmin && me.role !== "writer") {
      throw new GateError("নতুন স্ক্রিপ্ট শুরু করতে স্ক্রিপ্ট রাইটার রোল লাগবে");
    }
    const id = crypto.randomUUID();
    await sql`
      insert into pieces (
        id, title, topic_note, stage, pitched_by_user_id, pitched_by_name,
        assigned_writer_id, assigned_writer_name
      ) values (
        ${id}, ${title}, ${data.topicNote.trim()}, ${"scripting"},
        ${me.userId}, ${me.displayName},
        ${me.userId}, ${me.displayName}
      )
    `;
    await addEvent(sql, id, me, "স্ক্রিপ্ট শুরু", title);
    return { id };
  });

export const saveScript = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string; scriptBody: string }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const me = await ensureMember(sql, context.userId);
    const piece = await loadPiece(sql, data.id);
    if (piece.stage !== "scripting") {
      throw new GateError("স্ক্রিপ্ট এখন খোলা নেই");
    }
    assertPass(piece, me, "writer");
    if (!me.isAdmin && piece.assignedWriterId !== me.userId) {
      throw new GateError("এটি আপনার কিউ নয়");
    }
    await sql`
      update pieces
      set script_body = ${data.scriptBody}, updated_at = now()
      where id = ${data.id}
    `;
    await addEvent(sql, data.id, me, "খসড়া সেভ হয়েছে");
    return { ok: true };
  });

export const submitScript = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string; scriptBody: string }) => input)
  .handler(async ({ context, data }) => {
    const body = data.scriptBody.trim();
    if (!body) throw new GateError("স্ক্রিপ্ট খালি");
    const sql = await getSql();
    const me = await ensureMember(sql, context.userId);
    const piece = await loadPiece(sql, data.id);
    if (piece.stage !== "scripting") {
      throw new GateError("এডিটরে জমা দেওয়া যাবে না");
    }
    assertPass(piece, me, "writer");
    await sql`
      update pieces
      set script_body = ${body}, stage = ${"script_review"}, updated_at = now()
      where id = ${data.id}
    `;
    await addEvent(sql, data.id, me, "স্ক্রিপ্ট এডিটরের গেটে গেছে");
    return { ok: true };
  });

export const approveScript = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string; producerId: string; presenterId: string }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const me = await ensureMember(sql, context.userId);
    const piece = await loadPiece(sql, data.id);
    if (piece.stage !== "script_review") throw new GateError("রিভিউ গেট খোলা নেই");
    if (!me.isAdmin && me.role !== "script_editor") {
      throw new GateError("স্ক্রিপ্ট এডিটর পাস করবেন");
    }
    const producer = await sql<MemberRow>`
      select user_id, email, display_name, role, is_admin
      from members where user_id = ${data.producerId} limit 1
    `;
    const presenter = await sql<MemberRow>`
      select user_id, email, display_name, role, is_admin
      from members where user_id = ${data.presenterId} limit 1
    `;
    if (!producer[0] || producer[0].role !== "producer") {
      throw new GateError("প্রোডিউসার বেছে দিন");
    }
    if (!presenter[0] || presenter[0].role !== "presenter") {
      throw new GateError("প্রেজেন্টার বেছে দিন");
    }
    await sql`
      update pieces
      set stage = ${"shooting"},
          assigned_producer_id = ${producer[0].user_id},
          assigned_producer_name = ${producer[0].display_name},
          assigned_presenter_id = ${presenter[0].user_id},
          assigned_presenter_name = ${presenter[0].display_name},
          producer_done = ${false},
          presenter_done = ${false},
          updated_at = now()
      where id = ${data.id}
    `;
    await addEvent(
      sql,
      data.id,
      me,
      "প্রোডাকশন ফোল্ডারে",
      `${producer[0].display_name} · ${presenter[0].display_name}`,
    );
    return { ok: true };
  });

export const rejectScript = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string; reason: string }) => input)
  .handler(async ({ context, data }) => {
    const reason = data.reason.trim();
    if (!reason) throw new GateError("কারণ ছাড়া গেট খুলবে না");
    const sql = await getSql();
    const me = await ensureMember(sql, context.userId);
    const piece = await loadPiece(sql, data.id);
    if (piece.stage !== "script_review") throw new GateError("ফেরত দেওয়া যাবে না");
    if (!me.isAdmin && me.role !== "script_editor") {
      throw new GateError("স্ক্রিপ্ট এডিটর ফেরত দিবেন");
    }
    await sql`
      update pieces
      set stage = ${"scripting"}, return_reason = ${reason}, updated_at = now()
      where id = ${data.id}
    `;
    await addEvent(sql, data.id, me, "রাইটারের ডেস্কে ফিরেছে", reason);
    return { ok: true };
  });

export const markShoot = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string; shootNote: string }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const me = await ensureMember(sql, context.userId);
    const piece = await loadPiece(sql, data.id);
    if (piece.stage !== "shooting") throw new GateError("শুট কিউ খোলেনি");
    if (piece.producerDone) throw new GateError("শুট ইতিমধ্যে ডান");
    if (!me.isAdmin && me.role !== "producer") {
      throw new GateError("প্রোডিউসার শুট মার্ক করবেন");
    }
    if (!me.isAdmin && piece.assignedProducerId && piece.assignedProducerId !== me.userId) {
      throw new GateError("এটি আপনার কিউ নয়");
    }
    const both = piece.presenterDone;
    const producerId = piece.assignedProducerId || me.userId;
    const producerName = piece.assignedProducerName || me.displayName;
    await sql`
      update pieces
      set shoot_note = ${data.shootNote},
          producer_done = ${true},
          assigned_producer_id = ${producerId},
          assigned_producer_name = ${producerName},
          stage = ${both ? "editing" : "shooting"},
          updated_at = now()
      where id = ${data.id}
    `;
    await addEvent(sql, data.id, me, "শুট ডান");
    if (both) {
      await addEvent(sql, data.id, me, "এডিটিং কিউতে পাঠানো হয়েছে", "প্রেজেন্টারও ডান");
    }
    return { ok: true };
  });

export const markPresent = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string; presentNote: string }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const me = await ensureMember(sql, context.userId);
    const piece = await loadPiece(sql, data.id);
    if (piece.stage !== "shooting") throw new GateError("প্রেজেন্ট কিউ খোলেনি");
    if (piece.presenterDone) throw new GateError("প্রেজেন্টেশন ইতিমধ্যে ডান");
    if (!me.isAdmin && me.role !== "presenter") {
      throw new GateError("প্রেজেন্টার মার্ক করবেন");
    }
    if (!me.isAdmin && piece.assignedPresenterId && piece.assignedPresenterId !== me.userId) {
      throw new GateError("এটি আপনার কিউ নয়");
    }
    const both = piece.producerDone;
    const presenterId = piece.assignedPresenterId || me.userId;
    const presenterName = piece.assignedPresenterName || me.displayName;
    await sql`
      update pieces
      set present_note = ${data.presentNote},
          presenter_done = ${true},
          assigned_presenter_id = ${presenterId},
          assigned_presenter_name = ${presenterName},
          stage = ${both ? "editing" : "shooting"},
          updated_at = now()
      where id = ${data.id}
    `;
    await addEvent(sql, data.id, me, "প্রেজেন্টেশন ডান");
    if (both) {
      await addEvent(sql, data.id, me, "এডিটিং কিউতে পাঠানো হয়েছে", "প্রোডিউসারও ডান");
    }
    return { ok: true };
  });

export const saveCut = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string; cutLink: string; editNote: string }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const me = await ensureMember(sql, context.userId);
    const piece = await loadPiece(sql, data.id);
    if (piece.stage !== "editing") throw new GateError("এডিট কিউ খোলা নেই");
    if (!me.isAdmin && me.role !== "video_editor") {
      throw new GateError("ভিডিও এডিটর নোট সেভ করবেন");
    }
    await sql`
      update pieces
      set cut_link = ${data.cutLink},
          edit_note = ${data.editNote},
          assigned_editor_id = ${piece.assignedEditorId || me.userId},
          assigned_editor_name = ${piece.assignedEditorName || me.displayName},
          updated_at = now()
      where id = ${data.id}
    `;
    await addEvent(sql, data.id, me, "কাট নোট সেভ");
    return { ok: true };
  });

export const submitCut = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string; cutLink: string; editNote: string }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const me = await ensureMember(sql, context.userId);
    const piece = await loadPiece(sql, data.id);
    if (piece.stage !== "editing") throw new GateError("এডিট কিউ খোলা নেই");
    if (!me.isAdmin && me.role !== "video_editor") {
      throw new GateError("ভিডিও এডিটর রিভিউতে পাঠাবেন");
    }
    await sql`
      update pieces
      set cut_link = ${data.cutLink},
          edit_note = ${data.editNote},
          assigned_editor_id = ${piece.assignedEditorId || me.userId},
          assigned_editor_name = ${piece.assignedEditorName || me.displayName},
          stage = ${"cut_review"},
          updated_at = now()
      where id = ${data.id}
    `;
    await addEvent(sql, data.id, me, "ভিডিও রিভিউয়ের গেটে");
    return { ok: true };
  });

export const approveCut = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string; proposedTitle: string; thumbnailNote: string }) => input)
  .handler(async ({ context, data }) => {
    const title = data.proposedTitle.trim();
    const thumb = data.thumbnailNote.trim();
    if (!title || !thumb) throw new GateError("থাম্বনেইল ছাড়া আপলোড হবে না");
    const sql = await getSql();
    const me = await ensureMember(sql, context.userId);
    const piece = await loadPiece(sql, data.id);
    if (piece.stage !== "cut_review") throw new GateError("ভিডিও রিভিউ গেট খোলা নেই");
    if (!me.isAdmin && me.role !== "planning_editor") {
      throw new GateError("ভিডিও রিভিউ পাস করবেন");
    }
    await sql`
      update pieces
      set proposed_title = ${title},
          thumbnail_note = ${thumb},
          stage = ${"upload"},
          updated_at = now()
      where id = ${data.id}
    `;
    await addEvent(sql, data.id, me, "আপলোড কিউ খুলেছে");
    return { ok: true };
  });

export const rejectCut = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string; reason: string }) => input)
  .handler(async ({ context, data }) => {
    const reason = data.reason.trim();
    if (!reason) throw new GateError("কারণ ছাড়া গেট খুলবে না");
    const sql = await getSql();
    const me = await ensureMember(sql, context.userId);
    const piece = await loadPiece(sql, data.id);
    if (piece.stage !== "cut_review") throw new GateError("কাট ফেরত দেওয়া যাবে না");
    if (!me.isAdmin && me.role !== "planning_editor") {
      throw new GateError("ভিডিও রিভিউ ফেরত দিবেন");
    }
    await sql`
      update pieces
      set stage = ${"editing"}, return_reason = ${reason}, updated_at = now()
      where id = ${data.id}
    `;
    await addEvent(sql, data.id, me, "এডিটরে ফেরত", reason);
    return { ok: true };
  });

export const markUpload = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string; channel: "facebook" | "youtube" }) => input)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const me = await ensureMember(sql, context.userId);
    const piece = await loadPiece(sql, data.id);
    if (piece.stage !== "upload") throw new GateError("আপলোড তালাবদ্ধ");
    if (!me.isAdmin && me.role !== "social") {
      throw new GateError("সোশ্যাল ম্যানেজার আপলোড মার্ক করবেন");
    }
    const fb = data.channel === "facebook" ? true : piece.uploadedFacebook;
    const yt = data.channel === "youtube" ? true : piece.uploadedYoutube;
    const published = fb && yt;
    await sql`
      update pieces
      set uploaded_facebook = ${fb},
          uploaded_youtube = ${yt},
          stage = ${published ? "published" : "upload"},
          updated_at = now()
      where id = ${data.id}
    `;
    await addEvent(
      sql,
      data.id,
      me,
      data.channel === "facebook" ? "ফেসবুক মার্ক হয়েছে" : "ইউটিউব মার্ক হয়েছে",
      published ? "দুই চ্যানেলেই প্রকাশিত" : "",
    );
    return { ok: true };
  });

export const getMyReport = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((input: { year: number; month: number }) => input)
  .handler(async ({ context, data }) => {
    const year = data.year;
    const month = data.month;
    if (!Number.isInteger(year) || month < 1 || month > 12) {
      throw new GateError("মাস ঠিক নেই");
    }
    const start = monthStartIso(year, month);
    const end = nextMonthStartIso(year, month);
    const sql = await getSql();
    const me = await ensureMember(sql, context.userId);
    const events = await sql<{ action: string; piece_id: string; stage: string }>`
      select e.action, e.piece_id, p.stage
      from piece_events e
      join pieces p on p.id = e.piece_id
      where e.actor_user_id = ${me.userId}
        and e.at >= ${start}::timestamptz
        and e.at < ${end}::timestamptz
    `;
    const topics = events.filter((e) => e.action === "স্ক্রিপ্ট শুরু").length;
    const scripts = events.filter((e) => e.action === "স্ক্রিপ্ট এডিটরের গেটে গেছে").length;
    const edits = events.filter((e) => e.action === "ভিডিও রিভিউয়ের গেটে").length;
    const shoots = events.filter((e) => e.action === "শুট ডান").length;
    const presents = events.filter((e) => e.action === "প্রেজেন্টেশন ডান").length;
    const scriptReviews = events.filter((e) => e.action === "প্রোডাকশন ফোল্ডারে").length;
    const cutReviews = events.filter((e) => e.action === "আপলোড কিউ খুলেছে").length;
    const uploads = events.filter(
      (e) => e.action === "ফেসবুক মার্ক হয়েছে" || e.action === "ইউটিউব মার্ক হয়েছে",
    ).length;
    const workIds = new Set(events.map((e) => e.piece_id));
    const publishedFromWork = new Set(
      events.filter((e) => e.stage === "published").map((e) => e.piece_id),
    ).size;
    return {
      year,
      month,
      topics,
      scripts,
      edits,
      shoots,
      presents,
      scriptReviews,
      cutReviews,
      uploads,
      workCount: workIds.size,
      publishedFromWork,
    };
  });
