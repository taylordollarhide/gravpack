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
      { rel: 'preload', as: 'image', href: '/GravPack-app-logo-white.png' },
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
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}
