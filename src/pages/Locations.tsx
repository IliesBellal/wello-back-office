import { Navigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { PageContainer } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Save, RotateCcw } from 'lucide-react';
import { useFloorPlan } from '@/hooks/useFloorPlan';
import { usePermissions } from '@/hooks/usePermissions';
import { FloorPlanCanvas } from '@/components/locations/FloorPlanCanvas';
import { TablePropertiesPanel } from '@/components/locations/TablePropertiesPanel';
import { ObstaclePropertiesPanel } from '@/components/locations/ObstaclePropertiesPanel';
import { AreaPropertiesPanel } from '@/components/locations/AreaPropertiesPanel';
import { FloorSelector } from '@/components/locations/FloorSelector';
import { ToolBar } from '@/components/locations/ToolBar';

/**
 * Page principale du plan de salle - Gestion des tables d'un restaurant
 * 
 * Features:
 * - Sélection d'étage avec création de nouvel étage
 * - Canvas interactif Konva (1000x1000 virtual coordinates)
 * - Drag & drop pour déplacer les tables
 * - Ajout de tables (ronde, carrée, rectangulaire)
 * - Édition des propriétés
 * - Suppression avec confirmation
 * - Responsive design (desktop + mobile)
 */
export default function Locations() {
  const { canManageSeatingPlan } = usePermissions();

  // RBAC lot 10 : gate, redirect if no permission. Kept in this thin
  // wrapper so the early return never sits between two hook calls of the
  // content component below.
  if (!canManageSeatingPlan) {
    return <Navigate to="/" replace />;
  }

  return <LocationsContent />;
}

