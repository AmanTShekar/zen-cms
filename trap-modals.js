const fs = require('fs');
const path = require('path');

const modalFiles = [
  "C:/Users/Asus/Desktop/cms/packages/admin/src/components/DocumentEditModal.tsx",
  "C:/Users/Asus/Desktop/cms/packages/admin/src/components/GlobalComponentPickerModal.tsx",
  "C:/Users/Asus/Desktop/cms/packages/admin/src/pages/CollectionListImportModal.tsx",
  "C:/Users/Asus/Desktop/cms/packages/admin/src/pages/editor/components/BlockPickerModal.tsx",
  "C:/Users/Asus/Desktop/cms/packages/admin/src/pages/editor/components/ConfirmPublishModal.tsx",
  "C:/Users/Asus/Desktop/cms/packages/admin/src/pages/editor/components/ConflictResolutionModal.tsx",
  "C:/Users/Asus/Desktop/cms/packages/admin/src/pages/editor/components/DocumentDiffModal.tsx",
  "C:/Users/Asus/Desktop/cms/packages/admin/src/pages/editor/components/DynamicZoneModal.tsx",
  "C:/Users/Asus/Desktop/cms/packages/admin\src/pages/editor/components/MediaLibraryModal.tsx",
  "C:/Users/Asus/Desktop/cms/packages/admin/src/pages/editor/components/RelationsModal.tsx",
  "C:/Users/Asus/Desktop/cms/packages/admin/src/pages/editor/components/SEOModal.tsx",
  "C:/Users/Asus/Desktop/cms/packages/admin/src/pages/editor/components/TemplatesModal.tsx",
  "C:/Users/Asus/Desktop/cms/packages/admin/src/pages/editor/components/TranslationModal.tsx",
  "C:/Users/Asus/Desktop/cms/packages/admin/src/pages/settings/CreateRoleModal.tsx",
  "C:/Users/Asus/Desktop/cms/packages/admin/src/pages/settings/GenerateKeyModal.tsx",
  "C:/Users/Asus/Desktop/cms/packages/admin/src/pages/settings/InviteUserModal.tsx",
  "C:/Users/Asus/Desktop/cms/packages/admin/src/pages/settings/SettingsApiKeyModal.tsx"
];

modalFiles.forEach(file => {
  // Fix backslashes for JS array
  const filePath = file.replace(/\\/g, '/');
  
  if (!fs.existsSync(filePath)) {
    console.log(`Skipping missing file: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');

  // Skip if already has FocusTrap
  if (content.includes('FocusTrap')) return;

  // Add import
  const importMatch = content.match(/import React.*?from 'react'/);
  if (importMatch) {
    content = content.replace(importMatch[0], `${importMatch[0]}\nimport FocusTrap from 'focus-trap-react'`);
  } else {
    // If no exact match, just prepend it
    content = "import FocusTrap from 'focus-trap-react';\n" + content;
  }

  // Find the return statement of the main component
  // Usually looks like: return (\n    <div className="fixed inset-0
  const returnRegex = /return\s*\(\s*<div\s+className=["'][^"']*fixed inset-0/g;
  
  // We need a more robust way to wrap the main return value.
  // Actually, since these are simple Modals returning a root element,
  // we can use string replacement on the first `return (` inside the component
  // or wrap the outermost div with fixed inset-0.
  
  let modifiedContent = content.replace(
    /(return\s*\(\s*)(<div[^>]*className=["'][^"']*(?:fixed|absolute)[^>]*>)/, 
    '$1<FocusTrap focusTrapOptions={{ clickOutsideDeactivates: true, initialFocus: false, escapeDeactivates: true, fallbackFocus: "body" }}>\n      $2'
  );
  
  // Now we need to close the FocusTrap before the final );
  // This is tricky via regex because of nested parens.
  // We can look for the last `</div>\n  )\n}` or `</div>\n    )\n}`
  // Let's replace the last `\n  )\n}` with `\n      </FocusTrap>\n  )\n}`
  if (modifiedContent !== content) {
    // find the last occurrence of `  )\n}`
    const lastParenBrace = modifiedContent.lastIndexOf('\n  )\n}');
    if (lastParenBrace !== -1) {
      modifiedContent = modifiedContent.slice(0, lastParenBrace) + '\n    </FocusTrap>' + modifiedContent.slice(lastParenBrace);
    } else {
      // try another common pattern
      const lastParenBrace2 = modifiedContent.lastIndexOf('\n    )\n  }');
      if (lastParenBrace2 !== -1) {
        modifiedContent = modifiedContent.slice(0, lastParenBrace2) + '\n      </FocusTrap>' + modifiedContent.slice(lastParenBrace2);
      } else {
        // try finding last `</div>\n  )` or similar
        const lastDivParen = modifiedContent.lastIndexOf('</div>\n  )');
        if (lastDivParen !== -1) {
          modifiedContent = modifiedContent.slice(0, lastDivParen + 6) + '\n    </FocusTrap>' + modifiedContent.slice(lastDivParen + 6);
        } else {
           console.log(`Could not find closing parenthesis for ${filePath}`);
           return;
        }
      }
    }
    
    fs.writeFileSync(filePath, modifiedContent, 'utf8');
    console.log(`Added FocusTrap to ${filePath}`);
  } else {
    console.log(`Regex did not match return pattern in ${filePath}`);
  }
});
