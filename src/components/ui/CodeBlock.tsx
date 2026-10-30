// Tiny regex highlighter — enough for short decorative snippets, no runtime dependency.
const KEYWORDS: Record<string, string[]> = {
  csharp: ["public", "private", "sealed", "record", "async", "await", "using", "var", "return", "void", "static", "readonly", "new", "class", "if", "else"],
  php: ["public", "function", "return", "use", "new", "fn", "static"],
  python: ["def", "return", "import", "from", "for", "in", "if", "else", "class"],
};

const PATTERN = /(\/\/.*$|#.*$)|("[^"]*"|'[^']*')|(\b\d+(?:\.\d+)?\b)|(\b[A-Za-z_]\w*\b)(?=\s*\()|(\b[A-Z]\w*\b)|(\b\w+\b)/gm;

export function CodeBlock({ code, language = "csharp" }: { code: string; language?: string }) {
  const keywords = new Set(KEYWORDS[language] ?? []);
  const parts: { text: string; cls?: string }[] = [];
  let last = 0;

  for (const m of code.matchAll(PATTERN)) {
    if (m.index > last) parts.push({ text: code.slice(last, m.index) });
    const [text, com, str, num, fn, type, word] = m;
    const cls = com
      ? "tok-com"
      : str
        ? "tok-str"
        : num
          ? "tok-num"
          : fn && !keywords.has(fn)
            ? "tok-fn"
            : type
              ? "tok-type"
              : (word ?? fn) && keywords.has(word ?? fn)
                ? "tok-kw"
                : undefined;
    parts.push({ text, cls });
    last = m.index + text.length;
  }
  parts.push({ text: code.slice(last) });

  return (
    <pre className="font-mono text-[10.5px] leading-[1.7] whitespace-pre text-zinc-300">
      {parts.map((p, i) => (p.cls ? <span key={i} className={p.cls}>{p.text}</span> : p.text))}
    </pre>
  );
}
