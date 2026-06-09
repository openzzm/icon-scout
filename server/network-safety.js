import dns from "node:dns/promises";
import net from "node:net";

export class PublicUrlError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = "PublicUrlError";
    this.status = status;
  }
}

export function normalizeSiteUrl(input) {
  const value = String(input ?? "").trim();
  if (!value) throw new PublicUrlError("请输入网站网址");
  const withScheme = /^[a-z][a-z\d+.-]*:/i.test(value) ? value : `https://${value}`;
  let url;
  try {
    url = new URL(withScheme);
  } catch {
    throw new PublicUrlError("网址格式无效");
  }
  if (!["http:", "https:"].includes(url.protocol)) throw new PublicUrlError("只支持 HTTP 和 HTTPS 网站");
  if (url.username || url.password) throw new PublicUrlError("网址不能包含登录凭据");
  url.hash = "";
  return url;
}

function ipv4Number(address) {
  return address.split(".").reduce((value, part) => (value << 8) + Number(part), 0) >>> 0;
}

function inIpv4Range(address, base, bits) {
  const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
  return (ipv4Number(address) & mask) === (ipv4Number(base) & mask);
}

function normalizedIpv6(address) {
  return address.toLowerCase().split("%")[0];
}

export function isPublicIp(address) {
  const version = net.isIP(address);
  if (version === 4) {
    const blocked = [
      ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8],
      ["169.254.0.0", 16], ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.0.2.0", 24],
      ["192.168.0.0", 16], ["198.18.0.0", 15], ["198.51.100.0", 24],
      ["203.0.113.0", 24], ["224.0.0.0", 4], ["240.0.0.0", 4],
    ];
    return !blocked.some(([base, bits]) => inIpv4Range(address, base, bits));
  }
  if (version === 6) {
    const ip = normalizedIpv6(address);
    if (ip.startsWith("::ffff:")) return isPublicIp(ip.slice(7));
    return !(
      ip === "::" ||
      ip === "::1" ||
      ip.startsWith("fc") ||
      ip.startsWith("fd") ||
      /^fe[89ab]/.test(ip) ||
      ip.startsWith("ff") ||
      ip.startsWith("2001:db8:")
    );
  }
  return false;
}

export async function assertPublicUrl(input, lookup = dns.lookup) {
  const url = input instanceof URL ? input : normalizeSiteUrl(input);
  const hostname = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (hostname === "localhost" || hostname.endsWith(".localhost") || hostname.endsWith(".local")) {
    throw new PublicUrlError("不支持本机或局域网地址");
  }
  const literalVersion = net.isIP(hostname);
  const records = literalVersion ? [{ address: hostname }] : await lookup(hostname, { all: true, verbatim: true });
  if (!records.length || records.some(({ address }) => !isPublicIp(address))) {
    throw new PublicUrlError("不支持本机、局域网或保留地址");
  }
  return url;
}
