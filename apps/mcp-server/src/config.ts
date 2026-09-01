import 'dotenv/config';

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export const env = {
  PORT: Number(process.env.PORT ?? 8080),
  SUPABASE_URL: required('SUPABASE_URL').replace(/\/$/, ''),
  SUPABASE_PUBLISHABLE_KEY: required('SUPABASE_PUBLISHABLE_KEY'),
  PUBLIC_SERVER_URL: required('PUBLIC_SERVER_URL').replace(/\/$/, ''),
};
