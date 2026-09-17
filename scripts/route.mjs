import { writeFile } from 'node:fs/promises';

const url = 'https://router.project-osrm.org/route/v1/driving/126.493,33.5066;126.4243,33.2413?overview=full&geometries=geojson&steps=true';
const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
if (!response.ok) throw new Error(`Route fetch failed: ${response.status}`);
const result = await response.json();
const route = result.routes?.[0];
if (result.code !== 'Ok' || route.geometry.coordinates.length < 100) throw new Error('Expected road-level route geometry.');
const roads = [...new Set(route.legs.flatMap(leg => leg.steps).filter(step => step.distance > 300 && step.name).map(step => step.name))];
const data = { points: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]), roads, roadGeometry: true, source: 'OSRM / OpenStreetMap', sourceUrl: url, checkedAt: new Date().toISOString(), distanceKm: Math.round(route.distance / 100) / 10, engineMinutes: Math.ceil(route.duration / 60), steps: ['제주국제공항 출발', '공항서로 · 월광로 · 오광로 · 노형로', '평화로 · 한창로', '일주서로 · 천제연로', '중문관광로 · 이어도로 → ICC JEJU 인근'], note: '정적 도로 경로. 실시간 교통 미반영. 정확한 예식 하차 입구 확인 필요. 지도 데이터 © OpenStreetMap contributors, ODbL.' };
await writeFile(new URL('../src/car-route.json', import.meta.url), JSON.stringify(data, null, 2));
console.log(JSON.stringify({ points: data.points.length, distanceKm: data.distanceKm, engineMinutes: data.engineMinutes, roads: data.roads }));