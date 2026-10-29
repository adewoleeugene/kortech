// Contact links (PRD F7): plain links that open the phone dialler or WhatsApp.

export function telLink(e164: string) {
  return `tel:${e164}`;
}

export function whatsappLink(e164: string, text?: string) {
  const base = `https://wa.me/${e164.replace(/^\+/, "")}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}
