
"use client";

import dynamic from "next/dynamic";

import { useFarm } from "@/contexts/farm-context";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// Dynamically import the map component to avoid SSR issues with Leaflet
const FieldMap = dynamic(
  () => import("@/components/FieldMap"),
  { 
    ssr: false,
    loading: () => <Skeleton className="h-full w-full" />,
  }
);

export default function CropHealthPage() {
  const { selectedFarm } = useFarm();

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      <div className="mx-auto grid w-full max-w-4xl items-start gap-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold md:text-4xl font-headline">Crop Health Map</h1>
          <p className="text-muted-foreground mt-2">
            Satellite NDVI map showing crop health and stress levels for {selectedFarm.name}.
          </p>
        </div>
        <Card className="h-[60vh] md:h-[70vh]">
          <CardContent className="p-0 h-full relative">
            <FieldMap 
              key={selectedFarm.id}
              mapId={`fieldmap-${selectedFarm.id}`}
              center={selectedFarm.center} 
              geoJson={selectedFarm.fieldGeoJson} 
            />
          </CardContent>
        </Card>
        <Card>
            <CardHeader>
                <CardTitle>NDVI Legend</CardTitle>
                <CardDescription>
                    This map visualizes the Normalized Difference Vegetation Index (NDVI). Higher values (greener) indicate healthier, denser vegetation.
                </CardDescription>
            </CardHeader>
            <CardContent>
                 <div className="h-4 w-full rounded-full bg-gradient-to-r from-red-600 via-yellow-400 to-green-600"></div>
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>Low Health (Stress)</span>
                     <span>Moderate Health</span>
                    <span>High Health (Vigorous)</span>
                </div>
            </CardContent>
        </Card>
      </div>
    </main>
  );
}
