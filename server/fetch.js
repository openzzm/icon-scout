import { assertPublicUrl, PublicUrlError } from "./network-safety.js";

export async function safeFetch(input, options = {}) {
  const {
    assertUrl = assertPublicUrl,
    maxBytes = 2 * 1024 * 1024,
    timeoutMs = 8000,
    maxRedirects = 4,
    headers = {},
  } = options;
  let url = input instanceof URL ? input : new URL(input);
  for (let redirect = 0; redirect <= maxRedirects; redirect += 1) {
    await assertUrl(url);
    const response = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(timeoutMs),
      headers: {
        "user-agent": "IconScout/1.0 (+public favicon discovery)",
        accept: "text/html,application/manifest+json,image/*;q=0.9,*/*;q=0.1",
        ...headers,
      },
    });
    if (response.status >= 300 && response.status < 400 && response.headers.get("location")) {
      if (redirect === maxRedirects) throw new PublicUrlError("目标网站重定向次数过多", 502);
      url = new URL(response.headers.get("location"), url);
      continue;
    }
    if (!response.ok) throw new PublicUrlError(`目标资源返回 HTTP ${response.status}`, 502);
    const contentLength = Number(response.headers.get("content-length") ?? 0);
    if (contentLength > maxBytes) throw new PublicUrlError("目标资源过大", 413);
    const reader = response.body.getReader();
    const chunks = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > maxBytes) {
        await reader.cancel();
        throw new PublicUrlError("目标资源过大", 413);
      }
      chunks.push(value);
    }
    return {
      url,
      status: response.status,
      contentType: response.headers.get("content-type")?.split(";")[0] ?? "",
      buffer: Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))),
    };
  }
  throw new PublicUrlError("无法获取目标资源", 502);
}
