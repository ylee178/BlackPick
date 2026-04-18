import { describe, expect, it } from "vitest";
import { detectEmailProvider } from "./email-provider";

describe("detectEmailProvider", () => {
  it("returns Gmail for gmail.com and googlemail.com", () => {
    expect(detectEmailProvider("user@gmail.com")?.key).toBe("gmail");
    expect(detectEmailProvider("user@googlemail.com")?.key).toBe("gmail");
  });

  it("returns Outlook for all Microsoft domains", () => {
    expect(detectEmailProvider("a@outlook.com")?.key).toBe("outlook");
    expect(detectEmailProvider("a@hotmail.com")?.key).toBe("outlook");
    expect(detectEmailProvider("a@live.com")?.key).toBe("outlook");
    expect(detectEmailProvider("a@msn.com")?.key).toBe("outlook");
  });

  it("returns Yahoo for yahoo.com and country subdomains", () => {
    expect(detectEmailProvider("a@yahoo.com")?.key).toBe("yahoo");
    expect(detectEmailProvider("a@yahoo.co.jp")?.key).toBe("yahoo");
    expect(detectEmailProvider("a@yahoo.co.uk")?.key).toBe("yahoo");
  });

  it("returns iCloud for icloud/me/mac", () => {
    expect(detectEmailProvider("a@icloud.com")?.key).toBe("icloud");
    expect(detectEmailProvider("a@me.com")?.key).toBe("icloud");
    expect(detectEmailProvider("a@mac.com")?.key).toBe("icloud");
  });

  it("returns Proton for proton variants", () => {
    expect(detectEmailProvider("a@proton.me")?.key).toBe("proton");
    expect(detectEmailProvider("a@protonmail.com")?.key).toBe("proton");
    expect(detectEmailProvider("a@proton.ch")?.key).toBe("proton");
    expect(detectEmailProvider("a@pm.me")?.key).toBe("proton");
  });

  it("returns Korean provider names for Naver/Daum/Kakao", () => {
    expect(detectEmailProvider("a@naver.com")?.key).toBe("naver");
    expect(detectEmailProvider("a@daum.net")?.key).toBe("daum");
    expect(detectEmailProvider("a@hanmail.net")?.key).toBe("daum");
    expect(detectEmailProvider("a@kakao.com")?.key).toBe("kakao");
  });

  it("is case-insensitive on the domain", () => {
    expect(detectEmailProvider("User@GMail.COM")?.key).toBe("gmail");
    expect(detectEmailProvider("USER@HOTMAIL.COM")?.key).toBe("outlook");
  });

  it("returns webmailUrl matching provider key", () => {
    expect(detectEmailProvider("a@gmail.com")?.webmailUrl).toBe("https://mail.google.com/");
    expect(detectEmailProvider("a@hotmail.com")?.webmailUrl).toBe("https://outlook.live.com/");
    expect(detectEmailProvider("a@naver.com")?.webmailUrl).toBe("https://mail.naver.com/");
  });

  it("returns null for unknown or corporate domains", () => {
    expect(detectEmailProvider("a@example.com")).toBeNull();
    expect(detectEmailProvider("a@acme-corp.io")).toBeNull();
    expect(detectEmailProvider("a@blackpick.io")).toBeNull();
  });

  it("returns null for empty / malformed input", () => {
    expect(detectEmailProvider("")).toBeNull();
    expect(detectEmailProvider("not-an-email")).toBeNull();
    // @ts-expect-error deliberately testing runtime safety
    expect(detectEmailProvider(null)).toBeNull();
    // @ts-expect-error deliberately testing runtime safety
    expect(detectEmailProvider(undefined)).toBeNull();
  });

  it("does not match substrings — gmail.co.kr is not Gmail", () => {
    expect(detectEmailProvider("a@gmail.co.kr")).toBeNull();
  });
});
