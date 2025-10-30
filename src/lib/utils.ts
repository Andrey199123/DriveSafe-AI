import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function haversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function mpsToMph(mps: number): number {
  return mps * 2.23693629;
}

export function kphToMph(kph: number): number {
  return kph * 0.621371;
}

export function parseMaxspeedToMph(value: string): number | null {
  // Examples: "50", "50 km/h", "30 mph", "none"
  const v = value.trim().toLowerCase();
  if (v === 'none') return null;
  const num = parseFloat(v);
  if (Number.isNaN(num)) return null;
  if (v.includes('mph')) return num;
  // default assume km/h if unit missing per OSM in many regions
  return kphToMph(num);
}
