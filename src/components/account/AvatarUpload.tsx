import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Camera } from "lucide-react";
import { toast } from "sonner";

interface AvatarUploadProps {
  userId: string;
  avatarUrl: string | null;
  displayName: string;
  onUploaded: (url: string) => void;
}

const AvatarUpload = ({ userId, avatarUrl, displayName, onUploaded }: AvatarUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be under 2MB");
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    setUploading(true);
    try {
      const { convertToWebP } = await import("@/lib/imageUtils");
      const webpFile = await convertToWebP(file);
      const { uploadToCloudinary } = await import("@/lib/cloudinaryUpload");
      const res = await uploadToCloudinary(webpFile, { folder: `avatars/${userId}`, resourceType: "image" });
      const urlWithCache = `${res.url}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: urlWithCache })
        .eq("user_id", userId);
      if (updateError) throw updateError;

      onUploaded(urlWithCache);
      toast.success("Profile photo updated!");
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const initials = (displayName || "U")[0].toUpperCase();

  return (
    <div className="relative group">
      <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-[3px] border-primary/20 shadow-lg">
        {avatarUrl ? (
          <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-primary/10 flex items-center justify-center text-primary text-2xl sm:text-3xl font-bold">
            {initials}
          </div>
        )}
      </div>
      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="absolute bottom-0 right-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-md hover:opacity-90 transition-opacity disabled:opacity-50 border-2 border-card"
      >
        {uploading ? (
          <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
        ) : (
          <Camera size={14} />
        )}
      </button>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
    </div>
  );
};

export default AvatarUpload;
