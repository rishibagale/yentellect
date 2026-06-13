import { Suspense } from "react";
import SignUpForm from "./signup-form";

export const metadata = {
  title: "Sign Up — Yentellect",
};

export default function SignUpPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    }>
      <SignUpForm />
    </Suspense>
  );
}