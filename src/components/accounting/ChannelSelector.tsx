import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Store,
  ShoppingBag,
  Smartphone,
  Bike,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Channel {
  id: string;
  label: string;
}

interface ChannelSelectorProps {
  channels: Channel[];
  selectedChannels: string[];
  onChange: (channels: string[]) => void;
  disabled?: boolean;
}

const CHANNEL_ICONS: Record<string, React.ReactNode> = {
  restaurant: <Store className="w-5 h-5" />,
  takeaway: <ShoppingBag className="w-5 h-5" />,
  scannorder: <Smartphone className="w-5 h-5" />,
  ubereats: <Zap className="w-5 h-5" />,
  deliveroo: <Bike className="w-5 h-5" />,
};

export const ChannelSelector = ({
  channels,
  selectedChannels,
  onChange,
  disabled = false,
}: ChannelSelectorProps) => {
  const handleToggle = (channelId: string) => {
    if (selectedChannels.includes(channelId)) {
      onChange(selectedChannels.filter((id) => id !== channelId));
    } else {
      onChange([...selectedChannels, channelId]);
    }
  };

  return (
    <div className="space-y-3">
      <Label className="text-sm font-semibold">Canaux de vente</Label>
      <div className="flex flex-wrap gap-3">
        {channels.map((channel) => (
          <label
            key={channel.id}
            className={cn(
              'flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer transition-all whitespace-nowrap',
              selectedChannels.includes(channel.id)
                ? 'border-primary bg-primary/5'
                : 'border-input hover:border-primary/50 hover:bg-accent/50',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            <Checkbox
              checked={selectedChannels.includes(channel.id)}
              onCheckedChange={() => handleToggle(channel.id)}
              disabled={disabled}
              className="mt-0.5"
            />
            <div className="flex items-center gap-2">
              <div className="text-muted-foreground">
                {CHANNEL_ICONS[channel.id] || <Store className="w-5 h-5" />}
              </div>
              <span className="text-sm font-medium">{channel.label}</span>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
};
