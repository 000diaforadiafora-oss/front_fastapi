import { useMemo, useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { ScrollArea } from "./ui/scroll-area";
import { Badge } from "./ui/badge";
import { cn } from "../lib/utils";

export type Batch = {
  id: string;
  name: string;
  samples: Sample[];
};

export type Sample = {
  id: string;
  name: string;
  images: number;
};

export type BatchBarProps = {
  onSelectSample?: (batch: Batch, sample: Sample) => void;
};

export function BatchBar({ onSelectSample }: BatchBarProps) {
  const [batches, setBatches] = useState<Batch[]>(() => [createBatch(1)]);
  const [activeIds, setActiveIds] = useState<{ batchId: string; sampleId: string | null }>(() => ({
    batchId: batches[0]?.id ?? "",
    sampleId: batches[0]?.samples[0]?.id ?? null,
  }));

  const currentBatch = useMemo(() => batches.find((batch) => batch.id === activeIds.batchId) ?? batches[0], [
    activeIds.batchId,
    batches,
  ]);

  const handleNewBatch = () => {
    setBatches((prev) => {
      const next = [...prev, createBatch(prev.length + 1)];
      return next;
    });
  };

  const handleAddSample = () => {
    setBatches((prev) =>
      prev.map((batch) => {
        if (batch.id !== (currentBatch?.id ?? "")) return batch;
        const sample = createSample(batch.samples.length + 1);
        return { ...batch, samples: [...batch.samples, sample] };
      })
    );
  };

  const handleSelectSample = (batch: Batch, sample: Sample) => {
    setActiveIds({ batchId: batch.id, sampleId: sample.id });
    onSelectSample?.(batch, sample);
  };

  return (
    <Card className="flex h-full w-full flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Batches</CardTitle>
      </CardHeader>
      <CardContent className="flex h-full flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={handleNewBatch} variant="outline">
            New batch
          </Button>
          <Button size="sm" onClick={handleAddSample} disabled={!currentBatch}>
            Add sample
          </Button>
        </div>
        <ScrollArea className="h-[420px]">
          <div className="space-y-4 pr-2">
            {batches.map((batch) => (
              <div key={batch.id} className="space-y-2">
                <div
                  className={cn(
                    "flex items-center justify-between rounded-xl border px-3 py-2 text-sm font-medium",
                    batch.id === activeIds.batchId ? "border-primary bg-primary/5" : "border-transparent bg-muted/60"
                  )}
                >
                  <button
                    type="button"
                    className="text-left"
                    onClick={() => setActiveIds({ batchId: batch.id, sampleId: batch.samples[0]?.id ?? null })}
                  >
                    {batch.name}
                  </button>
                  <Badge variant="outline">{batch.samples.length} samples</Badge>
                </div>
                <div className="space-y-2 pl-3">
                  {batch.samples.map((sample) => (
                    <button
                      key={sample.id}
                      type="button"
                      onClick={() => handleSelectSample(batch, sample)}
                      className={cn(
                        "flex w-full items-center justify-between rounded-lg border px-3 py-2 text-sm transition",
                        batch.id === activeIds.batchId && sample.id === activeIds.sampleId
                          ? "border-primary bg-primary/10"
                          : "border-border bg-background hover:bg-muted"
                      )}
                    >
                      <span>{sample.name}</span>
                      <span className="text-xs text-muted-foreground">{sample.images} images</span>
                    </button>
                  ))}
                  {batch.samples.length === 0 && (
                    <p className="text-xs text-muted-foreground">No samples yet.</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function createBatch(index: number): Batch {
  const batchId = `batch-${index}`;
  return {
    id: batchId,
    name: `Batch ${index}`,
    samples: [createSample(1)],
  };
}

function createSample(index: number): Sample {
  return {
    id: `sample-${index}-${Math.random().toString(36).slice(2, 6)}`,
    name: `Sample ${index}`,
    images: 0,
  };
}
