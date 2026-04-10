import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type ChannelType = 'all' | 'sur_place' | 'emporter' | 'uber_eats' | 'deliveroo';

const channelConfig: Record<
  ChannelType,
  { label: string; colorHex: string }
> = {
  all: { label: 'Tout', colorHex: '#3b82f6' },
  sur_place: { label: 'Sur place', colorHex: '#3b82f6' },
  emporter: { label: 'À emporter', colorHex: '#10b981' },
  uber_eats: { label: 'Uber Eats', colorHex: '#06b6d4' },
  deliveroo: { label: 'Deliveroo', colorHex: '#14b8a6' },
};

interface ChannelToggleButtonsProps {
  selectedChannels: ChannelType[];
  onChange: (channels: ChannelType[]) => void;
}

export const ChannelToggleButtons = ({
  selectedChannels,
  onChange,
}: ChannelToggleButtonsProps) => {
  const channels: ChannelType[] = ['all', 'sur_place', 'emporter', 'uber_eats', 'deliveroo'];

  const handleToggle = (channel: ChannelType) => {
    if (channel === 'all') {
      // Toggle all channels
      if (selectedChannels.includes('all')) {
        onChange([]);
      } else {
        onChange(channels);
      }
    } else {
      let newSelection = selectedChannels.filter(c => c !== 'all');

      if (newSelection.includes(channel)) {
        newSelection = newSelection.filter(c => c !== channel);
      } else {
        newSelection = [...newSelection, channel];
      }

      onChange(newSelection.length === 0 ? [] : newSelection);
    }
  };

  return (
    <div className="flex gap-2 flex-wrap">
      {channels.map((channel) => {
        const isSelected =
          channel === 'all'
            ? selectedChannels.length === channels.length ||
              selectedChannels.includes('all')
            : selectedChannels.includes(channel);

        const config = channelConfig[channel];

        return (
          <Button
            key={channel}
            onClick={() => handleToggle(channel)}
            size="sm"
            variant={isSelected ? 'default' : 'outline'}
            className={cn(
              'rounded-full text-xs font-semibold transition-all duration-150 ease-out',
              isSelected && 'text-white shadow-sm hover:shadow-md',
              !isSelected && 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
            )}
            style={
              isSelected
                ? { backgroundColor: config.colorHex }
                : undefined
            }
          >
            {config.label}
          </Button>
        );
      })}
    </div>
  );
};

export const channelColors: Record<ChannelType, string> = {
  all: '#3b82f6',
  sur_place: '#3b82f6',
  emporter: '#10b981',
  uber_eats: '#06b6d4',
  deliveroo: '#14b8a6',
};
