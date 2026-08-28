"use client";

import { Fragment, type ReactNode } from "react";

/**
 * Renders the generated autoexec with gutter line numbers and light syntax
 * colouring. Line numbers come from a CSS counter so they never end up in the
 * clipboard when a user selects part of the file.
 */
export function ConfigCode({ source }: { source: string }) {
  const lines = source.replace(/\n+$/, "").split("\n");

  return (
    <div className="cfg-code">
      {lines.map((line, index) => (
        <div className="cfg-line" key={index}>
          <code>{renderLine(line)}</code>
        </div>
      ))}
    </div>
  );
}

function renderLine(line: string): ReactNode {
  if (!line.trim()) return " ";
  if (line.trimStart().startsWith("//")) return <span className="tok-comment">{line}</span>;

  const match = line.match(/^(\s*)(\S+)(\s*)([\s\S]*)$/);
  if (!match) return line;
  const [, indent, head, gap, rest] = match;

  return (
    <>
      {indent}
      <span className="tok-cmd">{head}</span>
      {gap}
      {rest ? <span className="tok-val">{renderValue(rest)}</span> : null}
    </>
  );
}

function renderValue(value: string): ReactNode {
  // Split on quoted segments so bind targets read differently from raw numbers.
  return value.split(/("(?:[^"\\]|\\.)*")/).map((part, index) => part.startsWith('"')
    ? <span className="tok-str" key={index}>{part}</span>
    : <Fragment key={index}>{part}</Fragment>);
}
