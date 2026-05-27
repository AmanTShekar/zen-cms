# Field Registration

You can add custom field renderers without editing `FieldRenderer.tsx` or `constants.ts`.

## Register a component

```ts
import { registerField } from '../editor/fieldRegistry'
import MyCustomField from './MyCustomField'

// In your plugin init or a top-level module:
registerField('myCustomType', MyCustomField)
```

Once registered, any `FieldDefinition` with `type: 'myCustomType'` will automatically render using `MyCustomField` wherever the `FieldRenderer` is used.

## Props your component receives

```ts
interface FieldRendererComponentProps {
  blockId: string
  field: FieldDefinition
  value: any
  onChange: (value: any) => void
  onFieldSelect?: (blockId: string, fieldKey: string) => void
  theme: 'light' | 'dark'
  error?: string
  isSelected?: boolean
}
```

## Batch registration

```ts
import { registerFieldMap } from './fieldRegistry'

registerFieldMap({
  colorPicker: ColorPickerField,
  rangeSlider: RangeSliderField,
})
```

## Important notes

- **Registry takes precedence** – if a type is registered, it is used instead of the built-in switch handler.
- **Dev warnings** – overriding an already-registered type logs a warning in development.
- **Type safety** – the `field.type` string must match what you use in your collection config.