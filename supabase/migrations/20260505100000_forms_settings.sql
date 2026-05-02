-- Presentation / behavior flags for forms (theme, collect email, etc.)

alter table public.forms
  add column if not exists settings jsonb not null default '{}'::jsonb;

comment on column public.forms.settings is 'JSON: theme_header_color, collect_email, allow_multiple_responses, confirmation_message, show_progress_bar, shuffle_questions, show_question_numbers, etc.';
