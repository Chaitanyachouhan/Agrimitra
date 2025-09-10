"use client";

import {
  ArrowUpRight,
  Cloud,
  CloudDrizzle,
  CloudRain,
  CloudSun,
  Droplets,
  FlaskConical,
  Languages,
  Map,
  ScanEye,
  Sun,
  TriangleAlert,
  Wind,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useFarm } from '@/contexts/farm-context';

const QUICK_LINKS = [
  {
    title: 'AI Crop Advisory',
    description: 'Get location-specific crop advice in your language.',
    href: '/crop-advisory',
    icon: Languages,
  },
  {
    title: 'Soil Health Guide',
    description: 'Personalized fertilizer and soil health tips.',
    href: '/soil-health',
    icon: FlaskConical,
  },
  {
    title: 'Pest & Disease Detection',
    description: 'Upload a photo to identify crop issues.',
    href: '/pest-detection',
    icon: ScanEye,
  },
  {
    title: 'Crop Health Map',
    description: 'View satellite NDVI map of your farm.',
    href: '/crop-health',
    icon: Map,
  },
];

const weatherForecast = [
  {day: 'Tomorrow', temp: '30°C', condition: 'Sunny', icon: Sun},
  {day: 'Wednesday', temp: '31°C', condition: 'Partly Cloudy', icon: CloudSun},
  {day: 'Thursday', temp: '28°C', condition: 'Light Rain', icon: CloudDrizzle},
  {day: 'Friday', temp: '27°C', condition: 'Rain', icon: CloudRain},
  {day: 'Saturday', temp: '29°C', condition: 'Cloudy', icon: Cloud},
];

export default function Dashboard() {
  const {selectedFarm} = useFarm();

  return (
    <main className="flex flex-1 flex-col">
      <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <div className="grid gap-4">
          <Card className="flex flex-col md:flex-row">
            <div className="flex flex-col justify-center p-6">
              <CardHeader>
                <CardTitle className="font-headline text-3xl md:text-4xl">
                  Welcome to {selectedFarm.name}!
                </CardTitle>
                <CardDescription className="text-lg">
                  Your smart farming assistant. Get personalized advice to grow
                  healthier crops and increase your yield.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild>
                  <Link href="/crop-advisory">
                    Get Started <ArrowUpRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </div>
            <div className="relative h-64 w-full shrink-0 md:h-auto md:w-1/3">
              <Image
                src={selectedFarm.image.src}
                alt={selectedFarm.image.alt}
                data-ai-hint={selectedFarm.image.hint}
                fill
                className="rounded-r-lg object-cover"
                key={selectedFarm.id}
              />
            </div>
          </Card>
        </div>
        <div className="grid grid-cols-1 gap-4 md:gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 grid gap-4 md:gap-8">
            <Card>
              <CardHeader>
                <CardTitle>Current Weather</CardTitle>
                <CardDescription>
                  Live conditions for {selectedFarm.location}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-6">
                  <CloudSun className="size-16 text-accent" />
                  <div>
                    <p className="text-4xl font-bold">
                      {selectedFarm.weather.temp}
                    </p>
                    <p className="text-md text-muted-foreground">
                      {selectedFarm.weather.condition}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Wind className="size-4 text-muted-foreground" />
                    <span>Wind: {selectedFarm.weather.wind}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Droplets className="size-4 text-muted-foreground" />
                    <span>Humidity: {selectedFarm.weather.humidity}</span>
                  </div>
                  <div className="flex items-center gap-2 col-span-2">
                    <Sun className="size-4 text-muted-foreground" />
                    <span>
                      UV Index:{' '}
                      <Badge
                        variant={
                          selectedFarm.weather.uvIndex === 'High' ||
                          selectedFarm.weather.uvIndex === 'Very High'
                            ? 'destructive'
                            : 'secondary'
                        }
                      >
                        {selectedFarm.weather.uvIndex}
                      </Badge>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CloudRain className="size-4 text-muted-foreground" />
                    <span>Precipitation: 10%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>5-Day Forecast</CardTitle>
                <CardDescription>
                  Weather for the upcoming days in {selectedFarm.location}
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {weatherForecast.map(day => (
                  <div
                    key={day.day}
                    className="flex flex-col items-center gap-2 rounded-lg border bg-card p-4 text-center"
                  >
                    <p className="font-semibold text-xs md:text-sm">
                      {day.day}
                    </p>
                    <day.icon className="size-8 md:size-10 text-accent" />
                    <p className="font-bold text-md md:text-lg">{day.temp}</p>
                    <p className="text-xs text-muted-foreground">
                      {day.condition}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
          <div className="grid gap-4 md:gap-8">
            <Card>
              <CardHeader className="flex flex-row items-center">
                <div className="grid gap-2">
                  <CardTitle>Market Prices</CardTitle>
                  <CardDescription>
                    Live prices from {selectedFarm.location}.
                  </CardDescription>
                </div>
                <Button asChild size="sm" className="ml-auto gap-1">
                  <Link href="/market-prices">
                    View All
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Crop</TableHead>
                      <TableHead className="text-right">
                        Price (per quintal)
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedFarm.crops.slice(0, 3).map(crop => (
                      <TableRow key={crop.name}>
                        <TableCell>
                          <div className="font-medium">{crop.name}</div>
                        </TableCell>
                        <TableCell className="text-right">
                          ₹{crop.price.toLocaleString('en-IN')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TriangleAlert className="text-destructive" />
                  Weather Alerts
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-4 rounded-lg border border-destructive/50 bg-destructive/10 p-4">
                  <TriangleAlert className="size-5 mt-1 shrink-0 text-destructive" />
                  <div>
                    <h3 className="font-semibold">High UV Index Today</h3>
                    <p className="text-sm text-muted-foreground">
                      {selectedFarm.weather.uvAlert} UV levels are high. It is
                      advised to take precautions if working outdoors for
                      extended periods.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4 rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-4">
                  <TriangleAlert className="size-5 mt-1 shrink-0 text-yellow-600 dark:text-yellow-500" />
                  <div>
                    <h3 className="font-semibold">
                      Chance of Thunderstorms
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Monitor weather updates. Plan to protect crops and
                      equipment from potential heavy rain and strong winds.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
          {QUICK_LINKS.map(link => (
            <Link href={link.href} key={link.title} className="flex">
              <Card className="flex flex-col w-full hover:bg-muted/50 transition-colors">
                <CardHeader>
                  <div className="mb-4 flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <link.icon className="size-6" />
                  </div>
                  <CardTitle>{link.title}</CardTitle>
                  <CardDescription>{link.description}</CardDescription>
                </CardHeader>
                <CardContent className="mt-auto">
                  <div className="flex items-center text-sm font-medium text-primary">
                    Go to feature <ArrowUpRight className="ml-2 h-4 w-4" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
