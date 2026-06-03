import { signIn, auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GoogleIcon } from "@/components/icons/google";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/");

  return (
    <div className="relative z-[1] min-h-screen flex flex-col items-center justify-center p-5">
      <div className="w-full max-w-[420px] space-y-6">
        <div className="text-center space-y-1.5">
          <h1 className="font-heading text-[32px] font-normal tracking-tight text-[#d6eef7]">
            Apnea Trainer
          </h1>
          <p className="text-[13px] font-light tracking-[2.5px] uppercase text-[rgba(180,220,240,0.55)]">
            Sign in to track progress
          </p>
        </div>

        <Card>
          <CardContent className="pt-8 pb-8 text-center space-y-5">
            <p className="text-sm text-[rgba(180,220,240,0.7)] font-light leading-relaxed">
              Sign in with Google to save your training sessions and track your
              streaks across devices.
            </p>
            <form
              action={async () => {
                "use server";
                await signIn("google", { redirectTo: "/" });
              }}
            >
              <Button type="submit" size="lg" className="w-full py-4 cursor-pointer">
                <GoogleIcon className="size-4" />
                Continue with Google
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
