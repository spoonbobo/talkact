"use client";

import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import Loading from "@/components/loading";

export default function DashboardPage() {
  const { data: session } = useSession();
  const t = useTranslations("DashboardPage");

  if (!session) {
    return <Loading />;
  }

  return (
    <div>
      <h1>{t("dashboard")}</h1>
    </div>
  );
}
