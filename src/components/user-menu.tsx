import { auth, signOut } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function UserMenu() {
  const session = await auth();

  if (!session?.user) {
    return (
      <Link href="/login">
        <Button variant="ghost" size="sm" className="text-xs tracking-wide cursor-pointer">
          Sign in
        </Button>
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-light text-[rgba(180,220,240,0.55)]">
        {session.user.name ?? session.user.email}
      </span>
      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/login" });
        }}
      >
        <Button
          type="submit"
          variant="ghost"
          size="sm"
          className="text-xs tracking-wide cursor-pointer"
        >
          Sign out
        </Button>
      </form>
    </div>
  );
}
