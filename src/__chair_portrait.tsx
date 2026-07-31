import { createRoot } from 'react-dom/client';
import { Stage, Layer, Text } from 'react-konva';
import { TableShape } from '@/components/locations/TableShape';
import { getChairPositions } from '@/utils/chairPositions';
import type { Location } from '@/services/locationsService';

const base = {
  merchant_id: 'm1',
  floor_id: null,
  angle: 0,
  enabled: true,
  attributes: null,
  open_order_id: null
};

// Portrait rectangle: width < height ("Longue table" oriented vertically).
const longue: Location = {
  location_id: 'longue',
  location_name: 'Longue table',
  seats: 10,
  shape: 'rectangle',
  x: 20,
  y: 20,
  width: 80,
  height: 200,
  ...base
};

const table12: Location = {
  location_id: 't12',
  location_name: 'Table 12',
  seats: 6,
  shape: 'rectangle',
  x: 220,
  y: 20,
  width: 100,
  height: 120,
  ...base
};

const raw = getChairPositions('rectangle', 80, 200, 10);
console.log('portrait raw positions (10 seats, w=80,h=200):', JSON.stringify(raw));
console.log('portrait count:', raw.length);

function Preview() {
  return (
    <div style={{ background: '#fff', padding: 20 }}>
      <p>chairs returned: {raw.length}</p>
      <Stage width={500} height={280}>
        <Layer>
          <TableShape
            location={longue}
            isSelected={false}
            booking={null}
            onSelect={() => {}}
            onDragMove={() => {}}
            scaleRatio={1}
          />
          <TableShape
            location={table12}
            isSelected={false}
            booking={null}
            onSelect={() => {}}
            onDragMove={() => {}}
            scaleRatio={1}
          />
          <Text x={20} y={5} text="Portrait rectangles" fontSize={12} fill="#333" />
        </Layer>
      </Stage>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<Preview />);
