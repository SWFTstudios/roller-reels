export async function onRequestGet(context) {
  const baseId = "appyk4Nbvjtzj8334";
  const tableName = context.env.AIRTABLE_TABLE_NAME || "Videos";
  const token = context.env.AIRTABLE_PAT;

  if (!token) {
    return new Response(
      JSON.stringify({
        error: "Missing AIRTABLE_PAT secret",
      }),
      {
        status: 500,
        headers: { "content-type": "application/json; charset=utf-8" },
      }
    );
  }

  const cacheKey = new Request(new URL(context.request.url).toString(), {
    method: "GET",
  });
  const cache = caches.default;
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  const filterByFormula = encodeURIComponent("{Published}=TRUE()");
  const sort = "sort%5B0%5D%5Bfield%5D=Sort&sort%5B0%5D%5Bdirection%5D=asc";
  const pageSize = "pageSize=100";

  const url = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(
    tableName
  )}?${pageSize}&filterByFormula=${filterByFormula}&${sort}`;

  const res = await fetch(url, {
    headers: {
      authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    return new Response(
      JSON.stringify({
        error: "Airtable request failed",
        status: res.status,
        details: text,
      }),
      {
        status: 502,
        headers: { "content-type": "application/json; charset=utf-8" },
      }
    );
  }

  const data = await res.json();
  const records = Array.isArray(data?.records) ? data.records : [];

  const items = records
    .map((r) => {
      const fields = r.fields || {};
      const title = typeof fields["Title"] === "string" ? fields["Title"] : "";
      const shareUrl =
        typeof fields["Vimeo Share Link"] === "string"
          ? fields["Vimeo Share Link"]
          : "";
      const sortValue =
        typeof fields["Sort"] === "number"
          ? fields["Sort"]
          : Number(fields["Sort"]);

      const vimeo = normalizeVimeo(shareUrl);
      if (!title || !vimeo) return null;

      return {
        id: r.id,
        title,
        sort: Number.isFinite(sortValue) ? sortValue : null,
        vimeo: {
          shareUrl: vimeo.shareUrl,
          videoId: vimeo.videoId,
          hash: vimeo.hash,
          embedBaseUrl: vimeo.embedBaseUrl,
        },
      };
    })
    .filter(Boolean);

  const body = JSON.stringify({ items });
  const response = new Response(body, {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=60",
    },
  });

  context.waitUntil(cache.put(cacheKey, response.clone()));
  return response;
}

function normalizeVimeo(input) {
  if (!input || typeof input !== "string") return null;
  const shareUrl = input.trim();

  // Accept:
  // - https://vimeo.com/1174158034/c80e23ac22?...
  // - https://vimeo.com/1174158034?...
  // - https://player.vimeo.com/video/1174158034?h=c80e23ac22&...
  const m =
    shareUrl.match(/vimeo\.com\/video\/(\d+)(?:\?[^#]*h=([a-zA-Z0-9]+))?/) ||
    shareUrl.match(/vimeo\.com\/(\d+)(?:\/([a-zA-Z0-9]+))?/);

  if (!m) return null;
  const videoId = m[1];
  const hash = m[2] || null;

  const embedBaseUrl = hash
    ? `https://player.vimeo.com/video/${videoId}?h=${hash}`
    : `https://player.vimeo.com/video/${videoId}`;

  return { shareUrl, videoId, hash, embedBaseUrl };
}

