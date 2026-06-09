import { safeFetch } from "../../server/fetch.js";
import { convertImage, convertedFilename } from "../../server/image-conversion.js";
import { findSiteIcons } from "../../server/index.js";
import { assertPublicUrl, normalizeSiteUrl, PublicUrlError } from "../../server/network-safety.js";

function json(status, body) {
  return Response.json(body, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

export async function handleApiRequest(request, options = {}) {
  const assertUrl = options.assertUrl ?? assertPublicUrl;
  const fetcher = options.fetcher ?? ((url, fetchOptions = {}) => safeFetch(url, { assertUrl, ...fetchOptions }));
  const requestUrl = new URL(request.url);

  try {
    if (request.method !== "GET") return json(405, { error: "只支持 GET 请求" });

    if (requestUrl.pathname === "/api/icons") {
      return json(200, await findSiteIcons(requestUrl.searchParams.get("url"), { assertUrl, fetcher }));
    }

    if (requestUrl.pathname === "/api/icon-file") {
      const iconUrl = normalizeSiteUrl(requestUrl.searchParams.get("url"));
      await assertUrl(iconUrl);
      const icon = await fetcher(iconUrl, { maxBytes: 8 * 1024 * 1024, timeoutMs: 9000 });
      if (!icon.contentType.startsWith("image/") && !icon.contentType.includes("icon")) {
        throw new PublicUrlError("目标资源不是图标", 415);
      }
      const output = await convertImage(icon.buffer, icon.contentType, requestUrl.searchParams.get("format") ?? "original");
      const disposition = requestUrl.searchParams.get("download") === "1" ? "attachment" : "inline";
      return new Response(output.buffer, {
        status: 200,
        headers: {
          "content-type": output.contentType || "application/octet-stream",
          "content-disposition": `${disposition}; filename="${convertedFilename(icon.url, output.extension)}"`,
          "cache-control": "public, max-age=3600",
          "x-content-type-options": "nosniff",
        },
      });
    }

    return json(404, { error: "API 不存在" });
  } catch (error) {
    const status = error instanceof PublicUrlError ? error.status : 502;
    return json(status, { error: error instanceof PublicUrlError ? error.message : "获取网站图标失败" });
  }
}

export default handleApiRequest;

export const config = {
  path: ["/api/icons", "/api/icon-file"],
};
