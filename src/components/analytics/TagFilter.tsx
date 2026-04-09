import { Checkbox } from '@/components/ui/checkbox';

interface TagFilterProps {
  availableTags: string[];
  selectedTags: string[];
  onChange: (tags: string[]) => void;
}

export const TagFilter = ({
  availableTags,
  selectedTags,
  onChange,
}: TagFilterProps) => {
  const handleToggle = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onChange(selectedTags.filter((t) => t !== tag));
    } else {
      onChange([...selectedTags, tag]);
    }
  };

  return (
    <div className="space-y-2">
      {availableTags.map((tag) => (
        <label key={tag} className="flex items-center space-x-2 cursor-pointer">
          <Checkbox
            checked={selectedTags.includes(tag)}
            onCheckedChange={() => handleToggle(tag)}
          />
          <span className="text-sm text-foreground">{tag}</span>
        </label>
      ))}
    </div>
  );
};
