import { describe, expect, it } from "vitest";
import {
  buildReplyMaps,
  getPreviewComments,
  sortTopLevelComments,
  type DiscussionCommentLike,
} from "./discussion";

type C = DiscussionCommentLike;

function c(
  id: string,
  parent_id: string | null,
  created_at: string,
  like_count = 0,
): C {
  return { id, parent_id, like_count, created_at };
}

describe("buildReplyMaps", () => {
  it("separates top-level comments from replies", () => {
    const comments: C[] = [
      c("a", null, "2026-04-18T00:00:00Z"),
      c("b", "a", "2026-04-18T00:01:00Z"),
      c("d", null, "2026-04-18T00:02:00Z"),
    ];
    const { topLevel, directRepliesMap } = buildReplyMaps(comments);
    expect(topLevel.map((t) => t.id)).toEqual(["a", "d"]);
    expect(directRepliesMap.get("a")?.map((r) => r.id)).toEqual(["b"]);
    expect(directRepliesMap.get("d")).toBeUndefined();
  });

  it("flattens nested replies under the root top-level comment", () => {
    const comments: C[] = [
      c("root", null, "2026-04-18T00:00:00Z"),
      c("r1", "root", "2026-04-18T00:01:00Z"),
      c("r2", "r1", "2026-04-18T00:02:00Z"),
      c("r3", "r2", "2026-04-18T00:03:00Z"),
    ];
    const { flatRepliesMap } = buildReplyMaps(comments);
    expect(flatRepliesMap.get("root")?.map((r) => r.id)).toEqual([
      "r1",
      "r2",
      "r3",
    ]);
  });

  it("sorts direct replies by created_at ascending", () => {
    const comments: C[] = [
      c("root", null, "2026-04-18T00:00:00Z"),
      c("r_late", "root", "2026-04-18T00:05:00Z"),
      c("r_early", "root", "2026-04-18T00:01:00Z"),
      c("r_mid", "root", "2026-04-18T00:03:00Z"),
    ];
    const { directRepliesMap } = buildReplyMaps(comments);
    expect(directRepliesMap.get("root")?.map((r) => r.id)).toEqual([
      "r_early",
      "r_mid",
      "r_late",
    ]);
  });

  it("returns empty maps when given an empty list", () => {
    const { topLevel, directRepliesMap, flatRepliesMap } = buildReplyMaps([]);
    expect(topLevel).toEqual([]);
    expect(directRepliesMap.size).toBe(0);
    expect(flatRepliesMap.size).toBe(0);
  });

  it("ignores replies whose parent is absent from the list (orphan drops)", () => {
    const comments: C[] = [
      c("a", null, "2026-04-18T00:00:00Z"),
      c("orphan", "missing-parent", "2026-04-18T00:01:00Z"),
    ];
    const { topLevel, flatRepliesMap } = buildReplyMaps(comments);
    expect(topLevel.map((t) => t.id)).toEqual(["a"]);
    expect(flatRepliesMap.get("a")).toBeUndefined();
  });
});

describe("sortTopLevelComments", () => {
  it("'new' mode sorts by created_at descending", () => {
    const tops: C[] = [
      c("old", null, "2026-04-18T00:00:00Z"),
      c("mid", null, "2026-04-18T00:05:00Z"),
      c("new", null, "2026-04-18T00:10:00Z"),
    ];
    const flatRepliesMap = new Map<string, C[]>();
    const sorted = sortTopLevelComments(tops, flatRepliesMap, "new");
    expect(sorted.map((s) => s.id)).toEqual(["new", "mid", "old"]);
  });

  it("'top' mode orders by reply count first", () => {
    const tops: C[] = [
      c("no-replies", null, "2026-04-18T00:00:00Z", 100),
      c("many-replies", null, "2026-04-18T00:00:00Z", 0),
    ];
    const flatRepliesMap = new Map<string, C[]>([
      [
        "many-replies",
        [
          c("x1", "many-replies", "2026-04-18T00:01:00Z"),
          c("x2", "many-replies", "2026-04-18T00:02:00Z"),
        ],
      ],
    ]);
    const sorted = sortTopLevelComments(tops, flatRepliesMap, "top");
    expect(sorted.map((s) => s.id)).toEqual(["many-replies", "no-replies"]);
  });

  it("'top' mode breaks reply-count ties with like_count", () => {
    const tops: C[] = [
      c("low-likes", null, "2026-04-18T00:00:00Z", 1),
      c("high-likes", null, "2026-04-18T00:00:00Z", 10),
    ];
    const flatRepliesMap = new Map<string, C[]>();
    const sorted = sortTopLevelComments(tops, flatRepliesMap, "top");
    expect(sorted.map((s) => s.id)).toEqual(["high-likes", "low-likes"]);
  });

  it("'top' mode breaks reply+like ties with created_at descending", () => {
    const tops: C[] = [
      c("old", null, "2026-04-18T00:00:00Z", 5),
      c("new", null, "2026-04-18T00:05:00Z", 5),
    ];
    const flatRepliesMap = new Map<string, C[]>();
    const sorted = sortTopLevelComments(tops, flatRepliesMap, "top");
    expect(sorted.map((s) => s.id)).toEqual(["new", "old"]);
  });

  it("does not mutate the input array", () => {
    const tops: C[] = [
      c("a", null, "2026-04-18T00:00:00Z"),
      c("b", null, "2026-04-18T00:01:00Z"),
    ];
    const originalOrder = tops.map((t) => t.id);
    sortTopLevelComments(tops, new Map(), "new");
    expect(tops.map((t) => t.id)).toEqual(originalOrder);
  });
});

describe("getPreviewComments", () => {
  it("returns up to the limit, ordered by 'top' rules", () => {
    const tops: C[] = [
      c("a", null, "2026-04-18T00:00:00Z", 1),
      c("b", null, "2026-04-18T00:00:00Z", 5),
      c("c", null, "2026-04-18T00:00:00Z", 3),
      c("d", null, "2026-04-18T00:00:00Z", 10),
    ];
    const preview = getPreviewComments(tops, new Map(), 2);
    expect(preview.map((p) => p.id)).toEqual(["d", "b"]);
  });

  it("defaults to a 3-item preview", () => {
    const tops: C[] = [
      c("a", null, "2026-04-18T00:00:00Z", 1),
      c("b", null, "2026-04-18T00:00:00Z", 2),
      c("c", null, "2026-04-18T00:00:00Z", 3),
      c("d", null, "2026-04-18T00:00:00Z", 4),
    ];
    const preview = getPreviewComments(tops, new Map());
    expect(preview).toHaveLength(3);
    expect(preview.map((p) => p.id)).toEqual(["d", "c", "b"]);
  });

  it("returns fewer when fewer top-level comments exist", () => {
    const tops: C[] = [c("only", null, "2026-04-18T00:00:00Z", 1)];
    const preview = getPreviewComments(tops, new Map(), 5);
    expect(preview.map((p) => p.id)).toEqual(["only"]);
  });
});
