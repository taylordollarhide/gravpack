import { createRootRoute, HeadContent, Scripts, createFileRoute, lazyRouteComponent, createRouter } from "@tanstack/react-router";
import { jsxs, jsx } from "react/jsx-runtime";
const Route$1 = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1.0, viewport-fit=cover, interactive-widget=resizes-visual" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "GravPack" },
      { name: "application-name", content: "GravPack" },
      { name: "theme-color", content: "#080b10" },
      { title: "GravPack — Know What You Have" },
      { property: "og:title", content: "GravPack — Know What You Have" },
      { property: "og:description", content: "Preparedness without the paranoia. Track your pantry, water, medications, and go-bags in one clean system." },
      { property: "og:image", content: "https://gravpackwebsite.netlify.app/og-image.png" },
      { property: "og:image:width", content: "1270" },
      { property: "og:image:height", content: "840" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "GravPack — Know What You Have" },
      { name: "twitter:description", content: "Preparedness without the paranoia. Track your pantry, water, medications, and go-bags in one clean system." },
      { name: "twitter:image", content: "https://gravpackwebsite.netlify.app/og-image.png" }
    ],
    links: [
      { rel: "preload", as: "image", href: "/GravPack-stacked-logo.png" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "icon", type: "image/png", sizes: "192x192", href: "/app-icon-192.png" },
      { rel: "icon", type: "image/png", sizes: "512x512", href: "/app-icon-512.png" },
      { rel: "apple-touch-icon", sizes: "192x192", href: "/app-icon-192.png" },
      { rel: "apple-touch-icon", sizes: "512x512", href: "/app-icon-512.png" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/icon?family=Material+Icons" }
    ]
  }),
  shellComponent: RootDocument
});
function RootDocument({ children }) {
  return /* @__PURE__ */ jsxs("html", { lang: "en", children: [
    /* @__PURE__ */ jsxs("head", { children: [
      /* @__PURE__ */ jsx(HeadContent, {}),
      /* @__PURE__ */ jsx("meta", { property: "og:title", content: "GravPack — Know What You Have" }),
      /* @__PURE__ */ jsx("meta", { property: "og:description", content: "Preparedness without the paranoia. Track your pantry, water, medications, and go-bags in one clean system." }),
      /* @__PURE__ */ jsx("meta", { property: "og:image", content: "https://gravpackwebsite.netlify.app/og-image.png" }),
      /* @__PURE__ */ jsx("meta", { property: "og:image:width", content: "1270" }),
      /* @__PURE__ */ jsx("meta", { property: "og:image:height", content: "840" }),
      /* @__PURE__ */ jsx("meta", { property: "og:type", content: "website" }),
      /* @__PURE__ */ jsx("meta", { name: "twitter:card", content: "summary_large_image" }),
      /* @__PURE__ */ jsx("meta", { name: "twitter:image", content: "https://gravpackwebsite.netlify.app/og-image.png" }),
      /* @__PURE__ */ jsx("style", { dangerouslySetInnerHTML: { __html: `
          #gp-splash {
            position: fixed;
            inset: 0;
            background: #080b10;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            transition: opacity 0.4s ease-out;
          }
          #gp-splash.fade-out {
            opacity: 0;
            pointer-events: none;
          }
          #gp-splash.hidden {
            display: none;
          }
          .gp-splash-logo {
            width: min(260px, 70vw);
          }
          .gp-splash-spinner-wrap {
            position: absolute;
            bottom: 20%;
            left: 0;
            right: 0;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 12px;
          }
          .gp-splash-spinner {
            width: 36px;
            height: 36px;
            border: 2px solid rgba(255,255,255,.10);
            border-top-color: #e31c23;
            border-radius: 50%;
            animation: gp-spin 0.8s linear infinite;
          }
          .gp-splash-label {
            font-family: 'Inter', 'Helvetica Neue', sans-serif;
            font-size: 11px;
            font-weight: 600;
            color: #6b7480;
            text-transform: uppercase;
            letter-spacing: 2px;
            animation: gp-pulse 1.6s ease-in-out infinite;
          }
          @keyframes gp-spin {
            to { transform: rotate(360deg); }
          }
          @keyframes gp-pulse {
            0%, 100% { opacity: 0.4; }
            50% { opacity: 1; }
          }
        ` } })
    ] }),
    /* @__PURE__ */ jsxs("body", { children: [
      /* @__PURE__ */ jsxs("div", { id: "gp-splash", children: [
        /* @__PURE__ */ jsx(
          "img",
          {
            src: "/GravPack-stacked-logo.png",
            alt: "GravPack",
            className: "gp-splash-logo"
          }
        ),
        /* @__PURE__ */ jsxs("div", { className: "gp-splash-spinner-wrap", children: [
          /* @__PURE__ */ jsx("div", { className: "gp-splash-spinner" }),
          /* @__PURE__ */ jsx("div", { className: "gp-splash-label", children: "Loading" })
        ] })
      ] }),
      children,
      /* @__PURE__ */ jsx(Scripts, {}),
      /* @__PURE__ */ jsx("script", { dangerouslySetInnerHTML: { __html: `
          (function() {
            // Apply saved theme before app renders to avoid flash
            try {
              var t = localStorage.getItem('gravpack_theme');
              if (t === 'dark' || t === 'light') {
                document.documentElement.setAttribute('data-theme', t);
              }
            } catch(e) {}



            function dismiss() {
              var el = document.getElementById('gp-splash');
              if (!el) return;
              el.classList.add('fade-out');
              setTimeout(function() {
                el.classList.add('hidden');
              }, 420);
            }
            if (document.readyState === 'complete') {
              setTimeout(dismiss, 2000);
            } else {
              window.addEventListener('load', function() {
                setTimeout(dismiss, 2000);
              });
            }
          })();
        ` } })
    ] })
  ] });
}
const $$splitComponentImporter = () => import("./index-Kif_MPuo.js");
const Route = createFileRoute("/")({
  component: lazyRouteComponent($$splitComponentImporter, "component")
});
const IndexRoute = Route.update({
  id: "/",
  path: "/",
  getParentRoute: () => Route$1
});
const rootRouteChildren = {
  IndexRoute
};
const routeTree = Route$1._addFileChildren(rootRouteChildren)._addFileTypes();
const getRouter = () => {
  const router = createRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreloadStaleTime: 0
  });
  return router;
};
export {
  getRouter
};
