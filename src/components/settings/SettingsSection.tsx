import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FieldConfig } from "@/types/settings";

interface SettingsSectionProps {
  fields: FieldConfig[];
  values: Record<string, any>;
  onChange: (key: string, value: any) => void;
}

export const SettingsSection = ({ fields, values, onChange }: SettingsSectionProps) => {
  return (
    <div className="space-y-4">
      {fields.map((field) => (
        <div key={field.key} className="space-y-2">
          {field.type === 'switch' ? (
            <div className="flex items-center justify-between">
              <Label htmlFor={field.key} className="text-sm font-medium">
                {field.label}
              </Label>
              <Switch
                id={field.key}
                checked={values[field.key] ?? false}
                onCheckedChange={(checked) => onChange(field.key, checked)}
              />
            </div>
          ) : field.type === 'select' ? (
            <div>
              <Label htmlFor={field.key} className="text-sm font-medium">
                {field.label}
              </Label>
              <Select
                value={values[field.key]}
                onValueChange={(value) => onChange(field.key, value)}
              >
                <SelectTrigger id={field.key}>
                  <SelectValue placeholder={field.placeholder} />
                </SelectTrigger>
                <SelectContent>
                  {field.options?.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div>
              <Label htmlFor={field.key} className="text-sm font-medium">
                {field.label}
              </Label>
              <Input
                id={field.key}
                type={field.type}
                value={values[field.key] ?? ''}
                onChange={(e) => {
                  const value = field.type === 'number' ? Number(e.target.value) : e.target.value;
                  onChange(field.key, value);
                }}
                placeholder={field.placeholder}
                min={field.min}
                max={field.max}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
