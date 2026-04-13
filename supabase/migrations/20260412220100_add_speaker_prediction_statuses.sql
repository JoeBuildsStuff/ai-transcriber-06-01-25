alter table ai_transcriber.voice_memo_ingest
  drop constraint if exists voice_memo_ingest_status_check;

alter table ai_transcriber.voice_memo_ingest
  add constraint voice_memo_ingest_status_check check (
    status in (
      'discovered',
      'queued',
      'uploading',
      'uploaded',
      'creating_meeting',
      'meeting_created',
      'transcribing',
      'transcribed',
      'identifying_speakers',
      'speakers_predicted',
      'summarizing',
      'summarized',
      'awaiting_review',
      'reviewed',
      'dismissed',
      'failed_upload',
      'failed_transcription',
      'failed_summarization',
      'failed_unknown'
    )
  );
