import { supabase } from "@/integrations/supabase/client";

export type CloudinaryResourceType = "image" | "video" | "auto" | "raw";

export interface CloudinaryUploadResult {
  url: string;
  public_id?: string;
  format?: string;
  width?: number;
  height?: number;
  bytes?: number;
  resource_type?: string;
}

/**
 * Upload a single file to Cloudinary via the `cloudinary-upload` edge function.
 * All image/video uploads in the app should use this — do NOT use supabase.storage.
 */
export async function uploadToCloudinary(
  file: File | Blob,
  options: { folder?: string; resourceType?: CloudinaryResourceType; filename?: string } = {}
): Promise<CloudinaryUploadResult> {
  const { folder = "uploads", resourceType = "image", filename } = options;

  const formData = new FormData();
  const f =
    file instanceof File
      ? file
      : new File([file], filename || `upload-${Date.now()}`, { type: (file as Blob).type });
  formData.append("file", f);
  formData.append("folder", folder);
  formData.append("resource_type", resourceType);

  const { data, error } = await supabase.functions.invoke("r2-upload", {
    body: formData,
  });

  if (error) throw error;
  if (!data || data.error) throw new Error(data?.error || "Upload failed");
  if (!data.url) throw new Error("Upload returned no URL");

  return data as CloudinaryUploadResult;
}
