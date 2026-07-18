'use client';

import { useState } from 'react';
import { inputClass } from './form';

/**
 * A comma/newline-separated list editor that preserves EXACTLY what you type.
 *
 * The naive approach — `value={list.join(', ')}` with `onChange={parse}` — is
 * broken: it re-derives the display text from the parsed array on every
 * keystroke, so a trailing comma or newline (an empty segment) is filtered out
 * the instant you type it, making commas and new lines impossible to enter.
 *
 * Here the raw text is local state (the source of truth while editing) and the
 * parsed list is pushed to the parent for saving. The field only re-seeds from
 * the parent when the parent's list changes to something our text doesn't
 * already represent (external load/reset), so it never fights the typist.
 */

const SEPARATOR = ', ';

function parseTokens(raw: string): string[] {
  return raw
    .split(/[\n,]/)
    .map((token) => token.trim())
    .filter(Boolean);
}

export function TokenListInput({
  value,
  onChange,
  multiline = false,
  className,
  placeholder,
  maxItems,
}: {
  value: string[];
  onChange: (list: string[]) => void;
  multiline?: boolean;
  className?: string;
  placeholder?: string;
  /** Cap the parsed list (e.g. a single-id field passes 1). */
  maxItems?: number;
}) {
  const [text, setText] = useState(() => value.join(SEPARATOR));
  // Track the last value prop we adopted so we can detect external changes
  // (this is React's "adjust state during render" pattern, not an effect).
  const [seenValue, setSeenValue] = useState(value);
  if (value !== seenValue) {
    setSeenValue(value);
    // Only overwrite the raw text when the incoming list differs from what the
    // current text already parses to — i.e. a genuine external change, not the
    // echo of our own onChange.
    if (parseTokens(text).join(SEPARATOR) !== value.join(SEPARATOR)) {
      setText(value.join(SEPARATOR));
    }
  }

  const commit = (raw: string): void => {
    setText(raw);
    const parsed = parseTokens(raw);
    onChange(maxItems ? parsed.slice(0, maxItems) : parsed);
  };

  // Tidy the raw text to canonical form once the user leaves the field.
  const normalize = (): void => setText(parseTokens(text).join(SEPARATOR));

  const cls = className ?? inputClass;

  return multiline ? (
    <textarea
      className={cls}
      value={text}
      placeholder={placeholder}
      onChange={(e) => commit(e.target.value)}
      onBlur={normalize}
    />
  ) : (
    <input
      className={cls}
      value={text}
      placeholder={placeholder}
      onChange={(e) => commit(e.target.value)}
      onBlur={normalize}
    />
  );
}
