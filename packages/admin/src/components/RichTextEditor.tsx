import React, { useEffect, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import { Underline } from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { FontFamily } from '@tiptap/extension-font-family';
import { Link } from '@tiptap/extension-link';
import { Image } from '@tiptap/extension-image';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  Quote,
  Heading1,
  Heading2,
  Heading3,
  Link as LinkIcon,
  ImageIcon,
  X,
  Search,
  Check,
  Plus
} from 'lucide-react';
import api from '../lib/api';
import { motion, AnimatePresence } from 'framer-motion';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const ToolBtn = ({
  onClick,
  isActive,
  title,
  children,
}: {
  onClick: () => void;
  isActive?: boolean;
  title: string;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    className={`p-1.5 rounded transition-colors ${
      isActive
        ? 'bg-accent text-white'
        : 'text-text-secondary hover:bg-app-subtle hover:text-text-primary'
    }`}
  >
    {children}
  </button>
);

const Divider = () => <div className="w-px h-5 bg-border mx-0.5 shrink-0" />;

const MenuBar = ({ editor, onOpenMedia }: { editor: any, onOpenMedia: () => void }) => {
  if (!editor) return null;

  const addLink = () => {
    const existing = editor.getAttributes('link').href;
    const url = window.prompt('Enter URL:', existing || 'https://');
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().unsetLink().run();
    } else {
      editor.chain().focus().setLink({ href: url, target: '_blank' }).run();
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-0.5 p-2 border-b border-border bg-app-subtle">
      <ToolBtn onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive('bold')} title="Bold (Ctrl+B)">
        <Bold size={15} />
      </ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive('italic')} title="Italic (Ctrl+I)">
        <Italic size={15} />
      </ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().toggleUnderline().run()} isActive={editor.isActive('underline')} title="Underline (Ctrl+U)">
        <UnderlineIcon size={15} />
      </ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().toggleStrike().run()} isActive={editor.isActive('strike')} title="Strikethrough">
        <Strikethrough size={15} />
      </ToolBtn>

      <Divider />

      <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} isActive={editor.isActive('heading', { level: 1 })} title="Heading 1">
        <Heading1 size={15} />
      </ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} isActive={editor.isActive('heading', { level: 2 })} title="Heading 2">
        <Heading2 size={15} />
      </ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} isActive={editor.isActive('heading', { level: 3 })} title="Heading 3">
        <Heading3 size={15} />
      </ToolBtn>

      <Divider />

      <ToolBtn onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive('bulletList')} title="Bullet List">
        <List size={15} />
      </ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} isActive={editor.isActive('orderedList')} title="Ordered List">
        <ListOrdered size={15} />
      </ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} isActive={editor.isActive('blockquote')} title="Blockquote">
        <Quote size={15} />
      </ToolBtn>

      <Divider />

      <ToolBtn onClick={addLink} isActive={editor.isActive('link')} title="Insert / Edit Link">
        <LinkIcon size={15} />
      </ToolBtn>
      <ToolBtn onClick={onOpenMedia} title="Insert Image from Library">
        <ImageIcon size={15} />
      </ToolBtn>

      <Divider />

      <select
        onChange={(e) => {
          if (e.target.value) {
            editor.chain().focus().setFontFamily(e.target.value).run();
          } else {
            editor.chain().focus().unsetFontFamily().run();
          }
        }}
        className="text-xs py-1 px-2 border border-border rounded bg-app-surface focus:outline-none focus:border-accent text-text-primary h-7"
        title="Font Family"
      >
        <option value="">Default</option>
        <option value="Inter, sans-serif">Inter</option>
        <option value="Georgia, serif">Serif</option>
        <option value="'Courier New', monospace">Monospace</option>
      </select>

      <label title="Text Color" className="cursor-pointer">
        <input
          type="color"
          onInput={(e) => editor.chain().focus().setColor((e.target as HTMLInputElement).value).run()}
          defaultValue="#0A0A0A"
          className="w-7 h-7 p-0.5 border border-border rounded cursor-pointer bg-app-surface"
        />
      </label>
    </div>
  );
};

