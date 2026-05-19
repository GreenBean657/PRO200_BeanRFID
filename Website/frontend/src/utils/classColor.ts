import type { CSSProperties } from 'react';
import classColorMap from '../config/classColors.json';
import roomColorMap from '../config/roomColors.json';

const classColors = classColorMap as Record<string, string>;
const roomColors = roomColorMap as Record<string, string>;

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function chipStyle(hex: string, extra?: CSSProperties): CSSProperties {
  return {
    background: hexToRgba(hex, 0.15),
    color: hex,
    border: `1px solid ${hexToRgba(hex, 0.3)}`,
    padding: '0.2rem 0.6rem',
    borderRadius: '4px',
    fontSize: '0.8rem',
    fontWeight: 600,
    display: 'inline-block',
    ...extra,
  };
}

export function getClassChipStyle(classId: string): CSSProperties {
  const prefix = classId.slice(0, 3).toUpperCase();
  const hex = classColors[prefix] ?? classColors['_default'];
  return chipStyle(hex, { fontFamily: "'Courier New', monospace", letterSpacing: '0.04em' });
}

export function getRoomChipStyle(room: string): CSSProperties {
  const floor = room.charAt(0);
  const hex = roomColors[floor] ?? roomColors['_default'];
  return chipStyle(hex, { fontWeight: 700 });
}
