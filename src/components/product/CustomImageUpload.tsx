import { useState, useRef } from "react";
import { ImagePlus, X, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface CustomImageUploadProps {
  images: File[];
  onChange: (images: File[]) => void;
  maxImages?: number;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const CustomImageUpload = ({ images, onChange, maxImages = 5 }: CustomImageUploadProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<string[]>([]);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const remaining = maxImages - images.length;
    if (remaining <= 0) {
      toast.error(`Maximum ${maxImages} images allowed`);
      return;
    }

    const newFiles: File[] = [];
    const newPreviews: string[] = [];

    Array.from(files).slice(0, remaining).forEach((file) => {
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name} is not an image`);
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name} is too large (max 5MB)`);
        return;
      }
      newFiles.push(file);
      newPreviews.push(URL.createObjectURL(file));
    });

    if (newFiles.length > 0) {
      onChange([...images, ...newFiles]);
      setPreviews((prev) => [...prev, ...newPreviews]);
    }
  };

  const removeImage = (index: number) => {
    URL.revokeObjectURL(previews[index]);
    onChange(images.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <ImagePlus size={18} className="text-primary" />
        <span className="text-sm font-semibold text-foreground">Upload Your Photo</span>
        <span className="text-[11px] text-muted-foreground">({images.length}/{maxImages})</span>
      </div>

      <div className="flex items-center gap-2 p-2.5 rounded-lg bg-primary/5 border border-primary/20">
        <AlertCircle size={14} className="text-primary flex-shrink-0" />
        <p className="text-[11px] text-muted-foreground leading-snug">
          Upload high-quality images for best print results. Max 5MB per image. Supported: JPG, PNG, WEBP.
        </p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {previews.map((src, i) => (
          <div key={i} className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden border-2 border-border group">
            <img src={src} alt={`Custom ${i + 1}`} className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => removeImage(i)}
              className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X size={12} />
            </button>
          </div>
        ))}

        {images.length < maxImages && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg border-2 border-dashed border-primary/40 flex flex-col items-center justify-center gap-1 text-primary/60 hover:border-primary hover:text-primary transition-colors"
          >
            <ImagePlus size={20} />
            <span className="text-[9px] font-medium">Add</span>
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
};

export default CustomImageUpload;
