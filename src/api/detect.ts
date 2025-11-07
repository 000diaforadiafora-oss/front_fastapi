import { postForm, postFormBlob } from "./client";
import type { DetectResponse } from "../types";

export async function detect(file: File): Promise<DetectResponse> {
  const formData = new FormData();
  formData.append("image", file);
  return postForm<DetectResponse>("/detect/", formData);
}

export async function downloadZip(file: File): Promise<void> {
  const formData = new FormData();
  formData.append("image", file);
  const blob = await postFormBlob("/detect/download/", formData);
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "detection_results.zip";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}
