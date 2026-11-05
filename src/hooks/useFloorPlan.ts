import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { toast } from 'sonner';
import { computePublishPayload, summarizePayload } from '@/lib/floorplan/diff';
import { findDuplicateTableNames, findOverlappingTables } from '@/lib/floorplan/geometry';
import {
  DUPLICATE_OFFSET,
  canRedo,
  canUndo,
  createInitialState,
  planReducer,
  selectionToClip,
  type Clip,
  type ItemChange,
  type NewObstacleSpec,
} from '@/lib/floorplan/reducer';
import type { NewTableSpec } from '@/lib/floorplan/tablePresets';
import { validatePlanContent } from '@/lib/floorplan/validation';
import type { Area, AreaPoint, ItemRef, Location, Obstacle } from '@/lib/floorplan/types';
import { PlanPublishError, getFloorPlan, publishFloorPlan } from '@/services/locationsService';

/** Ce que l'éditeur sait de la sélection courante. */
export type SelectionInfo =
  | { kind: 'none' }
  | { kind: 'table'; item: Location }
  | { kind: 'obstacle'; item: Obstacle }
  | { kind: 'area'; item: Area }
  | { kind: 'multiple'; count: number; tables: number; obstacles: number; areas: number };

/**
 * État et actions de l'éditeur de plan de salle.
 *
 * Le plan est un BROUILLON : toute action (poser, déplacer, supprimer, créer un
 * étage…) est locale et annulable ; rien n'est envoyé au serveur avant
 * `publish()`, qui envoie le différentiel en une transaction (tout ou rien).
 */
