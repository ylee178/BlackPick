"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n-provider";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp, Heart, Send } from "lucide-react";
import {
  retroButtonClassName,
  retroFieldClassName,
  retroPanelClassName,
} from "@/components/ui/retro";
import { MentionInput, type MentionUser } from "@/components/MentionInput";

type Comment = {
  id: string;
  fight_id: string;
  user_id: string;
  parent_id: string | null;
  body: string;
  created_at: string;
  like_count: number;
  is_liked: boolean;
  users: { id: string; ring_name: string } | null;
};

/* ── Language detection ── */

function detectLang(text: string): string {
  const clean = text.replace(/@\S+/g, "").trim();
  if (/[\uAC00-\uD7AF]/.test(clean)) return "ko";
  if (/[\u3040-\u309F\u30A0-\u30FF]/.test(clean)) return "ja";
  if (/[àáâãçéêíóôõúü]/i.test(clean)) return "pt-BR";
  return "en";
}

/* ── Translatable body ── */

function TranslatableBody({ commentId, body }: { commentId: string; body: string }) {
  const { locale, t } = useI18n();
  const [translated, setTranslated] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showTranslated, setShowTranslated] = useState(false);

  const isSameLanguage = detectLang(body) === locale;

  async function handleTranslate() {
    if (translated) {
      setShowTranslated(!showTranslated);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment_id: commentId, target_locale: locale }),
      });
      const data = await res.json();
      if (res.ok && data.translated_body) {
        setTranslated(data.translated_body);
        setShowTranslated(true);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }

  const displayText = showTranslated && translated ? translated : body;

  function renderBody(text: string) {
    return text.split(/(@\S+)/g).map((part, i) =>
      part.startsWith("@") ? (
        <span key={i} className="font-semibold text-[var(--bp-accent)]">{part}</span>
      ) : (
        <span key={i}>{part}</span>
      )
    );
  }

  return (
    <>
      <span
        className={cn(
          "text-[var(--bp-ink)] opacity-90",
          loading && "animate-shimmer bg-gradient-to-r from-[var(--bp-muted)] via-[var(--bp-ink)] to-[var(--bp-muted)] bg-[length:200%_100%] bg-clip-text text-transparent",
        )}
      >
        {renderBody(displayText)}
      </span>
      {!isSameLanguage && (
        <button
          type="button"
          onClick={handleTranslate}
          disabled={loading}
          className="ml-1 text-xs font-semibold text-[var(--bp-accent)] hover:opacity-80"
        >
          {translated ? (showTranslated ? t("discussion.original") : t("discussion.translate")) : t("discussion.translate")}
        </button>
      )}
    </>
  );
}

/* ── Heart icon ── */

function HeartIcon({ filled, className }: { filled: boolean; className?: string }) {
  return (
    <Heart
      className={cn("h-4 w-4", filled && "text-[var(--bp-danger)]", className)}
      fill={filled ? "currentColor" : "none"}
      strokeWidth={2}
    />
  );
}

/* ── Time ago ── */

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  const weeks = Math.floor(days / 7);
  return `${weeks}w`;
}

/* ── Inline reply form ── */

function InlineReplyForm({
  parentId,
  replyName,
  mentionUsers,
  onSubmit,
  onCancel,
  t,
}: {
  parentId: string;
  replyName: string;
  mentionUsers: MentionUser[];
  onSubmit: (parentId: string, body: string) => Promise<void>;
  onCancel: () => void;
  t: (key: string) => string;
}) {
  const [body, setBody] = useState(replyName ? `@${replyName} ` : "");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setSubmitting(true);
    await onSubmit(parentId, body.trim());
    setBody("");
    setSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2">
      <div className="flex items-center gap-2 text-xs text-[var(--bp-muted)]">
        {t("discussion.replyingTo")} <span className="font-semibold text-[var(--bp-ink)]">@{replyName}</span>
        <button type="button" onClick={onCancel} className="cursor-pointer text-[var(--bp-accent)] hover:opacity-80" aria-label={t("discussion.cancel")}>
          {t("discussion.cancel")}
        </button>
      </div>
      <div className="mt-1.5 flex gap-2">
        <input
          autoFocus
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={500}
          placeholder={t("discussion.placeholder")}
          className={retroFieldClassName("!min-h-[36px] !rounded-[10px] !px-3 !py-1.5 !text-sm")}
        />
        <button
          type="submit"
          disabled={submitting || !body.trim()}
          className={retroButtonClassName({ variant: "primary", size: "sm", className: "gap-1.5 shrink-0" })}
        >
          <Send className="h-3.5 w-3.5" strokeWidth={2} />
          {submitting ? "..." : t("discussion.post")}
        </button>
      </div>
    </form>
  );
}

