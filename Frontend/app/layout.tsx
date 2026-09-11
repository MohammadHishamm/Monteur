import ErrorBoundary from "@/components/layout/Error/ErrorBoundary";
import { RealtimeNotificationProvider } from "@/components/realtime/notification-provider";
import { AppLoader } from "@/components/common/app-loader";
import type { Metadata } from "next";
import "./globals.css";
import { QueryClientProvider } from "./providers";

export const metadata: Metadata = {
  title: "مونتير · سوق مونتاج الفيديو بالذكاء الاصطناعي",
  description:
    "مونتير منصة عمل حر لمونتاج الفيديو في منطقة MENA. صف الفيديو اللي محتاجه، والذكاء الاصطناعي يطابقك مع أفضل مونتير — مع دفع مضمون (Escrow) وشو-ريل موثّق.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`h-full antialiased`}>
      <body className="min-h-full flex flex-col font-arabic">
            <QueryClientProvider>
              <ErrorBoundary>
                 <RealtimeNotificationProvider />
                <AppLoader>
                  {children}
                </AppLoader>
              </ErrorBoundary>
            </QueryClientProvider>
      </body>
    </html>
  );
}
