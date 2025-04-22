"use client";

import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form";
import Link from "next/link";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";

import { toast } from "sonner";
import { app } from "@/firebase.client";
import { GlassesIcon, SignatureIcon } from "lucide-react";
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { siteConfig } from "@/siteConfig";

// Schema for form validation
export const formSchema = z.object({
  email: z.string().email().nonempty(),
  password: z
    .string()
    .nonempty()
    .min(6, "Password must be at least 6 characters"),
});

export default function AuthForm({
  type,
  onSubmit,
  handleGoogleLogin,
  linkPath,
  linkText,
  buttonText,
}: {
  type: "login" | "signup";
  onSubmit: (data: { email: string; password: string }) => Promise<void>;
  handleGoogleLogin: () => Promise<void>;
  linkPath: string;
  linkText: string;
  buttonText: string;
}) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "", password: "" },
  });

  return (
    <>
      <div className="flex w-full max-w-sm flex-col gap-6">
        <Link href="/login" className="flex items-center gap-2 self-center font-medium">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <GlassesIcon className="size-4" />
          </div>
          {siteConfig.title}
        </Link>
      </div>

      <Card className="min-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">
            {type === "login" ? "Welcome back" : "Get Started"}
          </CardTitle>
          <CardDescription>
            {type === "login" ? "Login" : "Sign up"} with your Email or Google
            account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <div className="grid gap-6">
                <div className="flex flex-col gap-4">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleGoogleLogin}
                    type="button"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                      <path
                        d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                        fill="currentColor"
                      />
                    </svg>
                    Continue with Google
                  </Button>
                </div>
                <div className="relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-border">
                  <span className="relative z-10 bg-background px-2 text-muted-foreground">
                    Or continue with
                  </span>
                </div>
                <div className="grid gap-6">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            id="email"
                            type="email"
                            placeholder="m@example.com"
                            required
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input
                            id="password"
                            type="password"
                            placeholder="********"
                            required
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full">
                    {buttonText}
                  </Button>
                </div>
                <div className="text-center text-sm">
                  {type === "login"
                    ? "Don't have an account?"
                    : "Already have an account?"}{" "}
                  <Link
                    href={linkPath}
                    className="underline underline-offset-4"
                  >
                    {linkText}
                  </Link>
                </div>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </>
  );
}

export async function handleGoogleLogin(router: AppRouterInstance) {
  try {
    const loadingToast = toast.loading("Logging in with Google");
    const credential = await signInWithPopup(
      getAuth(app),
      new GoogleAuthProvider()
    );
    const idToken = await credential.user.getIdToken();
    await fetch("/api/login", {
      headers: { Authorization: `Bearer ${idToken}` },
    });
    toast.dismiss(loadingToast);
    router.push("/");
  } catch (e) {
    console.error(e);
    toast.error("Failed to login with Google");
  }
}
