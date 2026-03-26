import type { Metadata } from "next";
import "./globals.css";
import AuthProvider from "@/components/AuthProvider";

export const metadata: Metadata = {
  title: "Got It Guruji — AI-Powered Answers with Wisdom",
  description: "Ask Guruji anything — get clear, wise, and well-researched answers powered by AI. Learning | Guidance | Growth.",
  keywords: ["AI", "search", "Guruji", "answers", "learning", "guidance", "knowledge"],
  openGraph: {
    title: "Got It Guruji",
    description: "Ask Guruji anything — get clear, wise, and well-researched answers.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <div className="app-container">
            {children}
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
