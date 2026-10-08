export interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  /** 'gmail' oppure 'resend' (default: resend) */
  MAIL_PROVIDER?: string;
  RESEND_API_KEY: string;
  GMAIL_CLIENT_ID?: string;
  GMAIL_CLIENT_SECRET?: string;
  GMAIL_REFRESH_TOKEN?: string;
  MAIL_FROM: string;
  VAPID_PUBLIC_KEY: string;
  VAPID_PRIVATE_KEY: string;
  VAPID_SUBJECT: string;
  ACTION_SECRET: string;
  GEMINI_API_KEY?: string;
  GEMINI_MODEL?: string;
  APP_URL: string;
  WORKER_URL: string;
}
