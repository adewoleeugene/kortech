import { telLink, whatsappLink } from "@/lib/contact-links";
import { Icon } from "./icons";

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
        className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-brand px-4 font-bold text-white no-underline hover:bg-brand-dark hover:text-white"
      >
        <Icon name="phone" size={18} />
        {labels.call}
      </a>
      {whatsapp && (
        <a
          href={whatsappLink(whatsapp, whatsappText)}
          rel="noopener"
          className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl border-[1.5px] border-brand px-4 font-bold text-brand no-underline hover:bg-brand-soft"
        >
          <Icon name="chat" size={18} />
          {labels.whatsapp}
        </a>
      )}
    </div>
  );
}