function LocationsContent() {
  const {
    floors,
    locations,
    obstacles,
    areas,
    selectedFloorId,
    selectedLocationId,
    selectedObstacleId,
    selectedAreaId,
    isLoading,
    isSaving,
    dirtyLocations,
    dirtyObstacles,
    dirtyAreas,
    isDrawingArea,
    drawingPoints,
    createFloor,
    renameFloor,
    deleteFloorAction,
    addLocation,
    selectLocation,
    selectFloor,
    updateLocationState,
    deleteLocationAction,
    addObstacle,
    setSelectedObstacleId,
    updateObstacleState,
    deleteObstacleAction,
    setSelectedAreaId,
    startDrawingArea,
    addDrawingPoint,
    closeAndSaveArea,
    cancelDrawing,
    updateAreaState,
    deleteAreaAction,
    saveChanges,
    cancelChanges,
    getFilteredLocations,
    getFilteredObstacles,
    getFilteredAreas,
    hasUnsavedChanges
  } = useFloorPlan();

  const filteredLocations = getFilteredLocations();
  const filteredObstacles = getFilteredObstacles();
  const filteredAreas = getFilteredAreas();
  const selectedLocation = locations.find(l => l.location_id === selectedLocationId) || null;
  const selectedObstacle = obstacles.find(o => o.id === selectedObstacleId) || null;
  const selectedArea = areas.find(a => a.id === selectedAreaId) || null;
  const totalDirtyCount = dirtyLocations.size + dirtyObstacles.size + dirtyAreas.size;

  return (
    <DashboardLayout>
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex flex-col gap-4 border-b border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Plan de Salle</h1>
              <p className="text-muted-foreground mt-1">
                Positionnez vos tables sur le plan interactif
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={cancelChanges}
                disabled={!hasUnsavedChanges() || isSaving}
                className="gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Annuler
              </Button>
              <Button
                onClick={saveChanges}
                disabled={!hasUnsavedChanges() || isSaving}
                className="gap-2"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Enregistrement...' : 'Sauvegarder'}
                {hasUnsavedChanges() && (
                  <span className="ml-1 px-2 py-0.5 bg-white/20 rounded-full text-xs font-semibold">
                    {totalDirtyCount}
                  </span>
                )}
              </Button>
            </div>
          </div>

          {/* Unsaved indicator */}
          {hasUnsavedChanges() && (
            <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-950 px-3 py-2 rounded-md w-fit">
              ⚠ {totalDirtyCount} modification{totalDirtyCount > 1 ? 's' : ''} non enregistrée{totalDirtyCount > 1 ? 's' : ''}
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="flex-1 flex gap-6 overflow-hidden relative">
          {/* Left sidebar: Controls */}
          <div className="w-96 border-r border-border bg-sidebar overflow-y-auto p-6 space-y-6">
            {/* Floor Selector */}
            <FloorSelector
              floors={floors}
              selectedFloorId={selectedFloorId}
              onFloorSelect={selectFloor}
              onCreateFloor={createFloor}
              onRenameFloor={renameFloor}
              onDeleteFloor={deleteFloorAction}
              isCreating={isSaving}
            />

            <div className="border-t border-border pt-6" />

            {/* Toolbar */}
            <ToolBar
              selectedFloorId={selectedFloorId}
              onAddTable={(shape) => {
                if (!selectedFloorId) return Promise.resolve();
                return addLocation(shape, selectedFloorId);
              }}
              onAddObstacle={(type) => {
                if (!selectedFloorId) return Promise.resolve();
                return addObstacle(selectedFloorId, type);
              }}
              isDrawingArea={isDrawingArea}
              onStartDrawArea={() => {
                if (selectedFloorId) startDrawingArea(selectedFloorId);
              }}
              onFinishDrawArea={closeAndSaveArea}
              onCancelDrawArea={cancelDrawing}
              isLoading={isSaving}
            />

            {/* Table List */}
            <div className="border-t border-border pt-6">
              <h3 className="text-sm font-semibold text-foreground mb-3">
                Tables ({filteredLocations.length})
              </h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredLocations.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Aucune table sur cet étage</p>
                ) : (
                  filteredLocations.map(location => (
                    <button
                      key={location.location_id}
                      onClick={() => selectLocation(location.location_id)}
                      className={`w-full text-left px-3 py-2 rounded-md transition-colors text-sm ${
                        selectedLocationId === location.location_id
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted hover:bg-muted/80 text-foreground'
                      }`}
                    >
                      <div className="font-medium">{location.location_name}</div>
                      <div className="text-xs opacity-75">{location.seats} places</div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right: Canvas */}
          <div className="flex-1 overflow-hidden relative">
            <FloorPlanCanvas
              locations={filteredLocations}
              obstacles={filteredObstacles}
              areas={filteredAreas}
              selectedLocationId={selectedLocationId}
              selectedObstacleId={selectedObstacleId}
              selectedAreaId={selectedAreaId}
              onLocationSelect={selectLocation}
              onLocationMove={(locationId, x, y) => {
                updateLocationState(locationId, { x, y });
              }}
              onObstacleSelect={(obstacleId) => setSelectedObstacleId(obstacleId || null)}
              onObstacleMove={(obstacleId, x, y) => {
                updateObstacleState(obstacleId, { x, y });
              }}
              onAreaSelect={(areaId) => setSelectedAreaId(areaId || null)}
              isDrawingArea={isDrawingArea}
              drawingPoints={drawingPoints}
              onAddDrawingPoint={addDrawingPoint}
              onCloseDrawing={closeAndSaveArea}
              onCancelDrawing={cancelDrawing}
              isLoading={isLoading}
            />
          </div>
        </div>

        {/* Properties Panel (desktop side, mobile bottom sheet) */}
        {selectedObstacleId ? (
          <ObstaclePropertiesPanel
            obstacle={selectedObstacle}
            onUpdate={(updates) => {
              if (selectedObstacle) {
                updateObstacleState(selectedObstacle.id, updates);
              }
            }}
            onDelete={() => {
              if (selectedObstacle) {
                return deleteObstacleAction(selectedObstacle.floorId, selectedObstacle.id);
              }
              return Promise.resolve();
            }}
            onClose={() => setSelectedObstacleId(null)}
            isDeleting={isSaving}
          />
        ) : selectedAreaId ? (
          <AreaPropertiesPanel
            area={selectedArea}
            onUpdate={(updates) => {
              if (selectedArea) {
                updateAreaState(selectedArea.id, updates);
              }
            }}
            onDelete={() => {
              if (selectedArea) {
                return deleteAreaAction(selectedArea.floorId, selectedArea.id);
              }
              return Promise.resolve();
            }}
            onClose={() => setSelectedAreaId(null)}
            isDeleting={isSaving}
          />
        ) : (
          <TablePropertiesPanel
            location={selectedLocation}
            floors={floors}
            onUpdate={(updates) => {
              if (selectedLocation) {
                updateLocationState(selectedLocation.location_id, updates);
              }
            }}
            onDelete={() => {
              if (selectedLocation) {
                return deleteLocationAction(selectedLocation.location_id);
              }
              return Promise.resolve();
            }}
            onClose={() => selectLocation(null)}
            isDeleting={isSaving}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
