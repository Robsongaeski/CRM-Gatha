
SELECT cron.schedule(
  'wbuy-daily-sync',
  '0 6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://lyjzutjrmvgoeibaoizz.supabase.co/functions/v1/wbuy-daily-sync',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5anp1dGpybXZnb2VpYmFvaXp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2ODE4OTAsImV4cCI6MjA3NzI1Nzg5MH0.FKsizhLUpD4tQ-MyneursXug5pBovNmtMDKF1iIkAII"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