/* ── Single comment row ── */

function CommentRow({
  comment,
  isReply,
  currentUserId,
  onDelete,
  onLike,
  onReply,
  t,
}: {
  comment: Comment;
  isReply: boolean;
  currentUserId: string | null;
  onDelete: (id: string) => void;
  onLike: (commentId: string) => void;
  onReply: (comment: Comment) => void;
  t: (key: string) => string;
}) {
  const initial = comment.users?.ring_name?.charAt(0)?.toUpperCase() ?? "?";

  return (
    <div className="flex gap-2.5">
      {/* Avatar */}
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-full bg-[var(--bp-accent-dim)] font-bold text-[var(--bp-accent)]",
          isReply ? "h-6 w-6 text-[10px]" : "h-8 w-8 text-xs",
        )}
      >
        {initial}
      </div>

      <div className="min-w-0 flex-1">
        {/* Name + body inline */}
        <p className={cn("leading-snug", isReply ? "text-[13px]" : "text-sm")}>
          <span className="font-semibold text-[var(--bp-ink)]">
            {comment.users?.ring_name ?? t("ranking.unknown")}
          </span>
          {" "}
          <TranslatableBody commentId={comment.id} body={comment.body} />
        </p>

        {/* Meta row */}
        <div className="mt-1 flex items-center gap-3 text-xs text-[var(--bp-muted)]">
          <span>{timeAgo(comment.created_at)}</span>

          <button
            type="button"
            onClick={() => onLike(comment.id)}
            aria-label={comment.is_liked ? "Unlike" : "Like"}
            aria-pressed={comment.is_liked}
            className={cn(
              "flex cursor-pointer items-center gap-1 transition-transform active:scale-125",
              !currentUserId && "pointer-events-none opacity-30",
            )}
            disabled={!currentUserId}
          >
            <HeartIcon filled={comment.is_liked} className={comment.is_liked ? "" : "text-[var(--bp-muted)]"} />
            {comment.like_count > 0 ? (
              <span className="font-semibold">{comment.like_count}</span>
            ) : null}
          </button>

          {currentUserId ? (
            <button
              type="button"
              onClick={() => onReply(comment)}
              className="cursor-pointer font-semibold text-[var(--bp-muted)] hover:text-[var(--bp-ink)]"
            >
              {t("discussion.reply")}
            </button>
          ) : null}

          {currentUserId === comment.user_id ? (
            <button
              type="button"
              onClick={() => onDelete(comment.id)}
              className="cursor-pointer font-semibold text-[var(--bp-muted)] hover:text-[var(--bp-danger)]"
            >
              {t("discussion.delete")}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/* ── Top-level comment with collapsible reply thread ── */

function CommentThread({
  comment,
  replies,
  currentUserId,
  onDelete,
  onLike,
  onReplySubmit,
  replyingTo,
  onSetReplyTo,
  replyMention,
  mentionUsers,
  t,
}: {
  comment: Comment;
  replies: Comment[];
  currentUserId: string | null;
  onDelete: (id: string) => void;
  onLike: (commentId: string) => void;
  onReplySubmit: (parentId: string, body: string) => Promise<void>;
  replyingTo: string | null;
  onSetReplyTo: (id: string | null, mention?: string) => void;
  replyMention: string;
  mentionUsers: MentionUser[];
  t: (key: string) => string;
}) {
  const [expanded, setExpanded] = useState(false);
  const replyCount = replies.length;

  function handleReply(target: Comment) {
    const mention = target.users?.ring_name ?? "";
    if (replyingTo === comment.id && replyMention === mention) {
      onSetReplyTo(null);
    } else {
      onSetReplyTo(comment.id, mention);
      if (!expanded && replyCount > 0) setExpanded(true);
    }
  }

  return (
    <div>
      <CommentRow
        comment={comment}
        isReply={false}
        currentUserId={currentUserId}
        onDelete={onDelete}
        onLike={onLike}
        onReply={handleReply}
        t={t}
      />

      {/* Reply thread */}
      {replyCount > 0 && (
        <div className="ml-[19px] mt-2">
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-[var(--bp-accent)] hover:opacity-80"
          >
            {expanded ? (
              <ChevronUp className="h-3.5 w-3.5" strokeWidth={2.5} />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" strokeWidth={2.5} />
            )}
            {expanded
              ? t("discussion.hideReplies")
              : t("discussion.viewReplies").replace("{count}", String(replyCount))}
          </button>

          {expanded && (
            <div className="mt-2 space-y-3 border-l-2 border-[var(--bp-line)] pl-4">
              {replies.map((reply) => (
                <CommentRow
                  key={reply.id}
                  comment={reply}
                  isReply
                  currentUserId={currentUserId}
                  onDelete={onDelete}
                  onLike={onLike}
                  onReply={handleReply}
                  t={t}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {replyingTo === comment.id && currentUserId ? (
        <div className={cn("mt-2", replyCount > 0 && "ml-[19px]")}>
          <InlineReplyForm
            parentId={comment.id}
            replyName={replyMention}
            mentionUsers={mentionUsers}
            onSubmit={onReplySubmit}
            onCancel={() => onSetReplyTo(null)}
            t={t}
          />
        </div>
      ) : null}
    </div>
  );
}

/* ── Comment skeleton ── */

function CommentSkeleton({ isReply = false }: { isReply?: boolean }) {
  return (
    <div className="flex gap-2.5">
      <div
        className={cn(
          "shrink-0 animate-shimmer rounded-full bg-gradient-to-r from-[var(--bp-card-inset)] via-[rgba(255,186,60,0.08)] to-[var(--bp-card-inset)] bg-[length:200%_100%]",
          isReply ? "h-6 w-6" : "h-8 w-8",
        )}
      />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="h-3.5 w-24 animate-shimmer rounded bg-gradient-to-r from-[var(--bp-card-inset)] via-[rgba(255,186,60,0.08)] to-[var(--bp-card-inset)] bg-[length:200%_100%]" />
        <div className="h-3 w-full max-w-[240px] animate-shimmer rounded bg-gradient-to-r from-[var(--bp-card-inset)] via-[rgba(255,186,60,0.06)] to-[var(--bp-card-inset)] bg-[length:200%_100%]" />
        <div className="h-3 w-16 animate-shimmer rounded bg-gradient-to-r from-[var(--bp-card-inset)] via-[rgba(255,186,60,0.05)] to-[var(--bp-card-inset)] bg-[length:200%_100%]" />
      </div>
    </div>
  );
}

function CommentSkeletonGroup() {
  return (
    <div className="space-y-4">
      <CommentSkeleton />
      <CommentSkeleton />
      <CommentSkeleton />
    </div>
  );
}

/* ── Main component ── */

const MIN_SKELETON_MS = 850;

export default function FightComments({
  fightId,
  fightLabel,
  currentUserId,
  currentUserInitial,
}: {
  fightId: string;
  fightLabel: string;
  currentUserId: string | null;
  currentUserInitial?: string;
}) {
  const { t } = useI18n();
  const [comments, setComments] = useState<Comment[]>([]);
  const [body, setBody] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyMention, setReplyMention] = useState("");
  const [loading, setLoading] = useState(true);
  const [showContent, setShowContent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const isInitialLoad = useRef(true);

  const fetchComments = useCallback(async () => {
    const start = Date.now();
    const isFirst = isInitialLoad.current;
    if (isFirst) {
      setLoading(true);
      setShowContent(false);
    }
    try {
      const res = await fetch(`/api/comments?fight_id=${fightId}`);
      const data = await res.json();
      if (res.ok) {
        if (isFirst) {
          const elapsed = Date.now() - start;
          const remaining = Math.max(0, MIN_SKELETON_MS - elapsed);
          await new Promise((r) => setTimeout(r, remaining));
          isInitialLoad.current = false;
        }
        setComments(data.comments ?? []);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
      // Small delay for fade-in
      requestAnimationFrame(() => setShowContent(true));
    }
  }, [fightId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim() || !currentUserId) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fight_id: fightId,
          body: body.trim(),
          parent_id: null,
        }),
      });
      if (res.ok) {
        setBody("");
        await fetchComments();
      }
    } catch {
      // silently fail
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReplySubmit(parentId: string, replyBody: string) {
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fight_id: fightId,
          body: replyBody,
          parent_id: parentId,
        }),
      });
      if (res.ok) {
        setReplyingTo(null);
        setReplyMention("");
        await fetchComments();
      }
    } catch {
      // silently fail
    }
  }

  async function handleDelete(commentId: string) {
    try {
      const res = await fetch(`/api/comments?id=${commentId}`, { method: "DELETE" });
      if (res.ok) await fetchComments();
    } catch {
      // silently fail
    }
  }

  async function handleLike(commentId: string) {
    if (!currentUserId) return;

    setComments((prev) =>
      prev.map((c) =>
        c.id === commentId
          ? { ...c, is_liked: !c.is_liked, like_count: c.like_count + (c.is_liked ? -1 : 1) }
          : c
      )
    );

    try {
      await fetch("/api/comments/like", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment_id: commentId }),
      });
    } catch {
      await fetchComments();
    }
  }

  function handleSetReplyTo(id: string | null, mention?: string) {
    setReplyingTo(id);
    setReplyMention(mention ?? "");
  }

  const topLevel = comments.filter((c) => !c.parent_id);
  const directRepliesMap = new Map<string, Comment[]>();
  for (const c of comments) {
    if (c.parent_id) {
      const arr = directRepliesMap.get(c.parent_id) ?? [];
      arr.push(c);
      directRepliesMap.set(c.parent_id, arr);
    }
  }

  const flatRepliesMap = new Map<string, Comment[]>();
  function collectReplies(rootId: string, parentId: string) {
    const children = directRepliesMap.get(parentId) ?? [];
    for (const child of children) {
      const arr = flatRepliesMap.get(rootId) ?? [];
      arr.push(child);
      flatRepliesMap.set(rootId, arr);
      collectReplies(rootId, child.id);
    }
  }
  for (const tl of topLevel) {
    collectReplies(tl.id, tl.id);
  }

  const mentionUsers: MentionUser[] = [];
  const seenIds = new Set<string>();
  for (const c of comments) {
    if (c.users && !seenIds.has(c.users.id)) {
      seenIds.add(c.users.id);
      mentionUsers.push(c.users);
    }
  }

  return (
    <div>
      {/* Header */}
      <p className="text-sm font-semibold text-[var(--bp-ink)]">
        {fightLabel}
      </p>

      {/* Comments list */}
      <div className="mt-3" aria-live="polite">
        {loading ? (
          <CommentSkeletonGroup />
        ) : topLevel.length === 0 ? (
          <p className="py-6 text-center text-xs text-[var(--bp-muted)]">{t("discussion.noComments")}</p>
        ) : (
          <div
            className={cn(
              "space-y-4 transition-opacity duration-300",
              showContent ? "opacity-100" : "opacity-0",
            )}
          >
            {topLevel.map((comment) => (
              <CommentThread
                key={comment.id}
                comment={comment}
                replies={flatRepliesMap.get(comment.id) ?? []}
                currentUserId={currentUserId}
                onDelete={handleDelete}
                onLike={handleLike}
                onReplySubmit={handleReplySubmit}
                replyingTo={replyingTo}
                onSetReplyTo={handleSetReplyTo}
                replyMention={replyMention}
                mentionUsers={mentionUsers}
                t={t}
              />
            ))}
          </div>
        )}
      </div>

      {/* Input */}
      {currentUserId ? (
        <form onSubmit={handleSubmit} className="mt-4 border-t border-[var(--bp-line)] pt-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--bp-accent-dim)] text-xs font-bold text-[var(--bp-accent)]">
              {(currentUserInitial ?? "?").toUpperCase()}
            </div>
            <MentionInput
              value={body}
              onChange={setBody}
              mentionUsers={mentionUsers}
              ariaLabel={t("discussion.placeholder")}
              placeholder={t("discussion.placeholder")}
              className={retroFieldClassName("!min-h-[40px] !rounded-[10px] !px-3 !text-sm")}
            />
            <button
              type="submit"
              disabled={submitting || !body.trim()}
              className={retroButtonClassName({ variant: "primary", size: "sm", className: "gap-1.5 shrink-0" })}
            >
              <Send className="h-3.5 w-3.5" strokeWidth={2} />
              {submitting ? "..." : t("discussion.post")}
            </button>
          </div>
        </form>
      ) : (
        <div className="mt-4 border-t border-[var(--bp-line)] pt-3">
          <p className="text-center text-xs text-[var(--bp-muted)]">
            {t("discussion.loginRequired")}
          </p>
        </div>
      )}
    </div>
  );
}
