import type { Metadata } from "next";
import AuthForm from "@/components/marketing/AuthForm";

export const metadata: Metadata = { title: "Register" };

export default function RegisterPage() {
  return (
    <div className="grid min-h-[70vh] place-items-center bg-slate-50 px-4 py-16">
      <AuthForm mode="register" />
    </div>
  );
}
