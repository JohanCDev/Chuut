import {lookup} from "node:dns/promises";
import {isIP} from "node:net";

export interface LinkMeta {
  title?: string;
  price?: number;
  imageUrl?: string;
  domain: string;
}

const MAX_BYTES = 1024 * 1024;
const MAX_REDIRECTS = 3;

const isPrivateIp = (ip: string): boolean => {
  if (ip.includes(":")) {
    const v = ip.toLowerCase();
    if (v.startsWith("::ffff:")) return isPrivateIp(v.slice(7));
    return v === "::1" || v === "::" || v.startsWith("fc") ||
      v.startsWith("fd") || v.startsWith("fe80");
  }
  const [a, b] = ip.split(".").map(Number);
  return a === 0 || a === 10 || a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) || a >= 224;
};

const assertPublic = async (url: URL): Promise<void> => {
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("scheme");
  }
  const host = url.hostname.replace(/^\[|\]$/g, "");
  const addrs = isIP(host) ?
    [{address: host}] :
    await lookup(host, {all: true});
  if (addrs.length === 0 || addrs.some((a) => isPrivateIp(a.address))) {
    throw new Error("private");
  }
};

const readCapped = async (res: Response): Promise<string> => {
  const reader = res.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (total < MAX_BYTES) {
    const {done, value} = await reader.read();
    if (done) break;
    chunks.push(value);
    total += value.length;
  }
  await reader.cancel().catch(() => undefined);
  return Buffer.concat(chunks).toString("utf8");
};

const meta = (html: string, keys: string[]): string | undefined => {
  for (const key of keys) {
    const re = new RegExp(
      `<meta[^>]+(?:property|name)=["']${key}["'][^>]*>`, "i");
    const tag = html.match(re)?.[0];
    const content = tag?.match(/content=["']([^"']*)["']/i)?.[1];
    if (content) return decode(content);
  }
  return undefined;
};

const decode = (s: string): string =>
  s.replace(/&amp;/g, "&").replace(/&quot;/g, "\"").replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();

export const fetchMeta = async (input: string): Promise<LinkMeta> => {
  let url = new URL(input);
  let res: Response | undefined;
  for (let i = 0; i <= MAX_REDIRECTS; i++) {
    await assertPublic(url);
    res = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(5000),
      headers: {"user-agent": "Mozilla/5.0 (compatible; ChuutBot/1.0)"},
    });
    const loc = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && loc) {
      url = new URL(loc, url);
      continue;
    }
    break;
  }
  if (!res || !res.ok) throw new Error("fetch");

  const html = await readCapped(res);
  const title = meta(html, ["og:title", "twitter:title"]) ??
    decode(html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] ?? "");
  const image = meta(html, ["og:image", "twitter:image"]);
  const priceRaw = meta(html, [
    "product:price:amount", "og:price:amount", "twitter:data1"]);
  const price = priceRaw ?
    parseFloat(priceRaw.replace(/[^\d.,]/g, "").replace(",", ".")) :
    NaN;

  let imageUrl: string | undefined;
  if (image) {
    try {
      const u = new URL(image, url);
      if (u.protocol === "https:" || u.protocol === "http:") {
        imageUrl = u.toString();
      }
    } catch {
      // ignore malformed image url
    }
  }
  return {
    title: title || undefined,
    price: Number.isFinite(price) ? price : undefined,
    imageUrl,
    domain: url.hostname.replace(/^www\./, ""),
  };
};
