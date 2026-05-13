import React from 'react';
import { Plus, Trash2 } from 'lucide-react';

interface FieldConfig {
  name: string;
  label?: string;
  [key: string]: unknown;
}

interface SimpleArrayBuilderProps {
  value?: Record<string, unknown>[];
  onChange: (value: Record<string, unknown>[]) => void;
  fields: FieldConfig[];
  label: string;
  renderField: (field: FieldConfig, value: unknown, onChange: (val: unknown) => void) => React.ReactNode;
}

const SimpleArrayBuilder: React.FC<SimpleArrayBuilderProps> = ({ value = [], onChange, fields, label, renderField }) => {
  const addItem = () => {
    onChange([...value, {}]);
  };

  const removeItem = (index: number) => {
    const newValue = [...value];
    newValue.splice(index, 1);
    onChange(newValue);
  };

  const updateItemData = (index: number, fieldName: string, fieldValue: unknown) => {
    const newValue = [...value];
    newValue[index] = {
      ...newValue[index],
      [fieldName]: fieldValue
    };
    onChange(newValue);
  };

  return (
    <div className="space-y-4 col-span-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-text-secondary uppercase tracking-widest">{label}</label>
        <button 
          type="button" 
          onClick={addItem}
          className="btn btn-primary btn-xs flex items-center gap-1 py-1"
        >
          <Plus size={14} /> Add Item
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {value.map((item, index) => (
          <div key={index} className="bg-app-subtle border border-border rounded-none p-4 relative group">
            <button 
              type="button" 
              onClick={() => removeItem(index)}
              className="absolute top-2 right-2 p-1.5 hover:bg-error/10 hover:text-error rounded-none opacity-0 group-hover:opacity-100 transition-all text-text-muted"
            >
              <Trash2 size={14} />
            </button>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {fields.map(field => (
                <div key={field.name} className="space-y-1">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-tight">{field.label || field.name}</label>
                  {renderField(field, item[field.name], (val) => updateItemData(index, field.name, val))}
                </div>
              ))}
            </div>
          </div>
        ))}

        {value.length === 0 && (
          <div className="py-4 border border-dashed border-border rounded-none text-center text-xs text-text-muted">
            No items added to {label}.
          </div>
        )}
      </div>
    </div>
  );
};

export default SimpleArrayBuilder;
