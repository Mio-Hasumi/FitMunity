import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, X, Maximize2, Minimize2 } from 'lucide-react';

interface ImageGalleryProps {
  images: string[];
  onRemove?: (index: number) => void;
  editable?: boolean;
}

export default function ImageGallery({ images, onRemove, editable = false }: ImageGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handlePrevious = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const handleRemove = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    onRemove?.(index);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  if (!images.length) return null;

  return (
    <div className={`relative ${isFullscreen ? 'fixed inset-0 z-50 bg-black' : ''}`}>
      <div 
        className={`
          relative 
          ${isFullscreen 
            ? 'h-full flex items-center justify-center' 
            : 'h-64 md:h-96'
          }
        `}
      >
        <img
          src={images[currentIndex]}
          alt={`Image ${currentIndex + 1}`}
          className={`
            ${isFullscreen 
              ? 'max-h-full max-w-full' 
              : 'w-full h-full'
            }
            object-contain bg-gray-100 rounded-lg
          `}
        />

        {images.length > 1 && (
          <>
            <button
              onClick={handlePrevious}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-1 rounded-full bg-black/50 text-white hover:bg-black/70"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={handleNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full bg-black/50 text-white hover:bg-black/70"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}

        {editable && onRemove && (
          <button
            onClick={(e) => handleRemove(e, currentIndex)}
            className="absolute top-2 right-2 p-1 rounded-full bg-black/50 text-white hover:bg-black/70"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        <button
          onClick={toggleFullscreen}
          className="absolute bottom-2 right-2 p-1 rounded-full bg-black/50 text-white hover:bg-black/70"
        >
          {isFullscreen ? (
            <Minimize2 className="w-5 h-5" />
          ) : (
            <Maximize2 className="w-5 h-5" />
          )}
        </button>

        {images.length > 1 && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            {images.map((_, index) => (
              <button
                key={index}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex(index);
                }}
                className={`w-2 h-2 rounded-full ${
                  index === currentIndex ? 'bg-white' : 'bg-white/50'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}