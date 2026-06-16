const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'packages/admin/src/pages/ComponentBuilderPage.tsx');
let content = fs.readFileSync(file, 'utf8');

// Add imports
const importIndex = content.indexOf("import { invalidateCustomComponentsCache } from '../hooks/useCustomComponents'");
content = content.slice(0, importIndex) + 
`import { invalidateCustomComponentsCache } from '../hooks/useCustomComponents'
import { BuilderVisualTab } from './component-builder/BuilderVisualTab'
import { BuilderCodeTab } from './component-builder/BuilderCodeTab'
import { BuilderAITab } from './component-builder/BuilderAITab'
` + content.slice(importIndex + 78);

// Remove the FIELD_TYPES and CATEGORIES arrays from here
const ftStart = content.indexOf('const FIELD_TYPES = [');
const ftEnd = content.indexOf(']', ftStart) + 1;
content = content.substring(0, ftStart) + content.substring(ftEnd);

const catStart = content.indexOf('const CATEGORIES = [');
const catEnd = content.indexOf(']', catStart) + 1;
content = content.substring(0, catStart) + content.substring(catEnd);

// Visual Tab Replacement
const visualStart = content.indexOf('{activeTab === \'visual\' && (');
const visualEndSearch = '</motion.div>\n            )}';
// We need to be careful with visualEndSearch. Let's just do a manual string replace.
// Using regex to replace the chunks:
const codeTabContent = `<BuilderCodeTab
                codeImport={codeImport}
                setCodeImport={setCodeImport}
                handleCodeImport={handleCodeImport}
                handleRegisterCode={handleRegisterCode}
                dark={dark}
              />`;

const aiTabContent = `<BuilderAITab
                aiPrompt={aiPrompt}
                setAiPrompt={setAiPrompt}
                isAIGenerating={isAIGenerating}
                handleAIGenerate={handleAIGenerate}
                dark={dark}
              />`;

const visualTabContent = `<BuilderVisualTab
                activeComponent={activeComponent}
                setActiveComponent={setActiveComponent}
                showPreview={showPreview}
                generateJSON={generateJSON}
                generateTS={generateTS}
                copied={copied}
                setCopied={setCopied}
                dark={dark}
              />`;

// Replacing Visual Tab
const visualMatchStart = content.indexOf('{/* ── Visual Editor ───────────────────────────────────────────── */}');
const visualMatchEnd = content.indexOf('{/* ── Code / JSON Import Tab ───────────────────────────────── */}');
if (visualMatchStart > -1 && visualMatchEnd > -1) {
  content = content.substring(0, visualMatchStart) + 
    `{/* ── Visual Editor ───────────────────────────────────────────── */}
            <AnimatePresence mode="wait">
              {activeTab === 'visual' && (
                ${visualTabContent}
              )}
            </AnimatePresence>\n\n            ` + content.substring(visualMatchEnd);
}

// Replacing Code Tab
const codeMatchStart = content.indexOf('{/* ── Code / JSON Import Tab ───────────────────────────────── */}');
const codeMatchEnd = content.indexOf('{/* ── AI Generate Tab ─────────────────────────────────────── */}');
if (codeMatchStart > -1 && codeMatchEnd > -1) {
  content = content.substring(0, codeMatchStart) + 
    `{/* ── Code / JSON Import Tab ───────────────────────────────── */}
            {activeTab === 'code' && (
              ${codeTabContent}
            )}\n\n            ` + content.substring(codeMatchEnd);
}

// Replacing AI Tab
const aiMatchStart = content.indexOf('{/* ── AI Generate Tab ─────────────────────────────────────── */}');
const aiMatchEnd = content.indexOf('</motion.div>\n          ) : (');
if (aiMatchStart > -1 && aiMatchEnd > -1) {
  content = content.substring(0, aiMatchStart) + 
    `{/* ── AI Generate Tab ─────────────────────────────────────── */}
            {activeTab === 'ai' && (
              ${aiTabContent}
            )}\n          ` + content.substring(aiMatchEnd);
}

// Also need to remove the unused addField, updateField, removeField from ComponentBuilderPage since they are moved
const addFieldStart = content.indexOf('const addField = () => {');
const addFieldEnd = content.indexOf('const handleSave = async () => {');
if (addFieldStart > -1 && addFieldEnd > -1) {
  content = content.substring(0, addFieldStart) + content.substring(addFieldEnd);
}

fs.writeFileSync(file, content);
console.log('ComponentBuilderPage.tsx refactored successfully');
