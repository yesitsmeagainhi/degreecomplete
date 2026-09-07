"use client";
import Script from "next/script";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { track, type AnalyticsEvent } from "@/lib/analytics";

/** Loads GTM / GA4 / Meta Pixel when configured. No commercial data ever reaches these tags. */
export function AnalyticsScripts() {
  const gtm = process.env.NEXT_PUBLIC_GTM_ID;
  const ga = process.env.NEXT_PUBLIC_GA4_ID;
  const pixel = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const pathname = usePathname();
  useEffect(() => {
    if (typeof window !== "undefined" && window.fbq) window.fbq("track", "PageView");
  }, [pathname]);
  return (
    <>
      {gtm && (
        <Script id="gtm" strategy="afterInteractive">{`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtm}');`}</Script>
      )}
      {ga && !gtm && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${ga}`} strategy="afterInteractive" />
          <Script id="ga4" strategy="afterInteractive">{`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${ga}');`}</Script>
        </>
      )}
      {pixel && (
        <Script id="meta-pixel" strategy="afterInteractive">{`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${pixel}');fbq('track','PageView');`}</Script>
      )}
    </>
  );
}

/** Fires one analytics event when a page mounts. */
export function TrackView({ event, payload }: { event: AnalyticsEvent; payload?: Record<string, string | number | undefined> }) {
  useEffect(() => { track(event, payload); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [event]);
  return null;
}
