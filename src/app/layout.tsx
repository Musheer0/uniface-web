import type { Metadata } from "next";
import { Geist, Geist_Mono ,Host_Grotesk} from "next/font/google";
import "./globals.css";

const font = Host_Grotesk({
  subsets:["latin"]
})

export const metadata: Metadata = {
  title: "Uniface",
  description: "A Face Blurring Platform",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${font.className}  h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
