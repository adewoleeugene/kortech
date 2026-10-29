import Image from "next/image";
import Link from "next/link";
import type { Translator } from "@/lib/i18n";

export function SiteHeader({ t }: { t: Translator }) {
  return (
    <header className="border-b border-border bg-background">
      <div className="mx-auto flex h-14 w-full max-w-3xl items-center px-4">
        <Link href="/" className="flex min-h-12 items-center gap-2 font-semibold text-brand">
          <Image src="/icons/icon-192.png" alt="" width={28} height={28} className="rounded" priority />
          <span>{t("app.shortName")}</span>
        </Link>
      </div>
    </header>
  );
}
