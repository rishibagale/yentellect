import { createClient } from "@/utils/supabase/client";
import type { Provider } from "@supabase/supabase-js";

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
}

export interface SignUpData {
  email: string;
  password: string;
  displayName: string;
}

export interface SignInData {
  email: string;
  password: string;
}

async function createBackendUser(userId: string, displayName: string) {
  try {
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    await fetch(`${API_BASE}/profile/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: userId,
        name: displayName,
      }),
    });
  } catch {
    console.warn("Could not create user in backend, auth succeeded");
  }
}

export async function signUp(data: SignUpData): Promise<AuthUser> {
  const supabase = createClient();
  const { data: authData, error } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      data: {
        display_name: data.displayName,
      },
    },
  });

  if (error) throw new Error(error.message);
  if (!authData.user) throw new Error("Sign up failed: no user returned");

  await createBackendUser(authData.user.id, data.displayName);

  return {
    id: authData.user.id,
    email: authData.user.email!,
    displayName: data.displayName,
    avatarUrl: authData.user.user_metadata?.avatar_url,
  };
}

export async function signIn(data: SignInData): Promise<AuthUser> {
  const supabase = createClient();
  const { data: authData, error } = await supabase.auth.signInWithPassword({
    email: data.email,
    password: data.password,
  });

  if (error) throw new Error(error.message);
  if (!authData.user) throw new Error("Sign in failed: no user returned");

  return {
    id: authData.user.id,
    email: authData.user.email!,
    displayName: authData.user.user_metadata?.display_name || authData.user.email!.split("@")[0],
    avatarUrl: authData.user.user_metadata?.avatar_url,
  };
}

export async function signInWithOAuth(provider: Provider) {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });

  if (error) throw new Error(error.message);
  // OAuth redirect happens automatically — the page will navigate away
  return data;
}

export async function signOut(): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
}

export async function getSession() {
  const supabase = createClient();
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(error.message);
  return data.session;
}

export { createBackendUser };