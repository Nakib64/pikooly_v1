/**
 * Convert an image File to WebP format using Canvas API.
 * Falls back to original file if conversion fails.
 * @param file - Original image file
 * @param quality - WebP quality (0-1), default 0.82
 * @returns Converted WebP File
 */
export async function convertToWebP(file: File, quality = 0.82): Promise<File> {
  // Skip if already webp or if it's an SVG
  if (file.type === "image/webp" || file.type === "image/svg+xml") {
    return file;
  }

  try {
    const bitmap = await createImageBitmap(file);
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;

    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();

    const blob = await canvas.convertToBlob({ type: "image/webp", quality });
    const baseName = file.name.replace(/\.[^.]+$/, "");
    return new File([blob], `${baseName}.webp`, { type: "image/webp" });
  } catch {
    // OffscreenCanvas not supported — fallback to regular canvas
    try {
      return await convertToWebPFallback(file, quality);
    } catch {
      return file;
    }
  }
}

function convertToWebPFallback(file: File, quality: number): Promise<File> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) { URL.revokeObjectURL(url); resolve(file); return; }
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      canvas.toBlob(
        (blob) => {
          if (!blob) { resolve(file); return; }
          const baseName = file.name.replace(/\.[^.]+$/, "");
          resolve(new File([blob], `${baseName}.webp`, { type: "image/webp" }));
        },
        "image/webp",
        quality
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}

/**
 * Get WebP file path from original path
 */
export function toWebPPath(path: string): string {
  return path.replace(/\.[^.]+$/, ".webp");
}

/**
 * Optimise a Cloudinary URL by injecting auto-format, auto-quality
 * and an optional width resize into the transformation chain.
 * Returns the original URL unchanged for non-Cloudinary sources.
 */
export function getOptimizedCloudinaryUrl(
  url: string,
  width?: number
): string {
  if (!url || !url.includes("res.cloudinary.com")) return url;

  // Already has f_auto — skip to avoid double-transforming
  if (url.includes("f_auto")) return url;

  // Pattern: /upload/v1234/ → /upload/f_auto,q_auto,w_X/v1234/
  const transforms = width
    ? `f_auto,q_auto,w_${width}`
    : "f_auto,q_auto";

  return url.replace(/\/upload\//, `/upload/${transforms}/`);
}

/**
 * Universal image optimiser — handles Cloudinary and Supabase storage.
 */
export function getOptimizedImageUrl(
  url: string,
  options: { width?: number; height?: number; quality?: number; format?: string } = {}
): string {
  if (!url || typeof url !== "string") return typeof url === "string" ? url : "";

  // Cloudinary
  if (url.includes("res.cloudinary.com")) {
    return getOptimizedCloudinaryUrl(url, options.width);
  }

  // Supabase storage
  const supabaseStorageBase = "https://uizdqqyiqxkcjufkksrc.supabase.co/storage/v1/object/public/";
  if (!url.startsWith(supabaseStorageBase)) return url;
  
  const params = new URLSearchParams();
  if (options.width) params.set("width", String(options.width));
  if (options.height) params.set("height", String(options.height));
  if (options.quality) params.set("quality", String(options.quality));
  if (options.format) params.set("format", options.format);
  
  if (params.toString() === "") return url;

  const renderUrl = url.replace(
    "/storage/v1/object/public/",
    "/storage/v1/render/image/public/"
  );
  
  return `${renderUrl}?${params.toString()}`;
}
