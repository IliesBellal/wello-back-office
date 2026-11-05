import { useCallback, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Redo2, RotateCcw, Save, Undo2 } from 'lucide-react';
import { AreaPropertiesPanel } from './AreaPropertiesPanel';
import { FloorPlanCanvas, type FloorPlanCanvasHandle } from './FloorPlanCanvas';
import { FloorSelector } from './FloorSelector';
import { MultiSelectionPanel } from './MultiSelectionPanel';
import { ObstaclePropertiesPanel } from './ObstaclePropertiesPanel';
import { ShortcutsHelp } from './ShortcutsHelp';
import { TablePropertiesPanel } from './TablePropertiesPanel';
import { ToolBar } from './ToolBar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { useFloorPlan } from '@/hooks/useFloorPlan';
import { useFloorPlanShortcuts } from '@/hooks/useFloorPlanShortcuts';
import { alignChanges, alignableEntries, distributeChanges, type AlignMode, type DistributeAxis } from '@/lib/floorplan/align';
import { SELECT_TOOL, type Tool } from '@/lib/floorplan/tools';
import type { ItemRef } from '@/lib/floorplan/types';

const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;

/**
 * Éditeur du plan de salle, en brouillon.
 *
 * Tout ce qui est fait ici (poser, déplacer, supprimer, créer un étage…) est
 * local et annulable ; rien n'est visible en salle avant « Publier », qui
 * enregistre l'ensemble en une fois (tout ou rien).
 */
