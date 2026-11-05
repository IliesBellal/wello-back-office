import {
  AppWindow,
  BrickWall,
  DoorOpen,
  GlassWater,
  MoveUpRight,
  Sprout,
  Square,
  type LucideIcon
} from 'lucide-react';
import type { ObstacleType } from '@/lib/floorplan/types';

/** Icône de chaque obstacle dans la barre d'outils et les panneaux. */
export const OBSTACLE_ICONS: Record<ObstacleType, LucideIcon> = {
  wall: BrickWall,
  door: DoorOpen,
  window: AppWindow,
  stairs: MoveUpRight,
  plant: Sprout,
  bar: GlassWater,
  pillar: Square
};
