-- The Press24 newsroom pipeline
create table if not exists members (
  user_id text primary key,
  email text,
  display_name text not null,
  role text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists pieces (
  id text primary key,
  title text not null,
  topic_note text not null default '',
  stage text not null,
  pitched_by_user_id text not null,
  pitched_by_name text not null,
  assigned_writer_id text,
  assigned_writer_name text,
  script_body text not null default '',
  shoot_note text not null default '',
  edit_note text not null default '',
  cut_link text not null default '',
  proposed_title text not null default '',
  thumbnail_note text not null default '',
  uploaded_facebook boolean not null default false,
  uploaded_youtube boolean not null default false,
  return_reason text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists pieces_stage_idx on pieces (stage);
create index if not exists pieces_writer_idx on pieces (assigned_writer_id);
create index if not exists pieces_pitched_idx on pieces (pitched_by_user_id);

create table if not exists piece_events (
  id text primary key,
  piece_id text not null references pieces (id) on delete cascade,
  at timestamptz not null default now(),
  actor_user_id text not null,
  actor_name text not null,
  action text not null,
  detail text not null default ''
);

create index if not exists piece_events_piece_idx on piece_events (piece_id, at);
