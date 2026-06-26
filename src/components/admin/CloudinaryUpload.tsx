import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Upload, X, Loader2, Image as ImageIcon, Video } from "lucide-react";
import { toast } from "sonner";

interface CloudinaryUploadProps {
  value?: string;
  onChange: (url: string) => void;
  folder?: string;
  resourceType?: "image" | "video" | "auto";
  accept?: string;
  label?: string;
  className?: string;
}

export function CloudinaryUpload({
  value,
  onChange,
  folder = "uploads",
  resourceType = "image",
  accept,
  label = "Upload",
  className = "",
}: CloudinaryUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(value || null);

  const defaultAccept = resourceType === "video"
    ? "video/mp4,video/webm,video/quicktime"
    : "image/jpeg,image/png,image/webp,image/gif,image/svg+xml";

  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 20MB limit
    if (file.size > 20 * 1024 * 1024) {
      toast.error("File size must be under 20MB");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", folder);
      formData.append("resource_type", resourceType);

      const { data, error } = await supabase.functions.invoke("r2-upload", {
        body: formData,
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const url = data.url;
      setPreview(url);
      onChange(url);
      toast.success("Uploaded successfully!");
    } catch (err: any) {
      console.error("Upload error:", err);
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }, [folder, resourceType, onChange]);

  const handleRemove = () => {
    setPreview(null);
    onChange("");
  };

  const isVideo = resourceType === "video" || (preview && /\.(mp4|webm|mov)(\?|$)/i.test(preview));

  return (
    <div className={`space-y-2 ${className}`}>
      {preview ? (
        <div className="relative inline-block">
          {isVideo ? (
            <video
              src={preview}
              className="h-32 w-48 rounded-lg border object-cover"
              controls
              muted
            />
          ) : (
            <img
              src={preview}
              alt="Preview"
              className="h-32 w-32 rounded-lg border object-cover"
            />
          )}
          <button
            type="button"
            onClick={handleRemove}
            className="absolute -right-2 -top-2 rounded-full bg-destructive p-1 text-destructive-foreground shadow-sm hover:bg-destructive/90"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : null}

      <div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          asChild
        >
          <label className="cursor-pointer">
            {uploading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : resourceType === "video" ? (
              <Video className="mr-2 h-4 w-4" />
            ) : (
              <ImageIcon className="mr-2 h-4 w-4" />
            )}
            {uploading ? "Uploading..." : label}
            <input
              type="file"
              className="hidden"
              accept={accept || defaultAccept}
              onChange={handleUpload}
              disabled={uploading}
            />
          </label>
        </Button>
      </div>
    </div>
  );
}

interface CloudinaryMultiUploadProps {
  value?: string[];
  onChange: (urls: string[]) => void;
  folder?: string;
  resourceType?: "image" | "video" | "auto";
  accept?: string;
  maxFiles?: number;
  label?: string;
  className?: string;
}

export function CloudinaryMultiUpload({
  value = [],
  onChange,
  folder = "uploads",
  resourceType = "image",
  accept,
  maxFiles = 10,
  label = "Add Images",
  className = "",
}: CloudinaryMultiUploadProps) {
  const [uploading, setUploading] = useState(false);

  const defaultAccept = resourceType === "video"
    ? "video/mp4,video/webm,video/quicktime"
    : "image/jpeg,image/png,image/webp,image/gif,image/svg+xml";

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    if (value.length + files.length > maxFiles) {
      toast.error(`Maximum ${maxFiles} files allowed`);
      return;
    }

    setUploading(true);
    const newUrls: string[] = [];

    for (const file of files) {
      if (file.size > 20 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 20MB)`);
        continue;
      }

      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("folder", folder);
        formData.append("resource_type", resourceType);

        const { data, error } = await supabase.functions.invoke("r2-upload", {
          body: formData,
        });

        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        newUrls.push(data.url);
      } catch (err: any) {
        console.error("Upload error:", err);
        toast.error(`Failed to upload ${file.name}`);
      }
    }

    if (newUrls.length > 0) {
      onChange([...value, ...newUrls]);
      toast.success(`${newUrls.length} file(s) uploaded`);
    }
    setUploading(false);
  };

  const handleRemove = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((url, i) => (
            <div key={i} className="relative">
              <img
                src={url}
                alt={`Image ${i + 1}`}
                className="h-20 w-20 rounded-lg border object-cover"
              />
              <button
                type="button"
                onClick={() => handleRemove(i)}
                className="absolute -right-1 -top-1 rounded-full bg-destructive p-0.5 text-destructive-foreground shadow-sm"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {value.length < maxFiles && (
        <Button type="button" variant="outline" size="sm" disabled={uploading} asChild>
          <label className="cursor-pointer">
            {uploading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            {uploading ? "Uploading..." : label}
            <input
              type="file"
              className="hidden"
              accept={accept || defaultAccept}
              onChange={handleUpload}
              disabled={uploading}
              multiple
            />
          </label>
        </Button>
      )}
    </div>
  );
}
