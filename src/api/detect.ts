import { postForm, postFormBlob } from "./client";
import type { DetectResponse } from "../types";

const DETECT_PATH = "/detect/";
const DOWNLOAD_PATH = "/detect/download/";

export async function detect(file: File): Promise<DetectResponse> {
  const formData = new FormData();
  formData.append("file", file);
  return postForm<DetectResponse>(DETECT_PATH, formData);
}

export async function downloadZip(file: File): Promise<void> {
  const formData = new FormData();
  formData.append("file", file);
  const blob = await postFormBlob(DOWNLOAD_PATH, formData);
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "detection_results.zip";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}
