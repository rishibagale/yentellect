import { Suspense } from "react";
import SignUpForm from "./signup-form";

export const metadata = {
  title: "Sign Up — Yentellect",
};

export default function SignUpPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[var(--bg-0)] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[var(--border)] border-t-[var(--accent)] rounded-full animate-spin" />
      </div>
    }>
      <SignUpForm />
    </Suspense>
  );
}