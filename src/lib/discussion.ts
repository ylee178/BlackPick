export type DiscussionCommentLike = {
  id: string;
  parent_id: string | null;
  like_count: number;
  created_at: string;
};

export type DiscussionSortMode = "top" | "new";

export function buildReplyMaps<T extends DiscussionCommentLike>(comments: T[]) {
  const topLevel = comments.filter((comment) => !comment.parent_id);
  const directRepliesMap = new Map<string, T[]>();

  for (const comment of comments) {
    if (!comment.parent_id) continue;
    const replies = directRepliesMap.get(comment.parent_id) ?? [];
    replies.push(comment);
    directRepliesMap.set(comment.parent_id, replies);
  }

  for (const replies of directRepliesMap.values()) {
    replies.sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
  }

  const flatRepliesMap = new Map<string, T[]>();

  function collectReplies(rootId: string, parentId: string) {
    const children = directRepliesMap.get(parentId) ?? [];
    for (const child of children) {
      const replies = flatRepliesMap.get(rootId) ?? [];
      replies.push(child);
      flatRepliesMap.set(rootId, replies);
      collectReplies(rootId, child.id);
    }
  }

  for (const comment of topLevel) {
    collectReplies(comment.id, comment.id);
  }

  return { topLevel, directRepliesMap, flatRepliesMap };
}

function compareTopLevel<T extends DiscussionCommentLike>(
  a: T,
  b: T,
  flatRepliesMap: Map<string, T[]>,
  mode: DiscussionSortMode,
) {
  if (mode === "new") {
    return (
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  const aReplyCount = flatRepliesMap.get(a.id)?.length ?? 0;
  const bReplyCount = flatRepliesMap.get(b.id)?.length ?? 0;
  if (bReplyCount !== aReplyCount) return bReplyCount - aReplyCount;
  if (b.like_count !== a.like_count) return b.like_count - a.like_count;
  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
}

export function sortTopLevelComments<T extends DiscussionCommentLike>(
  comments: T[],
  flatRepliesMap: Map<string, T[]>,
  mode: DiscussionSortMode,
) {
  return [...comments].sort((a, b) =>
    compareTopLevel(a, b, flatRepliesMap, mode),
  );
}

export function getPreviewComments<T extends DiscussionCommentLike>(
  comments: T[],
  flatRepliesMap: Map<string, T[]>,
  limit = 3,
) {
  return sortTopLevelComments(comments, flatRepliesMap, "top").slice(0, limit);
}
