"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { retroPanelClassName } from "@/components/ui/retro";

export type MentionUser = { id: string; ring_name: string };

export function MentionInput({
  value,
  onChange,
  mentionUsers,
  placeholder,
  ariaLabel,
  className,
  autoFocus,
  maxLength = 500,
}: {
  value: string;
  onChange: (v: string) => void;
  mentionUsers: MentionUser[];
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
  autoFocus?: boolean;
  maxLength?: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionStart, setMentionStart] = useState(-1);
  const [selectedIdx, setSelectedIdx] = useState(0);

  const filtered = mentionQuery
    ? mentionUsers.filter((u) =>
        u.ring_name.toLowerCase().includes(mentionQuery.toLowerCase())
      )
    : mentionUsers;

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    const cursor = e.target.selectionStart ?? v.length;
    onChange(v);

    const before = v.slice(0, cursor);
    const atIdx = before.lastIndexOf("@");
    if (atIdx >= 0 && (atIdx === 0 || before[atIdx - 1] === " ")) {
      const query = before.slice(atIdx + 1);
      if (!query.includes(" ")) {
        setMentionStart(atIdx);
        setMentionQuery(query);
        setShowDropdown(true);
        setSelectedIdx(0);
        return;
      }
    }
    setShowDropdown(false);
  }

  function selectUser(user: MentionUser) {
    const before = value.slice(0, mentionStart);
    const after = value.slice(mentionStart + 1 + mentionQuery.length);
    const newVal = `${before}@${user.ring_name} ${after}`;
    onChange(newVal);
    setShowDropdown(false);
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!showDropdown || filtered.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIdx((i) => (i + 1) % filtered.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx((i) => (i - 1 + filtered.length) % filtered.length);
    } else if (e.key === "Enter" && showDropdown) {
      e.preventDefault();
      selectUser(filtered[selectedIdx]);
    } else if (e.key === "Escape") {
      setShowDropdown(false);
    }
  }

  return (
    <div className="relative min-w-0 flex-1">
      <input
        ref={inputRef}
        autoFocus={autoFocus}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
        maxLength={maxLength}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className={cn("w-full", className)}
      />
      {showDropdown && filtered.length > 0 ? (
        <div className={retroPanelClassName({ className: "absolute bottom-full left-0 z-10 mb-1 max-h-36 w-full overflow-y-auto p-1" })}>
          {filtered.map((user, i) => (
            <button
              key={user.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => selectUser(user)}
              className={cn(
                "flex w-full cursor-pointer items-center gap-2 rounded-[8px] px-2.5 py-1.5 text-left text-sm",
                i === selectedIdx
                  ? "bg-[var(--bp-accent-dim)] text-[var(--bp-ink)]"
                  : "text-[var(--bp-muted)] hover:bg-[var(--bp-card-inset)] hover:text-[var(--bp-ink)]",
              )}
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--bp-accent)] text-[10px] font-bold text-[var(--bp-bg)]">
                {user.ring_name.charAt(0).toUpperCase()}
              </span>
              <span className="truncate font-medium">{user.ring_name}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
