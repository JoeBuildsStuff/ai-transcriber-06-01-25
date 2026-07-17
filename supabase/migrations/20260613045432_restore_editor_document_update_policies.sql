drop policy if exists "Editor documents: update own" on ai_transcriber.editor_documents;
create policy "Editor documents: update own"
  on ai_transcriber.editor_documents
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Editor documents: delete own" on ai_transcriber.editor_documents;
create policy "Editor documents: delete own"
  on ai_transcriber.editor_documents
  for delete to authenticated
  using ((select auth.uid()) = user_id);
