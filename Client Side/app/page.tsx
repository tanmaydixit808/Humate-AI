// app/page.tsx
import { Public_Sans } from "next/font/google";
import { HomeClient } from './HomeClient';

const publicSans400 = Public_Sans({ weight: "400", subsets: ["latin"] });

export default function Page() {
  return (
    <html lang="en" className={`h-full ${publicSans400.className}`}>
      <body className="h-full">
        <HomeClient />
      </body>
    </html>
  );
}