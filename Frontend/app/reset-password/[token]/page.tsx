"use client";

import { useParams } from "next/navigation";
import { ResetPassword } from "@/components/auth/reset-password";

export default function ResetPasswordPage() {
  const params = useParams();
  const token = Array.isArray(params.token) ? params.token[0] : (params.token ?? "");
  return <ResetPassword token={token} />;
}
