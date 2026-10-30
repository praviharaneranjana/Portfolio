// Prints materials, texture slots, embedded images and node names of a .glb (no dependencies).
// Usage: node inspect-glb.js public/models/gate.glb
import fs from "node:fs";

const buf = fs.readFileSync(process.argv[2]);
const jsonLength = buf.readUInt32LE(12);
const gltf = JSON.parse(buf.subarray(20, 20 + jsonLength).toString("utf8"));

console.log(`size: ${(buf.length / 1024).toFixed(0)} KB`);
console.log("extensions:", gltf.extensionsUsed ?? []);
for (const m of gltf.materials ?? []) {
  const pbr = m.pbrMetallicRoughness ?? {};
  const parts = [
    `metal=${pbr.metallicFactor ?? 1}`,
    `rough=${(pbr.roughnessFactor ?? 1).toFixed(2)}`,
    pbr.metallicRoughnessTexture ? "MR-tex" : "",
    m.normalTexture ? `normal(${(m.normalTexture.scale ?? 1).toFixed(2)})` : "",
    m.emissiveFactor ? "emissive" : "",
  ].filter(Boolean);
  console.log(`  ${m.name.padEnd(14)} ${parts.join("  ")}`);
}
console.log("images:");
for (const img of gltf.images ?? []) {
  console.log(`  ${img.name} ${img.mimeType} ${(gltf.bufferViews[img.bufferView].byteLength / 1024).toFixed(0)} KB`);
}
console.log("nodes:", (gltf.nodes ?? []).map((n) => n.name).join(", "));
