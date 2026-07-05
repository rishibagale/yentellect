import { createClient } from "@/utils/supabase/client";
import type { Provider } from "@supabase/supabase-js";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "https://yentellect.onrender.com";

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

async function createBackendUser(userId: string, displayName: string, accessToken?: string | null) {
  if (!accessToken) return;
  try {
    await fetch(`${BACKEND_URL}/profile/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        user_id: userId,
        name: displayName,
      }),
    });
  } catch {
    // Non-critical: the backend also creates the user profile on first session.
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

  await createBackendUser(authData.user.id, data.displayName, authData.session?.access_token);

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

  const displayName = authData.user.user_metadata?.display_name || authData.user.email!.split("@")[0];
  await createBackendUser(authData.user.id, displayName, authData.session?.access_token);

  return {
    id: authData.user.id,
    email: authData.user.email!,
    displayName,
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