export function FloorPlanEditor() {
  const plan = useFloorPlan();
  const canvasRef = useRef<FloorPlanCanvasHandle>(null);
  const [tool, setTool] = useState<Tool>(SELECT_TOOL);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const { clearSelection, select, update, addTables, addObstacle, addObstacles, addArea } = plan;

  useFloorPlanShortcuts({ plan, tool, canvasRef });

  const changeTool = useCallback(
    (next: Tool) => {
      setTool(next);
      // Un outil de pose ne travaille pas sur une sélection : on la libère.
      if (next.kind !== 'select') clearSelection();
    },
    [clearSelection]
  );

  const itemCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    const bump = (floorId: string | null) => {
      if (floorId) counts[floorId] = (counts[floorId] ?? 0) + 1;
    };
    plan.state.present.locations.forEach(l => bump(l.floor_id));
    plan.state.present.obstacles.forEach(o => bump(o.floorId));
    plan.state.present.areas.forEach(a => bump(a.floorId));
    return counts;
  }, [plan.state.present]);

  const info = plan.selectionInfo;
  const canEdit = plan.activeFloorId !== null;
  const showPanel = tool.kind === 'select';
  const overlappingHere = plan.floorLocations.filter(l => plan.overlapping.has(l.location_id)).length;

  const alignSelection = (mode: AlignMode) => {
    const { present } = plan.state;
    const entries = alignableEntries(
      present.locations.filter(l => plan.selection.some(r => r.kind === 'table' && r.id === l.location_id)),
      present.obstacles.filter(o => plan.selection.some(r => r.kind === 'obstacle' && r.id === o.id))
    );
    update(alignChanges(entries, mode));
  };

  const distributeSelection = (axis: DistributeAxis) => {
    const { present } = plan.state;
    const entries = alignableEntries(
      present.locations.filter(l => plan.selection.some(r => r.kind === 'table' && r.id === l.location_id)),
      present.obstacles.filter(o => plan.selection.some(r => r.kind === 'obstacle' && r.id === o.id))
    );
    update(distributeChanges(entries, axis));
  };

  const moveSelectedTablesToFloor = (floorId: string) => {
    const refs: ItemRef[] = plan.selection.filter(r => r.kind === 'table');
    update(refs.map(ref => ({ ref: { kind: 'table' as const, id: ref.id }, patch: { floor_id: floorId } })));
    clearSelection();
  };

  const draft = plan.changes;

  return (
    <>
      <div className="flex h-full min-h-[560px] flex-col">
        {/* En-tête */}
        <header className="flex flex-col gap-3 border-b border-border bg-card p-4 md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-foreground md:text-3xl">Plan de salle</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Dessinez votre salle : vos modifications ne sont visibles en salle qu'une fois publiées.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" size="icon" onClick={plan.undo} disabled={!plan.canUndo} title="Annuler (Ctrl+Z)" aria-label="Annuler la dernière action">
                <Undo2 className="h-4 w-4" />
              </Button>
              <Button type="button" variant="outline" size="icon" onClick={plan.redo} disabled={!plan.canRedo} title="Rétablir (Ctrl+Maj+Z)" aria-label="Rétablir l'action annulée">
                <Redo2 className="h-4 w-4" />
              </Button>
              <ShortcutsHelp />
              <Button
                type="button"
                variant="outline"
                className="gap-2"
                onClick={() => setConfirmDiscard(true)}
                disabled={!plan.hasChanges || plan.isPublishing}
              >
                <RotateCcw className="h-4 w-4" />
                Abandonner
              </Button>
              <Button
                type="button"
                className="gap-2"
                onClick={() => void plan.publish()}
                disabled={!plan.hasChanges || plan.isPublishing || plan.issues.length > 0}
                title="Publier le plan (Ctrl+S)"
              >
                <Save className="h-4 w-4" />
                {plan.isPublishing ? 'Publication…' : 'Publier'}
                {plan.hasChanges && !plan.isPublishing && (
                  <span className="ml-1 rounded-full bg-white/20 px-2 py-0.5 text-xs font-semibold">{draft.total}</span>
                )}
              </Button>
            </div>
          </div>

          {plan.loadError && (
            <div className="flex items-center gap-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {plan.loadError}
              <Button type="button" size="sm" variant="outline" onClick={() => void plan.reload()}>
                Réessayer
              </Button>
            </div>
          )}

        </header>

        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          {/* Colonne de gauche : étages, outils, liste des tables */}
          <aside className="max-h-[42vh] w-full shrink-0 space-y-5 overflow-y-auto border-b border-border bg-sidebar p-4 md:max-h-none md:w-80 md:border-b-0 md:border-r">
            <FloorSelector
              floors={plan.floors}
              selectedFloorId={plan.activeFloorId}
              itemCounts={itemCounts}
              onFloorSelect={plan.selectFloor}
              onCreateFloor={plan.addFloor}
              onRenameFloor={plan.renameFloor}
              onDeleteFloor={plan.deleteFloor}
            />

            <div className="border-t border-border pt-5">
              <ToolBar
                tool={tool}
                disabled={!canEdit}
                onToolChange={changeTool}
                onAddSeries={(count, seats) => addTables({ shape: 'square', seats }, count)}
              />
            </div>

            <div className="border-t border-border pt-5">
              <h3 className="mb-3 text-sm font-semibold text-foreground">Tables ({plan.floorLocations.length})</h3>
              <div className="max-h-72 space-y-1.5 overflow-y-auto">
                {plan.floorLocations.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Aucune table sur cet étage</p>
                ) : (
                  plan.floorLocations.map(location => {
                    const selected = plan.selection.some(r => r.kind === 'table' && r.id === location.location_id);
                    const flagged = plan.overlapping.has(location.location_id) || plan.duplicateNames.has(location.location_id);
                    return (
                      <button
                        key={location.location_id}
                        type="button"
                        onClick={e =>
                          select([{ kind: 'table', id: location.location_id }], e.shiftKey || e.ctrlKey || e.metaKey ? 'toggle' : 'replace')
                        }
                        className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors ${
                          selected ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground hover:bg-muted/80'
                        }`}
                      >
                        <span>
                          <span className="block font-medium">{location.location_name || '(sans nom)'}</span>
                          <span className="block text-xs opacity-75">{plural(location.seats, 'place', 'places')}</span>
                        </span>
                        {flagged && <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" aria-label="À vérifier" />}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </aside>

          {/* Plan */}
          <main className="relative min-h-[420px] min-w-0 flex-1">
            <FloorPlanCanvas
              ref={canvasRef}
              floorId={plan.activeFloorId}
              locations={plan.floorLocations}
              obstacles={plan.floorObstacles}
              areas={plan.floorAreas}
              selection={plan.selection}
              overlapping={plan.overlapping}
              tool={tool}
              isLoading={plan.isLoading}
              onSelect={select}
              onUpdate={update}
              onToolChange={changeTool}
              onPlaceTable={(armed, topLeft) =>
                addTables({ shape: armed.shape, seats: armed.seats, width: armed.width, height: armed.height, x: topLeft.x, y: topLeft.y })
              }
              onPlaceObstacle={(type, placement) =>
                addObstacle({
                  type,
                  x: placement.x,
                  y: placement.y,
                  width: placement.width,
                  height: placement.height,
                  angle: placement.angle
                })
              }
              onAddWalls={segments => addObstacles(segments.map(segment => ({ type: 'wall' as const, ...segment })))}
              onFinishArea={points => {
                addArea(points);
                changeTool(SELECT_TOOL);
              }}
            />

            {/* Bandeaux d'état : superposés au plan (et non dans la mise en page) pour qu'ils
                n'en changent pas la taille — sinon le plan se recadrerait sous la souris. */}
            <div className="pointer-events-none absolute bottom-3 right-3 z-10 flex max-w-[min(26rem,calc(100%-11rem))] flex-col items-end gap-2">
              {plan.issues.length > 0 && (
                <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-card px-3 py-2 text-sm text-destructive shadow-md" role="alert">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    {plan.issues[0].message}
                    {plan.issues.length > 1 && ` (+ ${plural(plan.issues.length - 1, 'autre problème', 'autres problèmes')})`}
                    <span className="block text-xs opacity-80">Corrigez-le pour pouvoir publier.</span>
                  </div>
                </div>
              )}

              {plan.hasChanges && plan.issues.length === 0 && (
                <div className="w-fit rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-700 shadow-md dark:border-amber-800 dark:bg-amber-950 dark:text-amber-500" role="status">
                  Brouillon — {plural(draft.total, 'modification non publiée', 'modifications non publiées')}
                  {` (${draft.created} ajout${draft.created > 1 ? 's' : ''}, ${draft.updated} modification${draft.updated > 1 ? 's' : ''}, ${draft.deleted} suppression${draft.deleted > 1 ? 's' : ''})`}
                </div>
              )}

              {(overlappingHere > 0 || plan.duplicateNames.size > 0) && (
                <p className="rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-xs text-amber-700 shadow-md dark:border-amber-800 dark:bg-amber-950 dark:text-amber-500" role="status">
                  {overlappingHere > 0 && `${plural(overlappingHere, 'table se chevauche', 'tables se chevauchent')} sur cet étage (en rouge). `}
                  {plan.duplicateNames.size > 0 && `${plural(plan.duplicateNames.size, 'table porte un nom en double', 'tables portent un nom en double')}.`}
                </p>
              )}
            </div>

            {!plan.isLoading && plan.floors.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/70 p-6">
                <div className="max-w-sm space-y-3 rounded-lg border border-border bg-card p-6 text-center shadow-lg">
                  <h2 className="text-lg font-semibold text-foreground">Aucun étage pour l'instant</h2>
                  <p className="text-sm text-muted-foreground">
                    Un étage regroupe les tables d'une même salle (salle, terrasse, mezzanine…). Créez le premier pour commencer à dessiner.
                  </p>
                  <Button type="button" onClick={() => plan.addFloor('Salle')}>
                    Créer l'étage « Salle »
                  </Button>
                </div>
              </div>
            )}

            {showPanel && info.kind === 'table' && (
              <TablePropertiesPanel
                key={info.item.location_id}
                location={info.item}
                floors={plan.floors}
                isDuplicateName={plan.duplicateNames.has(info.item.location_id)}
                isOverlapping={plan.overlapping.has(info.item.location_id)}
                onUpdate={(patch, key) => update([{ ref: { kind: 'table', id: info.item.location_id }, patch }], key)}
                onDuplicate={plan.duplicateSelection}
                onDelete={plan.deleteSelection}
                onClose={clearSelection}
              />
            )}

            {showPanel && info.kind === 'obstacle' && (
              <ObstaclePropertiesPanel
                key={info.item.id}
                obstacle={info.item}
                onUpdate={(patch, key) => update([{ ref: { kind: 'obstacle', id: info.item.id }, patch }], key)}
                onDuplicate={plan.duplicateSelection}
                onDelete={plan.deleteSelection}
                onClose={clearSelection}
              />
            )}

            {showPanel && info.kind === 'area' && (
              <AreaPropertiesPanel
                key={info.item.id}
                area={info.item}
                onUpdate={(patch, key) => update([{ ref: { kind: 'area', id: info.item.id }, patch }], key)}
                onDelete={plan.deleteSelection}
                onClose={clearSelection}
              />
            )}

            {showPanel && info.kind === 'multiple' && (
              <MultiSelectionPanel
                count={info.count}
                tables={info.tables}
                obstacles={info.obstacles}
                areas={info.areas}
                floors={plan.floors}
                activeFloorId={plan.activeFloorId}
                onAlign={alignSelection}
                onDistribute={distributeSelection}
                onMoveToFloor={moveSelectedTablesToFloor}
                onDuplicate={plan.duplicateSelection}
                onDelete={plan.deleteSelection}
                onClose={clearSelection}
              />
            )}
          </main>
        </div>
      </div>

      {/* Abandon du brouillon */}
      <AlertDialog open={confirmDiscard} onOpenChange={setConfirmDiscard}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Abandonner les modifications ?</AlertDialogTitle>
            <AlertDialogDescription>
              Les {plural(draft.total, 'modification non publiée', 'modifications non publiées')} seront perdues et le plan
              retrouvera son dernier état publié.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuer à éditer</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => {
                plan.discard();
                setConfirmDiscard(false);
              }}
            >
              Abandonner
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Publication concurrente */}
      <AlertDialog open={plan.conflict}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Le plan a été modifié entre-temps</AlertDialogTitle>
            <AlertDialogDescription>
              Quelqu'un d'autre a publié une nouvelle version du plan depuis que vous l'avez ouvert. Pour ne pas écraser son travail,
              rechargez le plan : vos modifications non publiées seront perdues.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={plan.dismissConflict}>Garder mon brouillon</AlertDialogCancel>
            <AlertDialogAction onClick={() => void plan.reload()}>Recharger le plan</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
