"use client"

import * as React from "react"
import "lightgallery/css/lightgallery.css"
import "lightgallery/css/lg-thumbnail.css"
import "lightgallery/css/lg-zoom.css"

type LightGalleryFactory = (typeof import("lightgallery"))["default"]

type LightGalleryInstance = {
  openGallery: (index?: number) => void
  destroy: () => void
}

function escapeHtml(text: string) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

interface ImageLightboxProps {
  src: string
  alt?: string
  children: React.ReactNode
  className?: string
}

export function ImageLightbox({ src, alt = "", children, className }: ImageLightboxProps) {
  const hostRef = React.useRef<HTMLSpanElement | null>(null)
  const instanceRef = React.useRef<LightGalleryInstance | null>(null)

  const destroyGallery = React.useCallback(() => {
    if (instanceRef.current) {
      instanceRef.current.destroy()
      instanceRef.current = null
    }
  }, [])

  const initGallery = React.useCallback(async () => {
    if (!hostRef.current || !src) return null
    if (instanceRef.current) return instanceRef.current

    const [{ default: lightGallery }, { default: lgThumbnail }, { default: lgZoom }] = await Promise.all([
      import("lightgallery") as Promise<{ default: LightGalleryFactory }>,
      import("lightgallery/plugins/thumbnail"),
      import("lightgallery/plugins/zoom"),
    ])

    const subHtml = alt ? `<div class="text-sm">${escapeHtml(alt)}</div>` : ""

    instanceRef.current = lightGallery(hostRef.current, {
      dynamic: true,
      dynamicEl: [{ src, thumb: src, subHtml }],
      plugins: [lgThumbnail, lgZoom],
      speed: 500,
      thumbnail: true,
      showCloseIcon: true,
      download: false,
      counter: false,
      hideScrollbar: true,
    }) as LightGalleryInstance

    return instanceRef.current
  }, [alt, src])

  const onOpen = React.useCallback(
    async (e: React.MouseEvent<HTMLSpanElement>) => {
      e.preventDefault()
      e.stopPropagation()
      const gallery = await initGallery()
      gallery?.openGallery(0)
    },
    [initGallery],
  )

  React.useEffect(() => {
    destroyGallery()
  }, [destroyGallery, alt, src])

  React.useEffect(() => destroyGallery, [destroyGallery])

  if (!src) return <>{children}</>

  return (
    <span ref={hostRef} className={`cursor-zoom-in ${className ?? "contents"}`} onClick={onOpen}>
      {children}
    </span>
  )
}