export function useFloorPlan() {
  const [state, dispatch] = useReducer(planReducer, undefined, createInitialState);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [conflict, setConflict] = useState(false);

  // Dernier état, lisible par les callbacks stables (raccourcis clavier, gestes du canvas).
  const stateRef = useRef(state);
  stateRef.current = state;
  const clipboard = useRef<{ clip: Clip; pasteCount: number } | null>(null);

  // --- Chargement ---------------------------------------------------------------

  const load = useCallback(async (keepFloorId?: string | null): Promise<boolean> => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const snapshot = await getFloorPlan();
      dispatch({ type: 'load', snapshot, keepFloorId });
      setConflict(false);
      return true;
    } catch {
      setLoadError('Impossible de charger le plan de salle.');
      toast.error('Erreur lors du chargement du plan de salle');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // --- Données dérivées -------------------------------------------------------------

  const { present, base, activeFloorId, selection } = state;

  const floorLocations = useMemo(
    () => present.locations.filter(l => l.floor_id === activeFloorId),
    [present.locations, activeFloorId]
  );
  const floorObstacles = useMemo(
    () => present.obstacles.filter(o => o.floorId === activeFloorId),
    [present.obstacles, activeFloorId]
  );
  const floorAreas = useMemo(
    () => present.areas.filter(a => a.floorId === activeFloorId),
    [present.areas, activeFloorId]
  );

  const payload = useMemo(
    () => computePublishPayload(base, present, state.revision),
    [base, present, state.revision]
  );
  const changes = useMemo(() => summarizePayload(payload), [payload]);
  const issues = useMemo(() => validatePlanContent(present), [present]);
  const overlapping = useMemo(() => findOverlappingTables(present.locations), [present.locations]);
  const duplicateNames = useMemo(() => findDuplicateTableNames(present.locations), [present.locations]);

  const selectionInfo = useMemo<SelectionInfo>(() => {
    if (selection.length === 0) return { kind: 'none' };
    if (selection.length === 1) {
      const [ref] = selection;
      if (ref.kind === 'table') {
        const item = present.locations.find(l => l.location_id === ref.id);
        if (item) return { kind: 'table', item };
      } else if (ref.kind === 'obstacle') {
        const item = present.obstacles.find(o => o.id === ref.id);
        if (item) return { kind: 'obstacle', item };
      } else {
        const item = present.areas.find(a => a.id === ref.id);
        if (item) return { kind: 'area', item };
      }
      return { kind: 'none' };
    }
    return {
      kind: 'multiple',
      count: selection.length,
      tables: selection.filter(r => r.kind === 'table').length,
      obstacles: selection.filter(r => r.kind === 'obstacle').length,
      areas: selection.filter(r => r.kind === 'area').length,
    };
  }, [selection, present]);

  // Prévient avant de fermer l'onglet avec des modifications non publiées.
  const hasChanges = changes.total > 0;
  useEffect(() => {
    if (!hasChanges) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [hasChanges]);

  // --- Actions ------------------------------------------------------------------------

  const actions = useMemo(() => {
    const currentFloor = () => stateRef.current.activeFloorId;

    return {
      selectFloor: (floorId: string) => dispatch({ type: 'selectFloor', floorId }),
      addFloor: (name: string) => dispatch({ type: 'addFloor', name }),
      renameFloor: (floorId: string, name: string) => dispatch({ type: 'renameFloor', floorId, name }),
      deleteFloor: (floorId: string) => dispatch({ type: 'deleteFloor', floorId }),

      select: (refs: ItemRef[], mode: 'replace' | 'toggle' | 'add' = 'replace') =>
        dispatch({ type: 'select', refs, mode }),
      clearSelection: () => dispatch({ type: 'select', refs: [] }),
      selectAll: () => {
        const { present: content, activeFloorId: floorId } = stateRef.current;
        const refs: ItemRef[] = [
          ...content.locations.filter(l => l.floor_id === floorId).map(l => ({ kind: 'table' as const, id: l.location_id })),
          ...content.obstacles.filter(o => o.floorId === floorId).map(o => ({ kind: 'obstacle' as const, id: o.id })),
        ];
        dispatch({ type: 'select', refs });
      },

      addTables: (spec: Omit<NewTableSpec, 'floorId'>, count = 1) => {
        const floorId = currentFloor();
        if (floorId) dispatch({ type: 'addTables', spec: { ...spec, floorId }, count });
      },
      addObstacle: (spec: Omit<NewObstacleSpec, 'floorId'>) => {
        const floorId = currentFloor();
        if (floorId) dispatch({ type: 'addObstacle', spec: { ...spec, floorId } });
      },
      addObstacles: (specs: Omit<NewObstacleSpec, 'floorId'>[]) => {
        const floorId = currentFloor();
        if (floorId) dispatch({ type: 'addObstacles', specs: specs.map(spec => ({ ...spec, floorId })) });
      },
      addArea: (points: AreaPoint[]) => {
        const floorId = currentFloor();
        if (floorId) dispatch({ type: 'addArea', spec: { floorId, points } });
      },

      update: (changesToApply: ItemChange[], coalesceKey?: string) =>
        dispatch({ type: 'update', changes: changesToApply, coalesceKey }),

      /** Décale la sélection (flèches du clavier). Les zones ne sont pas déplaçables. */
      nudge: (dx: number, dy: number) => {
        const { present: content, selection: current } = stateRef.current;
        const moves: ItemChange[] = [];
        for (const ref of current) {
          if (ref.kind === 'table') {
            const t = content.locations.find(l => l.location_id === ref.id);
            if (t) moves.push({ ref: { kind: 'table', id: ref.id }, patch: { x: t.x + dx, y: t.y + dy } });
          } else if (ref.kind === 'obstacle') {
            const o = content.obstacles.find(x => x.id === ref.id);
            if (o) moves.push({ ref: { kind: 'obstacle', id: ref.id }, patch: { x: o.x + dx, y: o.y + dy } });
          }
        }
        if (moves.length > 0) dispatch({ type: 'update', changes: moves });
      },

      deleteSelection: () => {
        const { selection: current } = stateRef.current;
        if (current.length > 0) dispatch({ type: 'delete', refs: current });
      },
      deleteItems: (refs: ItemRef[]) => dispatch({ type: 'delete', refs }),
      duplicateSelection: () => {
        const { selection: current } = stateRef.current;
        if (current.length > 0) dispatch({ type: 'duplicate', refs: current, offset: DUPLICATE_OFFSET });
      },

      copySelection: (): boolean => {
        const clip = selectionToClip(stateRef.current);
        if (clip.locations.length + clip.obstacles.length + clip.areas.length === 0) return false;
        clipboard.current = { clip, pasteCount: 0 };
        return true;
      },
      paste: (): boolean => {
        const floorId = currentFloor();
        const entry = clipboard.current;
        if (!floorId || !entry) return false;
        entry.pasteCount += 1;
        dispatch({ type: 'paste', clip: entry.clip, floorId, offset: DUPLICATE_OFFSET * entry.pasteCount });
        return true;
      },

      undo: () => dispatch({ type: 'undo' }),
      redo: () => dispatch({ type: 'redo' }),
      discard: () => dispatch({ type: 'discard' }),
    };
  }, []);

  // --- Publication --------------------------------------------------------------------

  /** Envoie le brouillon. Renvoie `true` si le plan est publié (ou s'il n'y avait rien à publier). */
  const publish = useCallback(async (): Promise<boolean> => {
    if (changes.total === 0) return true;
    if (issues.length > 0) {
      toast.error(issues[0].message);
      return false;
    }

    setIsPublishing(true);
    try {
      const result = await publishFloorPlan(payload);
      const floorId = stateRef.current.activeFloorId;
      const reloaded = await load(floorId ? (result.idMap[floorId] ?? floorId) : null);
      if (reloaded) {
        toast.success(`Plan publié (${changes.total} modification${changes.total > 1 ? 's' : ''})`);
      } else {
        toast.warning("Plan publié, mais le rechargement a échoué. Rechargez la page avant de continuer.");
      }
      return true;
    } catch (error) {
      if (error instanceof PlanPublishError && error.isConflict) {
        setConflict(true);
      } else {
        toast.error(error instanceof PlanPublishError ? error.message : "Erreur lors de l'enregistrement du plan");
      }
      return false;
    } finally {
      setIsPublishing(false);
    }
  }, [changes.total, issues, payload, load]);

  /** Abandonne le brouillon et recharge le plan publié (utilisé après un conflit de révision). */
  const reload = useCallback(() => load(stateRef.current.activeFloorId), [load]);

  return {
    // état
    state,
    floors: present.floors,
    activeFloorId,
    selection,
    selectionInfo,
    floorLocations,
    floorObstacles,
    floorAreas,
    overlapping,
    duplicateNames,
    issues,
    changes,
    hasChanges,
    canUndo: canUndo(state),
    canRedo: canRedo(state),
    isLoading,
    loadError,
    isPublishing,
    conflict,
    // actions
    ...actions,
    publish,
    reload,
    dismissConflict: () => setConflict(false),
  };
}

export type UseFloorPlanReturn = ReturnType<typeof useFloorPlan>;
