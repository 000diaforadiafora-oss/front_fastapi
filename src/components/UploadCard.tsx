import { useEffect, useMemo, useState } from "react";
import { detect, downloadZip } from "../api/detect";
import type { DetectResponse } from "../types";
import { WebcamCapture } from "./WebcamCapture";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Badge } from "./ui/badge";

export type UploadCardProps = {
  onResult: (result: DetectResponse, file: File) => void;
  onFileChange?: (file: File | null) => void;
};

export function UploadCard({ onResult, onFileChange }: UploadCardProps) {
  const [activeTab, setActiveTab] = useState("upload");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [lastResponse, setLastResponse] = useState<DetectResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const previewInfo = useMemo(() => {
    if (!file) return null;
    const sizeKb = (file.size / 1024).toFixed(1);
    return `${file.name} • ${sizeKb} KB`;
  }, [file]);

  const handleFileSelect = (nextFile: File | null) => {
    setFile(nextFile);
    setLastResponse(null);
    setError(null);
    onFileChange?.(nextFile);
  };

  const handleDetect = async () => {
    if (!file) {
      setError("Please select an image first.");
      return;
    }
    try {
      setIsDetecting(true);
      setError(null);
      const response = await detect(file);
      const normalized: DetectResponse = {
        ...response,
        boxes: response.boxes ?? [],
      };
      setLastResponse(normalized);
      onResult(normalized, file);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Detection failed");
    } finally {
      setIsDetecting(false);
    }
  };

  const handleDownload = async () => {
    if (!file) {
      setError("Select an image to download results.");
      return;
    }
    try {
      await downloadZip(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download failed");
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Detect CFU colonies</CardTitle>
        <CardDescription>
          Upload an image or capture from the webcam to run the detector hosted at countex.space.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="upload">Upload</TabsTrigger>
            <TabsTrigger value="webcam">Webcam</TabsTrigger>
          </TabsList>
          <TabsContent value="upload" className="space-y-3">
            <Input
              type="file"
              accept="image/*"
              onChange={(event) => handleFileSelect(event.target.files?.[0] ?? null)}
            />
            {previewUrl && (
              <img
                src={previewUrl}
                alt="Selected preview"
                className="h-56 w-full rounded-xl object-cover"
              />
            )}
          </TabsContent>
          <TabsContent value="webcam" className="space-y-4">
            <WebcamCapture
              disabled={activeTab !== "webcam"}
              onCapture={(captured) => {
                handleFileSelect(captured);
                setActiveTab("upload");
              }}
            />
          </TabsContent>
        </Tabs>

        {previewInfo && (
          <Badge variant="secondary" className="px-3 py-1">
            {previewInfo}
          </Badge>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
        {lastResponse && (
          <div className="rounded-xl border border-dashed border-muted p-4 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Detection ID: {lastResponse.image_id}</p>
            <p className="text-xs text-muted-foreground">
              {lastResponse.boxes.length} annotations returned
            </p>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-wrap gap-3">
        <Button onClick={handleDetect} disabled={isDetecting || !file}>
          {isDetecting ? "Detecting..." : "Detect"}
        </Button>
        <Button variant="outline" onClick={handleDownload} disabled={!file || isDetecting}>
          Download ZIP from server
        </Button>
      </CardFooter>
    </Card>
  );
}
