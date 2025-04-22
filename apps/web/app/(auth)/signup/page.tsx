"use client";

import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword, getAuth } from "firebase/auth";
import { app } from "@/firebase.client";
import { z } from "zod";
import AuthForm, {
  formSchema,
  handleGoogleLogin,
} from "@/components/auth-form";

export default function SignUpPage() {
  const router = useRouter();

  const onSubmit = async ({ email, password }: z.infer<typeof formSchema>) => {
    try {
      const credential = await createUserWithEmailAndPassword(
        getAuth(app),
        email,
        password
      );
      const idToken = await credential.user.getIdToken();
      await fetch("/api/login", {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      router.push("/");
    } catch (e: unknown) {
      toast.error(`Failed to sign up: ${(e as Error)?.message}`);
      console.error(e);
    }
  };

  return (
    <div className="flex min-h-sm min-w-sm flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
      <AuthForm
        type="signup"
        onSubmit={onSubmit}
        handleGoogleLogin={() => handleGoogleLogin(router)}
        linkPath="/login"
        linkText="Login"
        buttonText="Sign Up"
      />
    </div>
  );
}
