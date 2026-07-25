"use client";

export default function SharkSceneLoader() {
  return (
    <div
      className="relative h-80 w-full overflow-hidden md:h-96"
      style={{ transform: "scale(1)", transformOrigin: "center center" }}
    >
      <iframe
        title="Great White Shark"
        className="absolute top-1/2 left-1/2 h-[180%] w-[180%] -translate-x-1/2 -translate-y-1/2 scale-[0.56]"
        style={{ transformOrigin: "center center" }}
        frameBorder="0"
        allow="autoplay; fullscreen; xr-spatial-tracking"
        src="https://sketchfab.com/models/50a97b0669ac4884a156838cd9ad06e5/embed?autostart=1&transparent=1&ui_animations=0&ui_infos=0&ui_stop=0&ui_inspector=0&ui_watermark_link=0&ui_watermark=0&ui_ar=0&ui_help=0&ui_settings=0&ui_vr=0&ui_fullscreen=0&ui_annotations=0&camera=0&preload=1&dnt=1"
      />
    </div>
  );
}
