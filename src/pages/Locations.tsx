import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Save, RotateCcw } from 'lucide-react';
import { useFloorPlan } from '@/hooks/useFloorPlan';
import { FloorPlanCanvas } from '@/components/locations/FloorPlanCanvas';
import { TablePropertiesPanel } from '@/components/locations/TablePropertiesPanel';
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
  const {
    floors,
    locations,
    selectedFloorId,
    selectedLocationId,
    isLoading,
    isSaving,
    dirtyLocations,
    createFloor,
    addLocation,
    selectLocation,
    selectFloor,
    updateLocationState,
    deleteLocationAction,
    saveChanges,
    cancelChanges,
    getFilteredLocations,
    hasUnsavedChanges
  } = useFloorPlan();

  const filteredLocations = getFilteredLocations();
  const selectedLocation = locations.find(l => l.location_id === selectedLocationId) || null;

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
                    {dirtyLocations.size}
                  </span>
                )}
              </Button>
            </div>
          </div>

          {/* Unsaved indicator */}
          {hasUnsavedChanges() && (
            <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-950 px-3 py-2 rounded-md w-fit">
              ⚠ {dirtyLocations.size} modification{dirtyLocations.size > 1 ? 's' : ''} non enregistrée{dirtyLocations.size > 1 ? 's' : ''}
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
              selectedLocationId={selectedLocationId}
              onLocationSelect={selectLocation}
              onLocationMove={(locationId, x, y) => {
                updateLocationState(locationId, { x, y });
              }}
              isLoading={isLoading}
            />
          </div>
        </div>

        {/* Properties Panel (desktop side, mobile bottom sheet) */}
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
      </div>
    </DashboardLayout>
  );
}
