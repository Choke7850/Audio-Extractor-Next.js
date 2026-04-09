import React from "react"
import { cn } from "../lib/utils"

export interface ProgressiveBlurProps {
  className?: string
  height?: string
  position?: "top" | "bottom" | "both"
  blurLevels?: number[]
  children?: React.ReactNode
}

export function ProgressiveBlur({
  className,
  height = "30%",
  position = "bottom",
  blurLevels = [0.5, 1, 2, 4, 8, 16, 32, 64],
}: ProgressiveBlurProps) {
  const numLevels = blurLevels.length
  const step = 100 / numLevels
  
  // Create array for middle layers
  const divElements = Array(Math.max(0, numLevels - 2)).fill(null)
  
  return (
    <div
      className={cn(
        "gradient-blur pointer-events-none absolute inset-x-0 z-10",
        className,
        position === "top"
          ? "top-0"
          : position === "bottom"
            ? "bottom-0"
            : "inset-y-0"
      )}
      style={{
        height: position === "both" ? "100%" : height,
        background: position === "top" 
          ? 'linear-gradient(to bottom, rgba(17,17,17,0.7) 0%, rgba(17,17,17,0) 100%)'
          : position === "bottom"
          ? 'linear-gradient(to top, rgba(17,17,17,0.7) 0%, rgba(17,17,17,0) 100%)'
          : 'transparent'
      }}
    >
      {/* First blur layer */}
      <div
        className="absolute inset-0"
        style={{
          zIndex: 1,
          backdropFilter: `blur(${blurLevels[0]}px)`,
          WebkitBackdropFilter: `blur(${blurLevels[0]}px)`,
          maskImage:
            position === "bottom"
              ? `linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,1) ${step}%, rgba(0,0,0,1) ${step * 2}%, rgba(0,0,0,0) ${step * 3}%)`
              : position === "top"
                ? `linear-gradient(to top, rgba(0,0,0,0) 0%, rgba(0,0,0,1) ${step}%, rgba(0,0,0,1) ${step * 2}%, rgba(0,0,0,0) ${step * 3}%)`
                : `linear-gradient(rgba(0,0,0,0) 0%, rgba(0,0,0,1) 5%, rgba(0,0,0,1) 95%, rgba(0,0,0,0) 100%)`,
          WebkitMaskImage:
            position === "bottom"
              ? `linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,1) ${step}%, rgba(0,0,0,1) ${step * 2}%, rgba(0,0,0,0) ${step * 3}%)`
              : position === "top"
                ? `linear-gradient(to top, rgba(0,0,0,0) 0%, rgba(0,0,0,1) ${step}%, rgba(0,0,0,1) ${step * 2}%, rgba(0,0,0,0) ${step * 3}%)`
                : `linear-gradient(rgba(0,0,0,0) 0%, rgba(0,0,0,1) 5%, rgba(0,0,0,1) 95%, rgba(0,0,0,0) 100%)`,
        }}
      />
      {/* Middle blur layers */}
      {divElements.map((_, index) => {
        const blurIndex = index + 1
        const startPercent = blurIndex * step
        const midPercent = (blurIndex + 1) * step
        const endPercent = (blurIndex + 2) * step
        const maskGradient =
          position === "bottom"
            ? `linear-gradient(to bottom, rgba(0,0,0,0) ${startPercent}%, rgba(0,0,0,1) ${midPercent}%, rgba(0,0,0,1) ${endPercent}%, rgba(0,0,0,0) ${endPercent + step}%)`
            : position === "top"
              ? `linear-gradient(to top, rgba(0,0,0,0) ${startPercent}%, rgba(0,0,0,1) ${midPercent}%, rgba(0,0,0,1) ${endPercent}%, rgba(0,0,0,0) ${endPercent + step}%)`
              : `linear-gradient(rgba(0,0,0,0) 0%, rgba(0,0,0,1) 5%, rgba(0,0,0,1) 95%, rgba(0,0,0,0) 100%)`
        return (
          <div
            key={`blur-${index}`}
            className="absolute inset-0"
            style={{
              zIndex: index + 2,
              backdropFilter: `blur(${blurLevels[blurIndex]}px)`,
              WebkitBackdropFilter: `blur(${blurLevels[blurIndex]}px)`,
              maskImage: maskGradient,
              WebkitMaskImage: maskGradient,
            }}
          />
        )
      })}
      {/* Last blur layer */}
      <div
        className="absolute inset-0"
        style={{
          zIndex: numLevels,
          backdropFilter: `blur(${blurLevels[numLevels - 1]}px)`,
          WebkitBackdropFilter: `blur(${blurLevels[numLevels - 1]}px)`,
          maskImage:
            position === "bottom"
              ? `linear-gradient(to bottom, rgba(0,0,0,0) ${100 - step}%, rgba(0,0,0,1) 100%)`
              : position === "top"
                ? `linear-gradient(to top, rgba(0,0,0,0) ${100 - step}%, rgba(0,0,0,1) 100%)`
                : `linear-gradient(rgba(0,0,0,0) 0%, rgba(0,0,0,1) 5%, rgba(0,0,0,1) 95%, rgba(0,0,0,0) 100%)`,
          WebkitMaskImage:
            position === "bottom"
              ? `linear-gradient(to bottom, rgba(0,0,0,0) ${100 - step}%, rgba(0,0,0,1) 100%)`
              : position === "top"
                ? `linear-gradient(to top, rgba(0,0,0,0) ${100 - step}%, rgba(0,0,0,1) 100%)`
                : `linear-gradient(rgba(0,0,0,0) 0%, rgba(0,0,0,1) 5%, rgba(0,0,0,1) 95%, rgba(0,0,0,0) 100%)`,
        }}
      />
    </div>
  )
}
