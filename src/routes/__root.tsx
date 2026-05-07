import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'
import '../styles.css'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1.0, viewport-fit=cover, interactive-widget=resizes-visual' },
      { name: 'apple-mobile-web-app-capable', content: 'yes' },
      { name: 'mobile-web-app-capable', content: 'yes' },
      { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
      { name: 'apple-mobile-web-app-title', content: 'GravPack' },
      { name: 'application-name', content: 'GravPack' },
      { name: 'theme-color', content: '#0d1117' },
      { title: 'GravPack — Know What You Have' },
    ],
    links: [
      { rel: 'preload', as: 'image', href: '/GravPack-stacked-logo.png' },
      { rel: 'manifest', href: '/manifest.webmanifest' },
      { rel: 'icon', type: 'image/png', sizes: '192x192', href: '/app-icon-192.png' },
      { rel: 'icon', type: 'image/png', sizes: '512x512', href: '/app-icon-512.png' },
      { rel: 'apple-touch-icon', sizes: '192x192', href: '/app-icon-192.png' },
      { rel: 'apple-touch-icon', sizes: '512x512', href: '/app-icon-512.png' },
    ],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
        <style dangerouslySetInnerHTML={{ __html: `
          #gp-splash {
            position: fixed;
            inset: 0;
            background: #0d1117;
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
            border: 2px solid #21262d;
            border-top-color: #C9A84C;
            border-radius: 50%;
            animation: gp-spin 0.8s linear infinite;
          }
          .gp-splash-label {
            font-family: 'DM Mono', 'Courier New', monospace;
            font-size: 11px;
            color: #484f58;
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
        ` }} />
      </head>
      <body>
        <div id="gp-splash">
          <img
            src="/GravPack-stacked-logo.png"
            alt="GravPack"
            className="gp-splash-logo"
          />
          <div className="gp-splash-spinner-wrap">
            <div className="gp-splash-spinner" />
            <div className="gp-splash-label">Loading</div>
          </div>
        </div>

        {children}
        <Scripts />

        <script dangerouslySetInnerHTML={{ __html: `
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
        ` }} />
      </body>
    </html>
  )
}
