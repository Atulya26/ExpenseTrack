import "./globals.css"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Expensee Splitter",
  description: "Split bills fairly among friends",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
