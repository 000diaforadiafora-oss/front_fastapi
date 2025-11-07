import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import type { Box, DetectResponse } from "../types";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import { exportClientZip } from "../utils/yolo";
import { cn } from "../lib/utils";

const DEFAULT_CLASS = "cfu";
const POLY_THRESHOLD = 12; // pixels

type AnnotatedViewerProps = {
  result: DetectResponse | null;
  file: File | null;
  onUpdate: (boxes: Box[]) => void;
};

type EditorBox = Box & { id: string };

type Mode = "rect" | "poly";

type Point = { x: number; y: number };

export function AnnotatedViewer({ result, file, onUpdate }: AnnotatedViewerProps) {
  const [boxes, setBoxes] = useState<EditorBox[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [mode, setMode] = useState<Mode>("rect");
  const [draftRect, setDraftRect] = useState<EditorBox | null>(null);
  const drawOrigin = useRef<Point | null>(null);
  const [dragState, setDragState] = useState<{ index: number; offsetX: number; offsetY: number } | null>(null);
  const [polyPoints, setPolyPoints] = useState<Point[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [showModelOverlay, setShowModelOverlay] = useState(false);

  const overlayRef = useRef<SVGSVGElement | null>(null);
  const triggerClientExport = useCallback(async () => {
    if (!file) {
      setMessage("Select or capture an image to export.");
      return;
    }
    await exportClientZip(file, boxes.map(({ id, ...box }) => box), {
      cfu: 0,
      "cfu-white": 1,
    });
    setMessage("Client ZIP exported.");
  }, [boxes, file]);


  const filePreview = useMemo(() => {
    if (!file) return null;
    return URL.createObjectURL(file);
  }, [file]);

  useEffect(() => {
    if (!filePreview) return;
    return () => URL.revokeObjectURL(filePreview);
  }, [filePreview]);

  useEffect(() => {
    setShowModelOverlay(false);
  }, [file, result?.annotated_image]);

  useEffect(() => {
    if (!result) {
      setBoxes([]);
      setSelectedIndex(null);
      return;
    }
    const normalized = result.boxes.map<EditorBox>((box, index) => ({
      ...box,
      width: box.width ?? 0,
      height: box.height ?? 0,
      id: box.id ?? `box-${Date.now()}-${index}`,
    }));
    setBoxes(normalized);
    setSelectedIndex(null);
  }, [result]);

  useEffect(() => {
    onUpdate(boxes.map(({ id, ...box }) => box));
  }, [boxes, onUpdate]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Delete" && selectedIndex != null) {
        event.preventDefault();
        setBoxes((prev) => prev.filter((_, index) => index !== selectedIndex));
        setSelectedIndex(null);
        return;
      }
      if (mode === "poly") {
        if (event.key === "Enter" && polyPoints.length >= 3) {
          event.preventDefault();
          finalizePolygon();
        }
        if (event.key === "Escape" && polyPoints.length > 0) {
          event.preventDefault();
          setPolyPoints([]);
          setMessage(null);
        }
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void triggerClientExport();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedIndex, mode, polyPoints, triggerClientExport]);

  const findBoxAtPoint = (point: Point): number => {
    return boxes.findIndex((box) => {
      if (box.polygon && box.polygon.length >= 6) {
        return pointInPolygon(point, box.polygon);
      }
      const width = box.width ?? 0;
      const height = box.height ?? 0;
      return point.x >= box.x && point.x <= box.x + width && point.y >= box.y && point.y <= box.y + height;
    });
  };

  const pointInPolygon = (point: Point, coords: number[]): boolean => {
    let inside = false;
    for (let i = 0, j = coords.length - 2; i < coords.length; i += 2) {
      const xi = coords[i];
      const yi = coords[i + 1];
      const xj = coords[j];
      const yj = coords[j + 1];
      const intersect = yi > point.y !== yj > point.y && point.x < ((xj - xi) * (point.y - yi)) / (yj - yi + Number.EPSILON) + xi;
      if (intersect) inside = !inside;
      j = i;
    }
    return inside;
  };

  const screenToNormalized = (event: ReactPointerEvent) => {
    const overlay = overlayRef.current;
    if (!overlay) return { x: 0, y: 0 };
    const rect = overlay.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    return { x: clamp(x), y: clamp(y) };
  };

  const startRect = (point: Point) => {
    drawOrigin.current = point;
    const rectBox: EditorBox = {
      id: `rect-${Date.now()}`,
      class: DEFAULT_CLASS,
      x: point.x,
      y: point.y,
      width: 0,
      height: 0,
    };
    setDraftRect(rectBox);
  };

  const updateDraftRect = (point: Point) => {
    setDraftRect((prev) => {
      if (!prev) return prev;
      const origin = drawOrigin.current ?? prev;
      const x = Math.min(origin.x, point.x);
      const y = Math.min(origin.y, point.y);
      const width = Math.abs(point.x - origin.x);
      const height = Math.abs(point.y - origin.y);
      return { ...prev, x, y, width, height };
    });
  };

  const finalizeRect = () => {
    if (!draftRect) return;
    if ((draftRect.width ?? 0) < 0.005 || (draftRect.height ?? 0) < 0.005) {
      setDraftRect(null);
      return;
    }
    setBoxes((prev) => [...prev, { ...draftRect, width: draftRect.width ?? 0, height: draftRect.height ?? 0 }]);
    setDraftRect(null);
    drawOrigin.current = null;
  };

  const finalizePolygon = () => {
    if (polyPoints.length < 3) return;
    const polygon = polyPoints.flatMap((point) => [clamp(point.x), clamp(point.y)]);
    const newBox: EditorBox = {
      id: `poly-${Date.now()}`,
      class: DEFAULT_CLASS,
      x: 0,
      y: 0,
      polygon,
    };
    setBoxes((prev) => [...prev, newBox]);
    setPolyPoints([]);
    setMessage("Polygon added");
  };

  const handlePointerDown = (event: ReactPointerEvent) => {
    if (!overlayRef.current) return;
    const point = screenToNormalized(event);
    const hitIndex = findBoxAtPoint(point);
    if (hitIndex >= 0) {
      setSelectedIndex(hitIndex);
      if (mode === "rect" && boxes[hitIndex].polygon == null) {
        const box = boxes[hitIndex];
        const offsetX = point.x - box.x;
        const offsetY = point.y - box.y;
        setDragState({ index: hitIndex, offsetX, offsetY });
      }
      return;
    }

    setSelectedIndex(null);

    if (mode === "rect") {
      startRect(point);
    } else {
      const overlay = overlayRef.current;
      const scale = overlay.getBoundingClientRect();
      const pixelPoint = {
        x: point.x * scale.width,
        y: point.y * scale.height,
      };
      const vertexIndex = polyPoints.findIndex((vertex) => {
        const vx = vertex.x * scale.width;
        const vy = vertex.y * scale.height;
        return Math.hypot(vx - pixelPoint.x, vy - pixelPoint.y) < POLY_THRESHOLD;
      });
      if (vertexIndex >= 0) {
        setPolyPoints((prev) => prev.filter((_, index) => index !== vertexIndex));
      } else {
        setPolyPoints((prev) => [...prev, point]);
        setMessage("Press Enter to close polygon, Esc to cancel");
      }
    }
  };

  const handlePointerMove = (event: ReactPointerEvent) => {
    if (dragState) {
      const point = screenToNormalized(event);
      setBoxes((prev) =>
        prev.map((box, index) => {
          if (index !== dragState.index || box.polygon) return box;
          const width = box.width ?? 0;
          const height = box.height ?? 0;
          const nextX = clamp(point.x - dragState.offsetX);
          const nextY = clamp(point.y - dragState.offsetY);
          return {
            ...box,
            x: clamp(nextX, 0, 1 - width),
            y: clamp(nextY, 0, 1 - height),
          };
        })
      );
      return;
    }
    if (draftRect) {
      updateDraftRect(screenToNormalized(event));
    }
  };

  const handlePointerUp = () => {
    if (dragState) {
      setDragState(null);
      return;
    }
    if (draftRect) {
      finalizeRect();
    }
  };

  const handleClassChange = (index: number, value: string) => {
    setBoxes((prev) => prev.map((box, idx) => (idx === index ? { ...box, class: value } : box)));
  };

  const handleBoxValueChange = (index: number, field: "x" | "y" | "width" | "height", value: number) => {
    setBoxes((prev) =>
      prev.map((box, idx) => {
        if (idx !== index || box.polygon) return box;

        if (field === "x") {
          return { ...box, x: clamp(value) };
        }

        if (field === "y") {
          return { ...box, y: clamp(value) };
        }

        if (field === "width") {
          const maxWidth = 1 - box.x;
          return { ...box, width: clamp(value, 0.001, maxWidth) };
        }

        const maxHeight = 1 - box.y;
        return { ...box, height: clamp(value, 0.001, maxHeight) };
      })
    );
  };

  const handleDelete = (index: number) => {
    setBoxes((prev) => prev.filter((_, idx) => idx !== index));
    if (selectedIndex === index) {
      setSelectedIndex(null);
    }
  };

  const handlePolygonVertexChange = (index: number, vertexIndex: number, axis: "x" | "y", value: number) => {
    setBoxes((prev) =>
      prev.map((box, idx) => {
        if (idx !== index || !box.polygon) return box;
        const nextPolygon = [...box.polygon];
        nextPolygon[vertexIndex * 2 + (axis === "x" ? 0 : 1)] = clamp(value);
        return { ...box, polygon: nextPolygon };
      })
    );
  };

  const overlayChildren = useMemo(() => {
    const displayBoxes = draftRect ? [...boxes, draftRect] : boxes;
    return (
      <>
        {displayBoxes.map((box, index) => {
          if (box.polygon && box.polygon.length >= 6) {
            const points = box.polygon.reduce<string>((acc, value, idx) => {
              const prefix = idx % 2 === 0 ? `${acc}${value},` : `${acc}${value} `;
              return prefix;
            }, "");
            return (
              <polygon
                key={box.id}
                points={points.trim()}
                className={cn(
                  "fill-primary/10 stroke-2",
                  selectedIndex === index ? "stroke-primary" : "stroke-amber-400"
                )}
              />
            );
          }
          const width = box.width ?? 0;
          const height = box.height ?? 0;
          return (
            <rect
              key={box.id}
              x={box.x}
              y={box.y}
              width={width}
              height={height}
              className={cn(
                "fill-primary/10 stroke-2",
                selectedIndex === index ? "stroke-primary" : "stroke-emerald-400"
              )}
            />
          );
        })}
        {mode === "poly" && polyPoints.length > 0 && (
          <polyline
            points={polyPoints.map((point) => `${point.x},${point.y}`).join(" ")}
            className="fill-transparent stroke-yellow-400 stroke-[2]"
          />
        )}
      </>
    );
  }, [boxes, draftRect, selectedIndex, mode, polyPoints]);

  const baseImage = useMemo(() => {
    if (filePreview) return filePreview;
    if (result?.annotated_image) return result.annotated_image;
    return "";
  }, [filePreview, result?.annotated_image]);

  const displayImage = useMemo(() => {
    if (showModelOverlay) {
      return result?.annotated_image ?? baseImage;
    }
    return baseImage;
  }, [baseImage, result?.annotated_image, showModelOverlay]);

  const hasData = Boolean(displayImage);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Annotations</CardTitle>
        <CardDescription>
          {hasData ? "Edit detections, toggle between rectangle and polygon drawing modes, and export labels." : "Run a detection to view annotations."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <Tabs value={mode} onValueChange={(value) => setMode(value as Mode)}>
            <TabsList>
              <TabsTrigger value="rect">Rectangle</TabsTrigger>
              <TabsTrigger value="poly">Polygon</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button variant="outline" onClick={() => setBoxes([])} disabled={boxes.length === 0}>
            Clear all
          </Button>
          <Button onClick={triggerClientExport} disabled={!file || boxes.length === 0}>
            Export client ZIP
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowModelOverlay((prev) => !prev)}
            disabled={!result?.annotated_image && !filePreview}
          >
            {showModelOverlay ? "Show original" : "Show model overlay"}
          </Button>
          {message && <Badge variant="outline">{message}</Badge>}
        </div>
        <div className="relative max-h-[560px] w-full overflow-hidden rounded-2xl border bg-black/10">
          {hasData ? (
            <>
              <img
                src={displayImage}
                alt="Annotated"
                className="block h-full w-full object-contain"
              />
              <svg
                ref={overlayRef}
                viewBox="0 0 1 1"
                preserveAspectRatio="none"
                className="pointer-events-auto absolute inset-0 h-full w-full"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
              >
                {overlayChildren}
                {mode === "poly" && polyPoints.length > 0 &&
                  polyPoints.map((point, index) => (
                    <circle key={`poly-${index}`} cx={point.x} cy={point.y} r={0.01} className="fill-yellow-300" />
                  ))}
              </svg>
            </>
          ) : (
            <div className="flex h-72 w-full items-center justify-center text-sm text-muted-foreground">
              Awaiting detection results.
            </div>
          )}
        </div>

        {boxes.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Objects</h3>
            <div className="grid gap-4 md:grid-cols-2">
              {boxes.map((box, index) => (
                <div
                  key={box.id}
                  className={cn(
                    "space-y-3 rounded-2xl border p-4",
                    selectedIndex === index ? "border-primary shadow" : "border-border"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      #{index + 1}
                      <Badge variant={box.class === "cfu-white" ? "secondary" : "outline"}>{box.class}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={box.class}
                        onChange={(event) => handleClassChange(index, event.target.value)}
                        className="h-9 rounded-lg border border-input px-2 text-sm"
                      >
                        <option value="cfu">cfu</option>
                        <option value="cfu-white">cfu-white</option>
                      </select>
                      <Button size="sm" variant="destructive" onClick={() => handleDelete(index)}>
                        Delete
                      </Button>
                    </div>
                  </div>
                  {box.polygon && box.polygon.length >= 6 ? (
                    <div className="space-y-2 text-xs">
                      {Array.from({ length: box.polygon.length / 2 }).map((_, vertexIndex) => {
                        const polygon = box.polygon;
                        if (!polygon) return null;
                        const xValue = polygon[vertexIndex * 2] ?? 0;
                        const yValue = polygon[vertexIndex * 2 + 1] ?? 0;
                        return (
                          <div key={vertexIndex} className="grid grid-cols-2 gap-2">
                            <label className="space-y-1">
                              <span className="block text-[10px] uppercase tracking-wider text-muted-foreground">x</span>
                              <Input
                                type="number"
                                step="0.001"
                                min={0}
                                max={1}
                                value={xValue.toFixed(3)}
                                onChange={(event) =>
                                  handlePolygonVertexChange(index, vertexIndex, "x", Number(event.target.value) || 0)
                                }
                              />
                            </label>
                            <label className="space-y-1">
                              <span className="block text-[10px] uppercase tracking-wider text-muted-foreground">y</span>
                              <Input
                                type="number"
                                step="0.001"
                                min={0}
                                max={1}
                                value={yValue.toFixed(3)}
                                onChange={(event) =>
                                  handlePolygonVertexChange(index, vertexIndex, "y", Number(event.target.value) || 0)
                                }
                              />
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3 text-xs md:grid-cols-4">
                      <label className="space-y-1">
                        <span className="block text-[10px] uppercase tracking-wider text-muted-foreground">x</span>
                        <Input
                          type="number"
                          step="0.001"
                          min={0}
                          max={1}
                          value={(box.x ?? 0).toFixed(3)}
                          onChange={(event) => handleBoxValueChange(index, "x", Number(event.target.value) || 0)}
                        />
                      </label>
                      <label className="space-y-1">
                        <span className="block text-[10px] uppercase tracking-wider text-muted-foreground">y</span>
                        <Input
                          type="number"
                          step="0.001"
                          min={0}
                          max={1}
                          value={(box.y ?? 0).toFixed(3)}
                          onChange={(event) => handleBoxValueChange(index, "y", Number(event.target.value) || 0)}
                        />
                      </label>
                      <label className="space-y-1">
                        <span className="block text-[10px] uppercase tracking-wider text-muted-foreground">w</span>
                        <Input
                          type="number"
                          step="0.001"
                          min={0.001}
                          max={1}
                          value={(box.width ?? 0).toFixed(3)}
                          onChange={(event) => handleBoxValueChange(index, "width", Number(event.target.value) || 0)}
                        />
                      </label>
                      <label className="space-y-1">
                        <span className="block text-[10px] uppercase tracking-wider text-muted-foreground">h</span>
                        <Input
                          type="number"
                          step="0.001"
                          min={0.001}
                          max={1}
                          value={(box.height ?? 0).toFixed(3)}
                          onChange={(event) => handleBoxValueChange(index, "height", Number(event.target.value) || 0)}
                        />
                      </label>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-col items-start gap-2 text-xs text-muted-foreground">
        <p>
          Tips: drag on the image to draw boxes • click a shape to select • Delete key removes selection • Ctrl/⌘ + S exports
          the edited labels as a ZIP.
        </p>
        {polyPoints.length > 0 && <p>Polygon in progress: {polyPoints.length} vertices</p>}
      </CardFooter>
    </Card>
  );
}

function clamp(value: number, min = 0, max = 1) {
  return Math.min(Math.max(value, min), max);
}
