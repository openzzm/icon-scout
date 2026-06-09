export function detectImageMetadata(buffer, contentType = "") {
  const type = contentType.toLowerCase();
  if ((type.includes("png") || buffer.subarray(1, 4).toString() === "PNG") && buffer.length >= 24) {
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20), format: "png" };
  }
  if ((type.includes("icon") || type.includes("ico")) && buffer.length >= 8) {
    return { width: buffer[6] || 256, height: buffer[7] || 256, format: "ico" };
  }
  if (type.includes("gif") && buffer.length >= 10) {
    return { width: buffer.readUInt16LE(6), height: buffer.readUInt16LE(8), format: "gif" };
  }
  if (type.includes("svg") || buffer.subarray(0, 256).toString().includes("<svg")) {
    const text = buffer.subarray(0, 4096).toString();
    const width = Number(text.match(/\bwidth=["']?([\d.]+)/i)?.[1] ?? 0);
    const height = Number(text.match(/\bheight=["']?([\d.]+)/i)?.[1] ?? 0);
    const viewBox = text.match(/\bviewBox=["'][^"']*\s([\d.]+)\s([\d.]+)["']/i);
    return { width: width || Number(viewBox?.[1] ?? 0), height: height || Number(viewBox?.[2] ?? 0), format: "svg" };
  }
  if ((type.includes("jpeg") || type.includes("jpg")) && buffer.length > 4) {
    let offset = 2;
    while (offset + 9 < buffer.length) {
      const marker = buffer[offset + 1];
      const length = buffer.readUInt16BE(offset + 2);
      if (marker >= 0xc0 && marker <= 0xc3) {
        return { width: buffer.readUInt16BE(offset + 7), height: buffer.readUInt16BE(offset + 5), format: "jpg" };
      }
      if (length < 2) break;
      offset += length + 2;
    }
  }
  return { width: 0, height: 0, format: type.split("/")[1]?.split("+")[0] ?? "" };
}
