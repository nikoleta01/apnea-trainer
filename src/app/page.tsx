import CO2Trainer from "@/components/co2-trainer";
import UserMenu from "@/components/user-menu";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <>
      <header className="relative z-[1] w-full border-b border-[rgba(180,220,240,0.08)] backdrop-blur-sm">
        <div className="flex justify-end p-4 max-w-4xl w-full mx-auto">
          <UserMenu />
        </div>
      </header>
      <CO2Trainer />
    </>
  );
}
