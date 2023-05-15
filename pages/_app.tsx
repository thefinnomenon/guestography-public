import { useRouter } from "next/router";
import "../styles/globals.css";
import type { AppProps } from "next/app";
import { useEffect } from "react";
import { track } from "../lib/mixpanel";

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();

  // Send track event when new pages is loaded
  useEffect(() => {
    const handleRouteChange = (url: string) => track("Page view", { url });
    router.events.on("routeChangeComplete", handleRouteChange);
    return () => {
      router.events.off("routeChangeComplete", handleRouteChange);
    };
  }, [router.events]);

  return (
    <Component {...pageProps} />
  );
}
