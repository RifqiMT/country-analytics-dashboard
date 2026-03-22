/** Renders assistant reply with links [text](url) and bold **text** */
export default function MessageContent({ text }: { text: string }) {
  const nodes: React.ReactNode[] = [];
  const linkRe = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g;
  let lastIndex = 0;
  let m;

  while ((m = linkRe.exec(text)) !== null) {
    nodes.push(formatInline(text.slice(lastIndex, m.index)));
    nodes.push(
      <a
        key={m.index}
        href={m[2]}
        target="_blank"
        rel="noreferrer"
        className="text-blue-600 hover:underline"
      >
        {m[1]}
      </a>
    );
    lastIndex = m.index + m[0].length;
  }
  nodes.push(formatInline(text.slice(lastIndex)));

  return (
    <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
      {nodes}
    </div>
  );
}

function formatInline(s: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const boldRe = /\*\*([^*]+)\*\*/g;
  let last = 0;
  let m;
  while ((m = boldRe.exec(s)) !== null) {
    parts.push(s.slice(last, m.index));
    parts.push(<strong key={m.index}>{m[1]}</strong>);
    last = m.index + m[0].length;
  }
  parts.push(s.slice(last));
  return parts.length === 1 ? parts[0] : <>{parts}</>;
}
