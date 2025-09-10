// src/app/api/ndvi/route.js

import ee from "@google/earthengine";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

// Use a global variable to track initialization state
let initialized = false;
let eeInitializePromise = null;

async function initEarthEngine() {
  if (initialized) {
    console.log("Earth Engine already initialized, skipping.");
    return;
  }

  if (eeInitializePromise) {
    return eeInitializePromise;
  }

  console.log("Initializing Earth Engine...");

  eeInitializePromise = new Promise((resolve, reject) => {
    try {
      const privateKey = JSON.parse(
        fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, "utf8")
      );

      ee.data.authenticateViaPrivateKey(
        privateKey,
        () => {
          ee.initialize(null, null, () => {
            initialized = true;
            console.log("✅ Earth Engine initialized successfully.");
            resolve();
          });
        },
        (err) => {
          console.error("Earth Engine authentication error:", err);
          initialized = false;
          eeInitializePromise = null;
          reject(err);
        }
      );
    } catch (err) {
      console.error("Earth Engine initialization error:", err);
      initialized = false;
      eeInitializePromise = null;
      reject(err);
    }
  });

  return eeInitializePromise;
}

export async function GET(req) {
  console.log("API route hit");
  try {
    // Await the initialization promise
    await initEarthEngine();

    // The rest of your code to fetch data
    const { searchParams } = new URL(req.url);
    const lat = searchParams.get("lat");
    const lon = searchParams.get("lon");

    if (!lat || !lon) {
      return new Response(JSON.stringify({ error: "lat and lon required" }), {
        status: 400,
      });
    }

    const region = ee.Geometry.Point([parseFloat(lon), parseFloat(lat)])
      .buffer(500)
      .bounds();

    const collection = ee
      .ImageCollection("COPERNICUS/S2_SR")
      .filterBounds(region)
      .filterDate("2024-01-01", "2024-12-31")
      .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", 20));

    const image = collection.median();
    const ndvi = image.normalizedDifference(["B8", "B4"]).rename("NDVI");

    // All ee.data calls need to be awaited
    const meanDict = await ndvi
      .reduceRegion({
        reducer: ee.Reducer.mean(),
        geometry: region,
        scale: 10,
        maxPixels: 1e9,
      })
      .getInfo();

    const visParams = { min: 0, max: 1, palette: ["red", "yellow", "green"] };
    const mapId = ndvi.getMap(visParams);

    return new Response(
      JSON.stringify({
        ndviValue: meanDict.NDVI || 0,
        mapUrl: mapId ? `https://earthengine.googleapis.com/map/${mapId.mapid}/{z}/{x}/{y}?token=${mapId.token}` : null,
      }),
      { status: 200 }
    );
  } catch (err) {
    console.error("NDVI API error:", err);
    return new Response(JSON.stringify({ error: "Failed to fetch NDVI" }), {
      status: 500,
    });
  }
}