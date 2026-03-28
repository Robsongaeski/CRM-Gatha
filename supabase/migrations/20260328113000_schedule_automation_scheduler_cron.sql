DO $$
DECLARE
  v_existing_job_id bigint;
BEGIN
  SELECT jobid
    INTO v_existing_job_id
  FROM cron.job
  WHERE jobname = 'automation-scheduler-every-minute'
  LIMIT 1;

  IF v_existing_job_id IS NOT NULL THEN
    PERFORM cron.unschedule(v_existing_job_id);
  END IF;

  PERFORM cron.schedule(
    'automation-scheduler-every-minute',
    '* * * * *',
    $job$
    SELECT net.http_post(
      url := 'https://lyjzutjrmvgoeibaoizz.supabase.co/functions/v1/automation-scheduler',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5anp1dGpybXZnb2VpYmFvaXp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2ODE4OTAsImV4cCI6MjA3NzI1Nzg5MH0.FKsizhLUpD4tQ-MyneursXug5pBovNmtMDKF1iIkAII"}'::jsonb,
      body := '{}'::jsonb
    ) AS request_id;
    $job$
  );
END;
$$;
