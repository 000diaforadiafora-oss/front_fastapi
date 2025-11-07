import JSZip from "jszip";
import { saveAs } from "file-saver";
import type { Box } from "../types";

export function boxesToYoloLines(boxes: Box[], classMap: Record<string, number>): string {
  return boxes
    .map((box) => {
      const classId = classMap[box.class] ?? 0;
      if (box.polygon && box.polygon.length >= 6) {
        const coords = box.polygon.map((value) => value.toFixed(6)).join(" ");
        return `${classId} ${coords}`;
      }
      const width = box.width ?? 0;
      const height = box.height ?? 0;
      const xCenter = box.x + width / 2;
      const yCenter = box.y + height / 2;
      return `${classId} ${xCenter.toFixed(6)} ${yCenter.toFixed(6)} ${width.toFixed(6)} ${height.toFixed(6)}`;
    })
    .join("\n");
}

export async function exportClientZip(original: File, boxes: Box[], classMap: Record<string, number>): Promise<void> {
  const zip = new JSZip();
  const buffer = await original.arrayBuffer();
  const baseName = original.name.replace(/\.[^/.]+$/, "") || "image";
  zip.file(original.name, buffer);
  zip.file(`${baseName}.txt`, boxesToYoloLines(boxes, classMap));
  const blob = await zip.generateAsync({ type: "blob" });
  saveAs(blob, `${baseName}.zip`);
}
