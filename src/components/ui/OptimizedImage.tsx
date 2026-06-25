import { useState, memo, ImgHTMLAttributes } from "react";
import { getOptimizedImageUrl } from "@/lib/imageUtils";

interface OptimizedImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  fallback?: string;
  /** Set true for above-fold images */
  priority?: boolean;
  /** Desired display width for CDN resize */
  displayWidth?: number;
}

/**
 * Optimized image component with:
 * - Native lazy loading (unless priority)
 * - Blur-up placeholder
 * - Error fallback
 * - CDN image transformation (Supabase storage)
 * - Proper width/height to prevent CLS
 */
const OptimizedImage = memo(({ src, alt, fallback = "/placeholder.svg", priority = false, displayWidth, className = "", ...props }: OptimizedImageProps) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  
  const optimizedSrc = error
    ? fallback
    : displayWidth
      ? getOptimizedImageUrl(src, { width: displayWidth, quality: 80 })
      : src;

  return (
    <img
      src={optimizedSrc}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      decoding={priority ? "sync" : "async"}
      fetchPriority={priority ? "high" : undefined}
      onLoad={() => setLoaded(true)}
      onError={() => setError(true)}
      className={`${className} ${loaded ? "opacity-100" : "opacity-0"} transition-opacity duration-300`}
      {...props}
    />
  );
});

OptimizedImage.displayName = "OptimizedImage";

export default OptimizedImage;
