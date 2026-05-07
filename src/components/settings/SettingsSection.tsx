import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FieldConfig } from "@/types/settings";
import PhoneInput, { CountryCode, isValidPhoneNumber } from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { cn } from "@/lib/utils";

interface SettingsSectionProps {
  fields: FieldConfig[];
  values: Record<string, any>;
  onChange: (key: string, value: any) => void;
  defaultPhoneCountry?: string;
}

const resolveCountryCode = (countryCode?: string): CountryCode => {
  const normalized = countryCode?.trim().toUpperCase();
  if (normalized && normalized.length === 2) {
    return normalized as CountryCode;
  }
  return 'FR';
};

export const SettingsSection = ({ fields, values, onChange, defaultPhoneCountry }: SettingsSectionProps) => {
  const phoneDefaultCountry = resolveCountryCode(defaultPhoneCountry);

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
          ) : field.type === 'tel' ? (
            <div>
              <Label htmlFor={field.key} className="text-sm font-medium">
                {field.label}
              </Label>
              <PhoneInput
                id={field.key}
                international
                withCountryCallingCode
                countryCallingCodeEditable={false}
                defaultCountry={phoneDefaultCountry}
                value={values[field.key] ?? ''}
                onChange={(value) => onChange(field.key, value ?? '')}
                className={cn(
                  "flex rounded-md border border-input bg-background px-3 py-2 text-sm",
                  values[field.key] && !isValidPhoneNumber(values[field.key]) && "border-destructive"
                )}
                numberInputProps={{
                  className: "flex-1 bg-transparent outline-none placeholder:text-muted-foreground",
                  placeholder: field.placeholder,
                }}
              />
              {values[field.key] && !isValidPhoneNumber(values[field.key]) && (
                <p className="text-xs text-destructive">
                  Numéro incomplet ou invalide pour le pays sélectionné.
                </p>
              )}
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
                  if (field.readOnly) return;
                  const value = field.type === 'number' ? Number(e.target.value) : e.target.value;
                  onChange(field.key, value);
                }}
                placeholder={field.placeholder}
                min={field.min}
                max={field.max}
                readOnly={field.readOnly}
                disabled={field.readOnly}
                className={field.readOnly ? 'opacity-60 cursor-not-allowed bg-muted' : ''}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
