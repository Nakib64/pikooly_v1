import { Link } from "@/lib/router-adapter";
import { getOptimizedImageUrl } from "@/lib/imageUtils";

interface HomepageBannerProps {
  image?: string;
  link?: string | null;
}

export default function HomepageBanner({ image, link }: HomepageBannerProps) {
  const banner = (
    <div className="overflow-hidden rounded-lg sm:rounded-xl md:rounded-2xl bg-[#8B9A3E]">
      {image ? (
        <img
          src={getOptimizedImageUrl(image, { width: 1600 })}
          srcSet={`${getOptimizedImageUrl(image, { width: 640 })} 640w, ${getOptimizedImageUrl(image, { width: 1024 })} 1024w, ${getOptimizedImageUrl(image, { width: 1600 })} 1600w`}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 100vw, 1280px"
          alt="Same Day Delivery within 2 hours"
          className="block w-full h-auto object-contain"
          loading="lazy"
          decoding="async"
        />
      ) : (
        <div className="w-full aspect-[16/2]" />
      )}
    </div>
  );

  if (link) {
    return (
      <a href={link} className="block">
        {banner}
      </a>
    );
  }
  return banner;
}
