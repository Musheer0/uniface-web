import type { Metadata } from "next";
import { Geist, Geist_Mono ,Host_Grotesk} from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

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
      suppressHydrationWarning
      className={`${font.className}  h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
