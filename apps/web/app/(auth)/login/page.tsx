"use client";

import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword, getAuth } from "firebase/auth";
import { app } from "@/firebase.client";
import { z } from "zod";
import AuthForm, {
  formSchema,
  handleGoogleLogin,
} from "@/components/auth-form";
import { createUserIfNotExists } from "@/services/users";

export default function LoginPage() {
  const router = useRouter();

  const onSubmit = async ({ email, password }: z.infer<typeof formSchema>) => {
    try {
      const credential = await signInWithEmailAndPassword(
        getAuth(app),
        email,
        password
      );
      
      // Update user in Firestore (creates if not exists)
      await createUserIfNotExists(credential.user);
      
      const idToken = await credential.user.getIdToken();
      await fetch("/api/login", {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      
      toast.success("Logged in successfully!");
      router.push("/");
    } catch (e: unknown) {
      toast.error(`Failed to log in: ${(e as Error)?.message}`);
      console.error(e);
    }
  };

  return (
    <div className="flex min-h-sm min-w-sm flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
      <AuthForm
        type="login"
        onSubmit={onSubmit}
        handleGoogleLogin={async () => {
          try {
            await handleGoogleLogin(router);
            
            const auth = getAuth(app);
            const user = auth.currentUser;

            if (user) {
              await createUserIfNotExists(user);
            }
          } catch (error) {
            console.error("Google login error:", error);
          }
        }}
        linkPath="/signup"
        linkText="Sign Up"
        buttonText="Login"
      />
    </div>
  );
}
