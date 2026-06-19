const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, 'packages', 'admin', 'src', 'pages', 'settings', 'SettingsThemeStore.tsx');
let content = fs.readFileSync(targetPath, 'utf8');

const newComponents = `
function getThemePreviewVars(p: ThemePreset) {
  const isClassic = p.designStyle === 'classic';
  const br = p.borderRadius === 'sm' ? '2px' : p.borderRadius === 'md' ? '4px' : p.borderRadius === 'lg' ? '6px' : '0px';
  return {
    bgBase: p.bgBase || (isClassic ? '#050505' : '#000'),
    bgPanel: p.bgPanel || (isClassic ? '#111827' : 'rgba(255,255,255,0.02)'),
    borderColor: p.borderColor || (isClassic ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)'),
    radius: br
  };
}

// ── Mini sidebar preview ──────────────────────────────────────────────────────
function MiniPreview({ p, label }: { p: ThemePreset; label?: string }) {
  const v = getThemePreviewVars(p);
  return (
    <div className="border overflow-hidden" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
      {label && <div className="px-2 py-1 text-[7px] font-black uppercase tracking-widest text-z-secondary border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>{label}</div>}
      <div className="flex h-28" style={{ background: v.bgBase }}>
        {/* Sidebar */}
        <div className="w-12 flex flex-col gap-1 p-1.5 shrink-0" style={{ background: p.sidebarBg }}>
          <div className="w-6 h-6 flex items-center justify-center text-[7px] font-black mb-1" style={{ background: p.logoIconBg, color: p.logoIconText, borderRadius: v.radius }}>Z</div>
          {[100, 80, 65, 75].map((w, i) => (
            <div key={i} className="h-1.5" style={i === 0
              ? { background: p.activeBg, borderLeft: \`2px solid \${p.activeText}\`, width: \`\${w}%\`, borderRadius: v.radius }
              : { background: 'rgba(255,255,255,0.05)', width: \`\${w}%\`, borderRadius: v.radius }} />
          ))}
        </div>
        {/* Content */}
        <div className="flex-1 p-2 space-y-1.5">
          <div className="h-1.5 bg-gray-700/50" style={{ width: '50%', borderRadius: v.radius }} />
          <div className="grid grid-cols-2 gap-1">
            <div className="h-7 border" style={{ borderColor: p.activeBorder, background: p.activeBg, borderRadius: v.radius }}>
              <div className="h-1 mt-1.5 mx-1.5" style={{ background: p.activeText, width: '55%', opacity: 0.9, borderRadius: v.radius }} />
            </div>
            <div className="h-7 border" style={{ borderColor: v.borderColor, background: v.bgPanel, borderRadius: v.radius }} />
          </div>
          <div className="h-4 border flex items-center justify-center text-[7px] font-black"
            style={{ borderColor: p.activeBorder, background: p.activeBg, color: p.activeText, boxShadow: p.activeGlow, borderRadius: v.radius }}>
            {p.name || 'ACTIVE'}
          </div>
          <div className="h-4 border" style={{ borderColor: v.borderColor, background: v.bgPanel, borderRadius: v.radius }} />
        </div>
      </div>
    </div>
  )
}

// ── Theme Card ────────────────────────────────────────────────────────────────
function ThemeCard({ preset, isActive, onApply, onDelete, onExport, onEdit, dark }: {
  preset: ThemePreset; isActive: boolean; onApply: () => void
  onDelete?: () => void; onExport?: () => void; onEdit?: () => void; dark: boolean
}) {
  const v = getThemePreviewVars(preset);
  return (
    <motion.div layout whileHover={{ scale: 1.01 }} transition={{ duration: 0.15 }}
      className={cn('relative border transition-all overflow-hidden group')}
      style={isActive ? { borderColor: preset.activeBorder, boxShadow: preset.activeGlow } : { borderColor: dark ? 'rgba(255,255,255,0.06)' : '#e5e7eb' }}>
      {/* Preview */}
      <div className="h-28 relative overflow-hidden">
        <div className="flex h-full" style={{ background: v.bgBase }}>
          <div className="w-11 flex flex-col gap-1 p-1.5 shrink-0" style={{ background: preset.sidebarBg }}>
            <div className="w-5 h-5 flex items-center justify-center text-[7px] font-black mb-1" style={{ background: preset.logoIconBg, color: preset.logoIconText, borderRadius: v.radius }}>
              {(preset.name || 'Z')[0]}
            </div>
            {[90, 70, 55, 80].map((w, i) => (
              <div key={i} className="h-1.5" style={i === 1
                ? { background: preset.activeText, width: \`\${w}%\`, opacity: 0.9, borderRadius: v.radius }
                : { background: 'rgba(255,255,255,0.06)', width: \`\${w}%\`, borderRadius: v.radius }} />
            ))}
          </div>
          <div className="flex-1 p-2 space-y-1.5">
            <div className="h-1.5 bg-gray-700/40" style={{ width: '50%', borderRadius: v.radius }} />
            <div className="grid grid-cols-2 gap-1">
              {[0, 1, 2, 3].map(i => (
                <div key={i} className="h-7 border" style={{ borderColor: i === 0 ? preset.activeBorder : v.borderColor, background: i === 0 ? preset.activeBg : v.bgPanel, borderRadius: v.radius }}>
                  {i === 0 && <div className="h-1 mt-1.5 mx-1.5" style={{ background: preset.accentHex, width: '60%', opacity: 0.8, borderRadius: v.radius }} />}
                </div>
              ))}
            </div>
            <div className="h-3.5 border flex items-center justify-center" style={{ borderColor: preset.activeBorder, background: preset.activeBg, borderRadius: v.radius }}>
              <div className="w-6 h-0.5" style={{ background: preset.activeText, opacity: 0.8, borderRadius: v.radius }} />
            </div>
          </div>
        </div>
      </div>
      {/* Info */}
      <div className={cn('p-3 border-t relative', dark ? 'bg-black/60 border-z-border' : 'bg-white border-z-border')}>
        {/* Structural Badge */}
        <div className="absolute top-0 right-3 -translate-y-1/2 flex items-center">
          <span className={cn(
            "px-2 py-0.5 text-[6px] font-black uppercase tracking-widest border shadow-sm backdrop-blur-sm",
            preset.designStyle === 'classic' 
              ? "bg-blue-500/10 border-blue-500/30 text-blue-400" 
              : "bg-fuchsia-500/10 border-fuchsia-500/30 text-fuchsia-400"
          )}>
            {preset.designStyle === 'classic' ? 'CLASSIC' : 'GLASS'}
          </span>
        </div>

        <div className="flex items-start gap-2">
          <div className="w-3 h-3 flex-shrink-0 mt-0.5" style={{ background: preset.accentHex, borderRadius: v.radius }} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className={cn('text-[10px] font-black uppercase tracking-wide truncate', dark ? 'text-white' : 'text-z-primary')}>{preset.name}</span>
              {isActive && <Check size={9} style={{ color: preset.activeText, flexShrink: 0 }} />}
            </div>
            {preset.description && <p className="text-[8px] text-z-secondary mt-0.5 line-clamp-1">{preset.description}</p>}
            {preset.tags && (
              <div className="flex gap-1 mt-1.5 flex-wrap">
                {preset.tags.slice(0, 3).map(t => (
                  <span key={t} className="text-[7px] font-black uppercase tracking-wider px-1 py-0.5 border text-z-secondary rounded-sm" style={{ borderColor: dark ? 'rgba(255,255,255,0.07)' : '#e5e7eb' }}>{t}</span>
                ))}
              </div>
            )}
          </div>
          <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            {onEdit && <button onClick={onEdit} className="p-1 border text-z-secondary hover:text-white" style={{ borderColor: 'rgba(255,255,255,0.08)' }} title="Edit"><Edit3 size={9} /></button>}
            {onExport && <button onClick={onExport} className="p-1 border text-z-secondary hover:text-white" style={{ borderColor: 'rgba(255,255,255,0.08)' }} title="Export JSON"><Download size={9} /></button>}
            {onDelete && <button onClick={onDelete} className="p-1 border border-red-500/20 text-red-400 hover:bg-red-500/10" title="Delete"><Trash2 size={9} /></button>}
          </div>
        </div>
      </div>
      {/* Apply / Active badge */}
      {isActive
        ? <div className="absolute top-2 right-2 px-2 py-0.5 text-[7px] font-black uppercase tracking-widest border"
            style={{ background: preset.activeBg, borderColor: preset.activeBorder, color: preset.activeText, borderRadius: v.radius }}>Active</div>
        : <button onClick={onApply} className="absolute bottom-3 right-3 px-2.5 py-1.5 text-[7px] font-black uppercase tracking-widest border opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ borderColor: dark ? 'rgba(255,255,255,0.1)' : '#d1d5db', color: dark ? '#ccc' : '#555', borderRadius: v.radius }}>Apply</button>}
    </motion.div>
  )
}
`;

const startIndex = content.indexOf('// ── Mini sidebar preview');
const endIndex = content.indexOf('// ── Full Theme Creator Wizard');

if (startIndex !== -1 && endIndex !== -1) {
  content = content.substring(0, startIndex) + newComponents + '\n' + content.substring(endIndex);
  fs.writeFileSync(targetPath, content, 'utf8');
  console.log('Successfully updated Theme Store previews!');
} else {
  console.log('Failed to find boundaries in the file.');
}
