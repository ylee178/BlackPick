const REMOVE_BG_ENDPOINT = "https://api.remove.bg/v1.0/removebg";

function getRemoveBgApiKey(): string {
  const key = process.env.REMOVE_BG_API_KEY;
  if (!key) {
    throw new Error("REMOVE_BG_API_KEY not found");
  }
  return key;
}

function describeRemoveBgError(status: number, body: string) {
  if (!body) return `remove.bg failed with status ${status}`;

  try {
    const parsed = JSON.parse(body) as {
      errors?: Array<{ title?: string; detail?: string; code?: string }>;
    };
    const first = parsed.errors?.[0];
    if (first?.title || first?.detail || first?.code) {
      return [first.title, first.detail, first.code].filter(Boolean).join(" — ");
    }
  } catch {
    // Fall back to the raw response body below.
  }

  return `remove.bg failed with status ${status}: ${body}`;
}

export async function removeBackgroundWithRemoveBg(
  input: Buffer,
  filename: string,
) {
  const apiKey = getRemoveBgApiKey();

  const form = new FormData();
  form.append(
    "image_file",
    new File([new Uint8Array(input)], filename, {
      type: "image/png",
    }),
  );
  form.append("size", "auto");
  form.append("format", "png");

  const response = await fetch(REMOVE_BG_ENDPOINT, {
    method: "POST",
    headers: {
      "X-Api-Key": apiKey,
    },
    body: form,
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(describeRemoveBgError(response.status, body));
  }

  return Buffer.from(await response.arrayBuffer());
}