export const RichTextEditor: React.FC<RichTextEditorProps> = ({ value, onChange, placeholder }) => {
  const [isMediaOpen, setIsMediaOpen] = useState(false);
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const editor = useEditor({
    extensions: [
      StarterKit.configure(),
      TextStyle,
      Color,
      FontFamily,
      Image.configure({ inline: false, allowBase64: false }),
    ],
    content: value || '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[300px] p-6 text-text-primary bg-white selection:bg-accent/20',
        'data-placeholder': placeholder || 'Start writing…',
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  useEffect(() => {
    if (editor && value !== undefined && value !== editor.getHTML()) {
      editor.commands.setContent(value || '');
    }
  }, [value]);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const res = await api.get('/media');
      setFiles(res.data.data);
    } catch (err) {
      console.error('Failed to fetch media');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isMediaOpen) fetchFiles();
  }, [isMediaOpen]);

  const insertImage = (url: string, alt: string) => {
    const fullUrl = url.startsWith('http') ? url : `http://localhost:3000${url}`;
    editor?.chain().focus().setImage({ src: fullUrl, alt }).run();
    setIsMediaOpen(false);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    const formData = new FormData();
    formData.append('file', e.target.files[0]);

    try {
      const res = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const newFile = res.data.data;
      insertImage(newFile.url, newFile.alt || '');
    } catch (err) {
      console.error('Upload failed');
    }
  };

  return (
    <div className="border border-border rounded-lg shadow-sm overflow-hidden bg-app-surface relative">
      <MenuBar editor={editor} onOpenMedia={() => setIsMediaOpen(true)} />
      <div className="bg-white max-h-[600px] overflow-y-auto custom-scrollbar">
        <EditorContent editor={editor} />
      </div>

      <AnimatePresence>
        {isMediaOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-app-surface border border-border rounded-2xl w-full max-w-3xl h-[70vh] flex flex-col shadow-2xl overflow-hidden"
            >
              <div className="p-4 border-b border-border flex items-center justify-between">
                <h3 className="font-bold">Insert Image</h3>
                <button onClick={() => setIsMediaOpen(false)} className="p-2 hover:bg-app-subtle rounded-full"><X size={18} /></button>
              </div>
              <div className="p-4 flex gap-4 border-b border-border bg-app-subtle">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={14} />
                  <input 
                    type="text" 
                    placeholder="Search library..." 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-app-surface border border-border rounded-lg pl-9 pr-4 py-1.5 text-xs focus:border-accent outline-none"
                  />
                </div>
                <label className="btn btn-primary btn-sm flex items-center gap-2 cursor-pointer whitespace-nowrap">
                  <Plus size={14} /> Upload
                  <input type="file" className="hidden" onChange={handleUpload} />
                </label>
              </div>
              <div className="flex-1 overflow-y-auto p-4 grid grid-cols-4 lg:grid-cols-5 gap-4">
                {loading ? (
                  <div className="col-span-full flex items-center justify-center h-full text-text-muted text-xs">Loading...</div>
                ) : (
                  files.filter(f => (f.alt || f.id || '').toLowerCase().includes(search.toLowerCase())).map((file) => (
                    <div 
                      key={file._id}
                      onClick={() => insertImage(file.url, file.alt || '')}
                      className="aspect-square rounded-lg border border-border overflow-hidden cursor-pointer hover:border-accent transition-all group relative"
                    >
                      <img 
                        src={file.url.startsWith('http') ? file.url : `http://localhost:3000${file.url}`} 
                        className="w-full h-full object-cover" 
                        alt="" 
                      />
                      <div className="absolute inset-0 bg-accent/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Check size={20} className="text-white" />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RichTextEditor;
