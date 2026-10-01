alter table pieces add column if not exists assigned_producer_id text;
alter table pieces add column if not exists assigned_producer_name text;
alter table pieces add column if not exists assigned_presenter_id text;
alter table pieces add column if not exists assigned_presenter_name text;
alter table pieces add column if not exists assigned_editor_id text;
alter table pieces add column if not exists assigned_editor_name text;
alter table pieces add column if not exists producer_done boolean not null default false;
alter table pieces add column if not exists presenter_done boolean not null default false;
alter table pieces add column if not exists present_note text not null default '';

create index if not exists pieces_producer_idx on pieces (assigned_producer_id);
create index if not exists pieces_presenter_idx on pieces (assigned_presenter_id);
create index if not exists pieces_editor_idx on pieces (assigned_editor_id);
