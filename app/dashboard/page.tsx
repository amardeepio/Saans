import type { Metadata } from "next";
import { DashboardApp } from "@/components/DashboardApp";

export const metadata: Metadata = {
  title: "India city air dashboard — Saans",
  description:
    "Live AQI, weather in Celsius and major pollutant readings for major Indian cities. Search any city or district in India.",
};

export default function DashboardPage() {
  return <DashboardApp />;
}
