import type { Metadata } from "next";
import "leaflet/dist/leaflet.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Punjab Industrial Survey | Field Monitoring",
  description: "Industrial survey field monitoring dashboard for Punjab, Pakistan. Demonstration prototype.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
