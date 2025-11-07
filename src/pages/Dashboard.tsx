import { useState } from "react";
import { UploadCard } from "../components/UploadCard";
import { AnnotatedViewer } from "../components/AnnotatedViewer";
import { BatchBar } from "../components/BatchBar";
import type { Box, DetectResponse } from "../types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";

export function Dashboard() {
  const [activeTab, setActiveTab] = useState("detect");
  const [lastResult, setLastResult] = useState<DetectResponse | null>(null);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [editedBoxes, setEditedBoxes] = useState<Box[]>([]);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 p-6 lg:flex-row">
      <aside className="w-full shrink-0 lg:w-64">
        <BatchBar
          onSelectSample={() => {
            setActiveTab("detect");
          }}
        />
      </aside>
      <main className="flex w-full flex-1 flex-col gap-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="detect">Detect</TabsTrigger>
            <TabsTrigger value="exports">Exports</TabsTrigger>
          </TabsList>
          <TabsContent value="detect" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,360px)_1fr]">
              <UploadCard
                onResult={(result, file) => {
                  setLastResult(result);
                  setCurrentFile(file);
                  setEditedBoxes(result.boxes);
                }}
                onFileChange={(file) => {
                  setCurrentFile(file);
                  if (!file) {
                    setLastResult(null);
                    setEditedBoxes([]);
                  }
                }}
              />
              <AnnotatedViewer
                result={lastResult}
                file={currentFile}
                onUpdate={(boxes) => setEditedBoxes(boxes)}
              />
            </div>
          </TabsContent>
          <TabsContent value="exports">
            <Card>
              <CardHeader>
                <CardTitle>Exports</CardTitle>
                <CardDescription>
                  Download YOLO-ready archives either from the backend (raw detections) or from the local editor (after you make
                  adjustments).
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-muted-foreground">
                <p>
                  The latest detection produced {lastResult?.cfu_count ?? 0} colonies. Use the <strong>Export client ZIP</strong>
                  button in the Annotated tab to download the original image together with the edited labels.
                </p>
                <p>
                  Backend exports are available via the "Download ZIP from server" action in the detector card. Those contain the
                  model predictions without your manual tweaks.
                </p>
                <p>Client exports include both bounding boxes and polygons in the YOLO segmentation format.</p>
                <p>Current edited objects: <strong>{editedBoxes.length}</strong>.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
