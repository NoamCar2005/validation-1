-- Users table
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  website_url text not null,
  email text,
  whatsapp_opted_in boolean not null default false,
  survey_completed boolean not null default false,
  created_at timestamptz not null default now()
);

-- Survey responses table (flexible key/value — easy to add/remove questions)
create table if not exists survey_responses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  question_key text not null,
  answer_text text not null,
  answer_value text,
  created_at timestamptz not null default now()
);

-- Posts table
create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  post_type text not null check (post_type in ('value', 'trust', 'cta')),
  content text not null,
  copy text not null,
  image_url text,
  channel_recommended text not null check (channel_recommended in ('instagram', 'linkedin', 'facebook')),
  copied_count int not null default 0,
  generated_at timestamptz not null default now()
);

-- Indexes for common lookups
create index if not exists survey_responses_user_id_idx on survey_responses(user_id);
create index if not exists posts_user_id_idx on posts(user_id);
