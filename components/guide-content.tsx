import { parseGuideContent } from "@/lib/guides/guides";

// Renders guide text: paragraphs and bullet lists. React escapes everything, so no HTML gets through.
export function GuideContent({ content }: { content: string }) {
  return (
    <div className="space-y-3">
      {parseGuideContent(content).map((block, i) =>
        block.type === "ul" ? (
          <ul key={i} className="list-disc space-y-1 pl-6">
            {block.items.map((item, j) => <li key={j}>{item}</li>)}
          </ul>
        ) : (
          <p key={i}>{block.text}</p>
        ),
      )}
    </div>
  );
}
