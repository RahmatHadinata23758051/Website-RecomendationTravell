import React, { useState } from 'react';
import { ImageOff } from 'lucide-react';

const DEFAULT_FALLBACK_SRC = '/assets/images/heroes/hero-pahawang-bg.png';

export interface SafeImageProps
  extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt'> {
  src?: string | null;
  alt: string;
  fallbackSrc?: string;
}

/**
 * Image primitive for destination media.
 * It retries with one known-good local asset and never loops on broken URLs.
 */
export const SafeImage: React.FC<SafeImageProps> = ({
  src,
  alt,
  fallbackSrc = DEFAULT_FALLBACK_SRC,
  onError,
  ...imageProps
}) => {
  const initialSrc = src || fallbackSrc;
  const [currentSrc, setCurrentSrc] = useState(initialSrc);
  const [isUnavailable, setIsUnavailable] = useState(false);

  const handleError: React.ReactEventHandler<HTMLImageElement> = (event) => {
    onError?.(event);

    if (currentSrc !== fallbackSrc) {
      setCurrentSrc(fallbackSrc);
      return;
    }

    setIsUnavailable(true);
  };

  if (isUnavailable) {
    return (
      <div
        className={imageProps.className}
        role="img"
        aria-label={`${alt} tidak tersedia`}
        style={imageProps.style}
      >
        <div className="flex h-full min-h-16 w-full items-center justify-center bg-slate-100 text-slate-400">
          <ImageOff aria-hidden="true" className="h-5 w-5" />
        </div>
      </div>
    );
  }

  return (
    <img
      {...imageProps}
      src={currentSrc}
      alt={alt}
      onError={handleError}
    />
  );
};

export { DEFAULT_FALLBACK_SRC };
