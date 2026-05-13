import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import RichTextEditor from './RichTextEditor';
import MediaPicker from './MediaPicker';
import BlocksBuilder from './BlocksBuilder';
import SimpleArrayBuilder from './SimpleArrayBuilder';

interface FormBuilderProps {
  fields: any[];
  initialData?: any;
  onSubmit: (data: any) => Promise<void>;
  isSubmitting?: boolean;
}

const FormBuilder: React.FC<FormBuilderProps> = ({ fields, initialData, onSubmit, isSubmitting }) => {
  const { register, handleSubmit, control, reset, formState: { errors } } = useForm({
    defaultValues: initialData || {},
  });

  React.useEffect(() => {
    if (initialData) {
      reset(initialData);
    }
  }, [initialData, reset]);

  const renderField = (field: any, value: any, onChange: (val: any) => void) => {
    if (field.type === 'select') {
      return (
        <select 
          value={value || (field.hasMany ? [] : '')} 
          onChange={(e) => {
            const val = field.hasMany 
              ? Array.from(e.target.selectedOptions, option => option.value)
              : e.target.value;
            onChange(val);
          }}
          multiple={field.hasMany}
          className="w-full bg-app-subtle border border-border rounded-none px-3 py-2 text-sm focus:border-accent outline-none"
        >
          {!field.required && !field.hasMany && <option value="">Select...</option>}
          {field.options?.map((opt: any) => (
            <option key={opt.value || opt} value={opt.value || opt}>
              {opt.label || opt}
            </option>
          ))}
        </select>
      );
    }

    if (field.type === 'boolean' || field.type === 'checkbox') {
      return (
        <div className="flex items-center h-9">
          <input 
            type="checkbox" 
            checked={!!value}
            onChange={(e) => onChange(e.target.checked)}
            className="w-4 h-4 rounded-none border-border text-accent focus:ring-accent" 
          />
        </div>
      );
    }

    if (field.type === 'number') {
      return (
        <input 
          type="number" 
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
          className="w-full bg-app-subtle border border-border rounded-none px-3 py-2 text-sm focus:border-accent outline-none" 
        />
      );
    }

    if (field.type === 'richtext') {
      return <RichTextEditor value={value} onChange={onChange} placeholder={`Enter ${field.name}...`} />;
    }

    if (field.type === 'media') {
      return <MediaPicker value={value} onChange={onChange} hasMany={field.hasMany} />;
    }

    if (field.type === 'blocks') {
      return <BlocksBuilder value={value} onChange={onChange} availableBlocks={field.blocks || []} renderField={renderField} />;
    }

    if (field.type === 'array') {
      return (
        <SimpleArrayBuilder 
          value={value} 
          onChange={onChange} 
          fields={field.fields || []} 
          label={field.label || field.name} 
          renderField={renderField} 
        />
      );
    }

    if (field.type === 'textarea') {
      return (
        <textarea 
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          rows={8}
          className="w-full bg-app-subtle border border-border rounded-none px-4 py-3 text-sm focus:border-accent outline-none min-h-[150px] transition-all focus:ring-2 focus:ring-accent/10"
          placeholder={`Enter ${field.name}...`}
        />
      );
    }

    // Default: text, email, password, date, etc.
    return (
      <input 
        type={field.type === 'date' ? 'date' : 'text'} 
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-app-subtle border border-border rounded-none px-3 py-2 text-sm focus:border-accent outline-none" 
        placeholder={`Enter ${field.name}...`} 
      />
    );
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
        {fields.map((field) => {
          if (field.name === '_status' || field.name === 'id') return null;

          const isFullWidth = ['richtext', 'blocks', 'array'].includes(field.type);

          return (
            <div key={field.name} className={`space-y-2 ${isFullWidth ? 'col-span-2' : ''}`}>
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-text-primary capitalize flex items-center gap-2">
                  {field.label || field.name.replace(/([A-Z])/g, ' $1')}
                  {field.required && <span className="text-danger">*</span>}
                </label>
                {field.description && (
                  <span className="text-[10px] text-text-muted">{field.description}</span>
                )}
              </div>

              <Controller
                name={field.name}
                control={control}
                render={({ field: { onChange, value } }) => renderField(field, value, onChange)}
              />

              {errors[field.name] && (
                <p className="text-xs text-danger mt-1 font-medium">{(errors[field.name] as any).message}</p>
              )}
            </div>
          );
        })}
      </div>

      <div className="pt-8 border-t border-border flex items-center justify-between">
        <p className="text-xs text-text-muted">
          Fields marked with <span className="text-danger">*</span> are required.
        </p>
        <div className="flex gap-3">
          <button type="submit" disabled={isSubmitting} className="btn btn-primary min-w-[140px] h-11">
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <Loader2 size={18} className="animate-spin" />
                <span>Saving...</span>
              </div>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </div>
    </form>
  );
};

export default FormBuilder;
