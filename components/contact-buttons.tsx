import { telLink, whatsappLink } from "@/lib/contact-links";

// Call and WhatsApp buttons (PRD F7). Plain links: work without JavaScript and on basic browsers.
export function ContactButtons({
  phone,
  whatsapp,
  labels,
  whatsappText,
}: {
  phone: string;
  whatsapp: string | null;
  labels: { call: string; whatsapp: string };
  whatsappText?: string;
}) {
  return (
    <div className="flex gap-2">
      <a
        href={telLink(phone)}
        className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-lg bg-brand px-4 font-semibold text-brand-foreground"
      >
        <span aria-hidden>📞</span>
        {labels.call}
      </a>
      {whatsapp && (
        <a
          href={whatsappLink(whatsapp, whatsappText)}
          rel="noopener"
          className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-lg border-2 border-brand px-4 font-semibold text-brand"
        >
          <span aria-hidden>💬</span>
          {labels.whatsapp}
        </a>
      )}
    </div>
  );
}
