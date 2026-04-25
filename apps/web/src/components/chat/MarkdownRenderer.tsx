import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Props = {
  content: string;
};

// Renders Claude's Markdown output (bold, italics, headings, lists, code,
// tables) with chat-bubble-appropriate styles. GFM is enabled for tables,
// strikethrough, task lists, and autolinks. No raw HTML — react-markdown
// strips it by default, which is the correct safety posture for LLM output.
export function MarkdownRenderer({ content }: Props) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => <p className="mb-1.5 last:mb-0">{children}</p>,
        strong: ({ children }) => (
          <strong className="font-semibold text-foreground">{children}</strong>
        ),
        em: ({ children }) => <em className="italic">{children}</em>,
        a: ({ children, href }) => (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline decoration-dotted underline-offset-2"
          >
            {children}
          </a>
        ),
        ul: ({ children }) => (
          <ul className="my-1 list-disc space-y-0.5 pl-4">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="my-1 list-decimal space-y-0.5 pl-4">{children}</ol>
        ),
        li: ({ children }) => <li className="leading-snug">{children}</li>,
        h1: ({ children }) => (
          <h1 className="mt-1.5 mb-0.5 text-base font-semibold">{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 className="mt-1.5 mb-0.5 text-sm font-semibold">{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className="mt-1 mb-0.5 text-sm font-semibold">{children}</h3>
        ),
        h4: ({ children }) => (
          <h4 className="mt-1 mb-0.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {children}
          </h4>
        ),
        blockquote: ({ children }) => (
          <blockquote className="my-1 border-l-2 border-border pl-2 text-muted-foreground">
            {children}
          </blockquote>
        ),
        hr: () => <hr className="my-2 border-border" />,
        code: ({ className, children }) => {
          const isBlock = (className ?? "").startsWith("language-");
          if (isBlock) {
            return (
              <code className="my-1 block overflow-x-auto rounded border border-border bg-card p-2 font-mono text-[11px] leading-relaxed whitespace-pre">
                {children}
              </code>
            );
          }
          return (
            <code className="rounded border border-border bg-card px-1 py-0.5 font-mono text-[11px]">
              {children}
            </code>
          );
        },
        // Unwrap <pre> — our `<code>` block already styles itself with the
        // box + scroll. Letting <pre> render as well would double the box.
        pre: ({ children }) => <>{children}</>,
        table: ({ children }) => (
          <div className="my-1 overflow-x-auto">
            <table className="border-collapse text-xs">{children}</table>
          </div>
        ),
        thead: ({ children }) => (
          <thead className="bg-card">{children}</thead>
        ),
        th: ({ children }) => (
          <th className="border border-border px-2 py-1 text-left font-semibold">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="border border-border px-2 py-1">{children}</td>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
