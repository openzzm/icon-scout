import test from "node:test";
import assert from "node:assert/strict";

import { isPublicIp, normalizeSiteUrl } from "../server/network-safety.js";

test("normalizeSiteUrl adds https and removes fragments", () => {
  assert.equal(normalizeSiteUrl("example.com/page#top").href, "https://example.com/page");
});

test("normalizeSiteUrl rejects unsupported protocols and credentials", () => {
  assert.throws(() => normalizeSiteUrl("file:///etc/passwd"), /HTTP/);
  assert.throws(() => normalizeSiteUrl("https://user:pass@example.com"), /凭据/);
});

test("isPublicIp rejects private and reserved IPv4 addresses", () => {
  for (const ip of ["127.0.0.1", "10.0.0.1", "172.16.2.4", "192.168.1.1", "169.254.1.1", "100.64.0.1", "0.0.0.0", "224.0.0.1"]) {
    assert.equal(isPublicIp(ip), false, ip);
  }
  assert.equal(isPublicIp("93.184.216.34"), true);
});

test("isPublicIp rejects private and reserved IPv6 addresses", () => {
  for (const ip of ["::1", "::", "fc00::1", "fe80::1", "ff02::1", "::ffff:127.0.0.1"]) {
    assert.equal(isPublicIp(ip), false, ip);
  }
  assert.equal(isPublicIp("2606:2800:220:1:248:1893:25c8:1946"), true);
});
