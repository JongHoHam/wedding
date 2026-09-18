import React, { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";

export default function PhotoGallery({ photos, openViewer }) {
  const [edges, setEdges] = useState({ start: true, end: false });
  const rail = useRef(null);
  const drag = useRef(null);
  const suppressClick = useRef(false);
  const gallery = photos;
  const extraCount = Math.max(0, gallery.length - 5);

  useEffect(() => {
    const element = rail.current;
    if (!element) return;
    const update = () => setEdges({
      start: element.scrollLeft <= 1,
      end: element.scrollLeft + element.clientWidth >= element.scrollWidth - 1,
    });
    const wheel = (event) => {
      if (event.ctrlKey || Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return;
      const atStart = element.scrollLeft <= 1;
      const atEnd = element.scrollLeft + element.clientWidth >= element.scrollWidth - 1;
      if ((event.deltaY < 0 && atStart) || (event.deltaY > 0 && atEnd)) return;
      event.preventDefault();
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? element.clientWidth : 1;
      element.scrollLeft += event.deltaY * unit;
    };
    const observer = new ResizeObserver(update);
    observer.observe(element);
    element.addEventListener("scroll", update, { passive: true });
    element.addEventListener("wheel", wheel, { passive: false });
    update();
    return () => {
      observer.disconnect();
      element.removeEventListener("scroll", update);
      element.removeEventListener("wheel", wheel);
    };
  }, [extraCount]);

  const startDrag = (event) => {
    if (!event.isPrimary || event.button !== 0) return;
    suppressClick.current = false;
    drag.current = {
      pointerId: event.pointerId,
      native: event.pointerType === "touch",
      x: event.clientX,
      y: event.clientY,
      scrollLeft: event.currentTarget.scrollLeft,
      active: false,
    };
  };
  const moveDrag = (event) => {
    const gesture = drag.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    const distance = event.clientX - gesture.x;
    if (gesture.native) {
      if (Math.hypot(distance, event.clientY - gesture.y) > 8) suppressClick.current = true;
      return;
    }
    if (!gesture.active) {
      const vertical = Math.abs(event.clientY - gesture.y);
      if (vertical > 8 && vertical > Math.abs(distance)) {
        drag.current = null;
        return;
      }
      if (Math.abs(distance) <= 8) return;
      gesture.active = true;
      suppressClick.current = true;
      event.currentTarget.dataset.dragging = "true";
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    event.preventDefault();
    event.currentTarget.scrollLeft = gesture.scrollLeft - distance;
  };
  const endDrag = (event) => {
    if (drag.current?.pointerId !== event.pointerId) return;
    drag.current = null;
    delete event.currentTarget.dataset.dragging;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };
  const move = (direction) => rail.current?.scrollBy({
    left: direction * rail.current.clientWidth * 0.85,
    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
  });
  const photoButton = (photo, index, featured) => (
    <button
      key={`${photo.src}-${index}`}
      onClick={() => openViewer(gallery, index)}
      aria-label={`사진 ${index + 1} 크게 보기`}
      className={`gallery-item ${featured ? `photo-${index}` : "gallery-slide"}`}
    >
      <img src={photo.src} alt={photo.alt} loading="lazy" draggable={false} />
      <span><ZoomIn size={17} /></span>
    </button>
  );

  return (
    <>
      <div className="gallery-grid">
        {gallery.slice(0, 5).map((photo, index) => photoButton(photo, index, true))}
      </div>
      {extraCount > 0 && (
        <div className="gallery-overflow">
          <div className="gallery-rail-toolbar">
            <span>{String(6).padStart(2, "0")} — {String(gallery.length).padStart(2, "0")}</span>
            <div>
              <button type="button" className="icon-button" aria-label="갤러리 왼쪽으로" title="이전 사진들" disabled={edges.start} onClick={() => move(-1)}><ChevronLeft size={20} /></button>
              <button type="button" className="icon-button" aria-label="갤러리 오른쪽으로" title="다음 사진들" disabled={edges.end} onClick={() => move(1)}><ChevronRight size={20} /></button>
            </div>
          </div>
          <div
            className="gallery-rail"
            ref={rail}
            role="region"
            aria-label="추가 웨딩 사진"
            tabIndex={0}
            onPointerDown={startDrag}
            onPointerMove={moveDrag}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onLostPointerCapture={(event) => {
              if (event.target === event.currentTarget) endDrag(event);
            }}
            onDragStart={(event) => event.preventDefault()}
            onClickCapture={(event) => {
              if (suppressClick.current && event.detail !== 0) {
                event.preventDefault();
                event.stopPropagation();
              }
            }}
          >
            {gallery.slice(5).map((photo, index) => photoButton(photo, index + 5, false))}
          </div>
        </div>
      )}
    </>
  );
}