import { Fragment, type ReactNode } from "react";

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /`([^`]+)`|\*\*([^*]+)\*\*/g;
  let cursor = 0;
  let match = pattern.exec(text);
  let index = 0;

  while (match) {
    if (match.index > cursor) nodes.push(text.slice(cursor, match.index));
    if (match[1] !== undefined) {
      nodes.push(<code key={`${keyPrefix}-c${index}`}>{match[1]}</code>);
    } else if (match[2] !== undefined) {
      nodes.push(<strong key={`${keyPrefix}-b${index}`}>{match[2]}</strong>);
    }
    cursor = match.index + match[0].length;
    index += 1;
    match = pattern.exec(text);
  }

  if (cursor < text.length) nodes.push(text.slice(cursor));
  return nodes;
}

function renderLines(text: string, keyPrefix: string, block: boolean): ReactNode {
  const lines = text.split("\n");
  const numbered = lines.length > 1 && lines.every((line) => /^\d+\.\s+/.test(line.trim()));

  if (block && numbered) {
    return (
      <ol key={keyPrefix}>
        {lines.map((line, index) => (
          <li key={`${keyPrefix}-li${index}`}>
            {renderInline(line.replace(/^\d+\.\s+/, ""), `${keyPrefix}-${index}`)}
          </li>
        ))}
      </ol>
    );
  }

  return lines.map((line, index) => (
    <Fragment key={`${keyPrefix}-ln${index}`}>
      {index > 0 ? <br /> : null}
      {renderInline(line, `${keyPrefix}-${index}`)}
    </Fragment>
  ));
}

export function RichText({ text, variant = "block" }: { text: string; variant?: "block" | "inline" }) {
  const fences = text.split("```");
  const block = variant === "block";

  const body = fences.map((part, index) => {
    if (index % 2 === 1) {
      return (
        <code key={`fence-${index}`} className="code-block">
          {part.replace(/^\n/, "").replace(/\n$/, "")}
        </code>
      );
    }

    const paragraphs = part.split(/\n\n+/).filter((paragraph) => paragraph.trim().length > 0);
    return paragraphs.map((paragraph, paragraphIndex) => {
      const key = `${index}-${paragraphIndex}`;
      const content = renderLines(paragraph, key, block);
      if (!block) {
        return (
          <Fragment key={key}>
            {paragraphIndex > 0 ? <br /> : null}
            {content}
          </Fragment>
        );
      }
      if (/^\d+\.\s+/m.test(paragraph) && paragraph.split("\n").every((line) => /^\d+\.\s+/.test(line.trim()))) {
        return <Fragment key={key}>{content}</Fragment>;
      }
      return <p key={key}>{content}</p>;
    });
  });

  if (!block) return <>{body}</>;
  return <div className="rich">{body}</div>;
}
