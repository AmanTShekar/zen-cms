const fs = require('fs');
let file = fs.readFileSync('packages/admin/src/components/lexical/LexicalRichTextEditor.tsx', 'utf8');

file = file.replace(
  'onChange(JSON.stringify(root))',
  'onChange(JSON.stringify(editorState.toJSON()))'
);

file = file.replace(
  'editorState.read(() => {\n        const root = $getRoot()\n        onChange(JSON.stringify(editorState.toJSON()))\n      })',
  'onChange(JSON.stringify(editorState.toJSON()))'
);

file = file.replace(
  'const initialConfig = useMemo(\n    () => ({\n      namespace: EDITOR_NAMESPACE,\n      nodes,\n      onError,\n      editable: !disabled,\n      theme: {',
  'const initialConfig = useMemo(\n    () => {\n      let editorState = undefined;\n      if (typeof value === \'string\' && value.startsWith(\'{"root"\')) {\n        editorState = value;\n      } else if (typeof value === \'object\' && value?.root) {\n        editorState = JSON.stringify(value);\n      }\n\n      return {\n      namespace: EDITOR_NAMESPACE,\n      nodes,\n      onError,\n      editable: !disabled,\n      editorState,\n      theme: {'
);

file = file.replace(
  '          quote: \'lexical-quote\',\n        },\n      }),\n    [disabled],\n  )',
  '          quote: \'lexical-quote\',\n        },\n      }\n    },\n    [disabled, value],\n  )'
);

fs.writeFileSync('packages/admin/src/components/lexical/LexicalRichTextEditor.tsx', file);
