import type { Metadata } from "next"
import { Inter } from "next/font/google"
import Script from "next/script"
import { ConsentBanner } from "@/components/consent-banner"
import { CountryProvider } from "@/contexts/country-context"
import { MetaPixelPageView } from "@/components/meta-pixel-pageview"
import "./globals.css"
import "./app.css"

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })

export const metadata: Metadata = {
  title: {
    default: "mokhaLab",
    template: "%s | mokhaLab",
  },
  description:
    "Precision-engineered espresso tools for the serious barista. Tampers, distributors, WDT tools and more.",
  icons: {
    icon: [
      { url: "/favicon/favicon.ico", sizes: "48x48" },
      { url: "/favicon/favicon-96x96.png", sizes: "96x96", type: "image/png" },
      { url: "/favicon/favicon.svg", type: "image/svg+xml" },
    ],
    apple: { url: "/favicon/apple-touch-icon.png", sizes: "180x180" },
  },
  manifest: "/favicon/site.webmanifest",
  appleWebApp: {
    title: "mokhaLab",
  },
}

const GA_ID = "G-KB8P76B3Q1"

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Theme color for browser chrome */}
        <meta name="theme-color" content="#ffffff" />
        {/* Preload hero image for LCP */}
        <link rel="preload" as="image" href="/images/hero.webp" fetchPriority="high" />
        {/* Preconnect to Amazon CDN */}
        <link rel="preconnect" href="https://www.amazon.com" />
        <link rel="preconnect" href="https://www.amazon.ca" />
      </head>
      <body className={inter.variable}>
        <CountryProvider>
          {/*
           * Consent Mode v2 — default state (denied).
           * Must run BEFORE GA so Google tags start in denied mode.
           * The ConsentBanner component updates these values via dataLayer
           * once the user makes a choice.
           */}
          <Script id="consent-default" strategy="beforeInteractive">
            {`
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('consent', 'default', {
  analytics_storage: 'denied',
  ad_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
  wait_for_update: 500
});
gtag('set', 'ads_data_redaction', true);
gtag('set', 'url_passthrough', true);
            `}
          </Script>

          {/* Google Analytics (gtag.js) */}
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
            strategy="afterInteractive"
          />
          <Script id="ga-init" strategy="afterInteractive">
            {`
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_ID}');
            `}
          </Script>

          {/* Meta Pixel */}
          <Script id="meta-pixel" strategy="afterInteractive">
            {`
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}
(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init','981881587864717');
            `}
          </Script>
          <noscript>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              height="1"
              width="1"
              style={{ display: "none" }}
              src="https://www.facebook.com/tr?id=981881587864717&ev=PageView&noscript=1"
              alt=""
            />
          </noscript>

          {children}

          {/* Fires fbq PageView on every client-side route change */}
          <MetaPixelPageView />

          {/* Consent banner — renders client-side, hidden once user has chosen */}
          <ConsentBanner />
        </CountryProvider>
      </body>
    </html>
  )
}
