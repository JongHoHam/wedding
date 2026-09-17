import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export default function VenueMap({ venue, route }) {
  const container = useRef(null);
  const mapRef = useRef(null);
  const [tileError, setTileError] = useState(false);

  useEffect(() => {
    const map = L.map(container.current, {
      scrollWheelZoom: false,
      dragging: !L.Browser.mobile,
      tapHold: true,
    }).setView([venue.lat, venue.lng], 14);
    mapRef.current = map;
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    })
      .on("tileerror", () => setTileError(true))
      .addTo(map);
    const label = document.createElement("strong");
    label.textContent = venue.name;
    L.circleMarker([venue.lat, venue.lng], {
      radius: 9,
      color: "#fff",
      weight: 3,
      fillColor: "#387467",
      fillOpacity: 1,
    })
      .addTo(map)
      .bindTooltip(label, {
        permanent: true,
        direction: "top",
        offset: [0, -10],
      });
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(container.current);
    return () => {
      observer.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, [venue]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const group = L.layerGroup().addTo(map);
    if (route) {
      const line = L.polyline(route.points, {
        color: route.color,
        weight: 5,
        opacity: 0.85,
        dashArray: route.verified || route.roadGeometry ? undefined : "8 9",
      }).addTo(group);
      route.stops.forEach((stop) => {
        const label = document.createElement("span");
        label.textContent = stop.name;
        L.circleMarker([stop.lat, stop.lng], {
          radius: 7,
          color: "#fff",
          weight: 2,
          fillColor: route.color,
          fillOpacity: 1,
        })
          .addTo(group)
          .bindTooltip(label, { permanent: true, direction: "right", offset: [8, 0] });
      });
      map.fitBounds(line.getBounds(), { padding: [35, 35], animate: false });
    } else map.setView([venue.lat, venue.lng], 14, { animate: false });
    return () => group.remove();
  }, [route, venue]);

  return (
    <div className="map-shell">
      <div
        ref={container}
        className="venue-map"
        aria-label={`${venue.name} 지도${route ? `, ${route.name}` : ""}`}
      />
      {tileError && (
        <p className="map-error">
          지도를 불러오지 못했습니다. 아래 지도 앱을 이용해 주세요.
        </p>
      )}
      {route && !route.verified && (
        <span className="map-disclaimer">
          {route.roadGeometry ? "OSRM 도로 경로 · 실시간 교통 미반영" : "노선 시안 · 실제 도로/정류장과 다름"}
        </span>
      )}
    </div>
  );
}
