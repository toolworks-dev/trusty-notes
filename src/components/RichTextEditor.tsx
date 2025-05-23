import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import CodeBlock from '@tiptap/extension-code-block';
import Highlight from '@tiptap/extension-highlight';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TextAlign from '@tiptap/extension-text-align';
import { Group, ActionIcon, Tooltip, Box, Switch, Divider } from '@mantine/core';
import {
  IconRowInsertBottom,
  IconColumnInsertRight,
  IconTrash,
  IconBold,
  IconItalic,
  IconList,
  IconListNumbers,
  IconQuote,
  IconCode,
  IconH1,
  IconH2,
  IconKeyboard,
  IconTable,
  IconAlignLeft,
  IconAlignCenter,
  IconAlignRight,
} from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { VimExtension, toggleVimMode, loadVimModeState } from '../utils/VimExtension';
import { KeySwapExtension } from '../utils/KeySwapExtension';
import '../styles/editor-overrides.css';

interface RichTextEditorProps {
  content: string;
  onChange: (value: string) => void;
  isMobile: boolean;
}

export function RichTextEditor({ content, onChange, isMobile }: RichTextEditorProps) {
  const [lastContent, setLastContent] = useState(content);
  const [lastText, setLastText] = useState('');
  const [vimModeEnabled, setVimModeEnabled] = useState(() => loadVimModeState());
  
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
      Image,
      CodeBlock.configure({
        HTMLAttributes: {
          class: 'modern-code-block',
        },
      }),
      Highlight.configure({
        HTMLAttributes: {
          class: 'modern-highlight',
        },
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: 'modern-table',
        },
        handleWidth: 4,
        cellMinWidth: 100,
        lastColumnResizable: true,
        allowTableNodeSelection: true,
      }),
      TableRow,
      TableCell.configure({
        HTMLAttributes: {
          class: 'modern-table-cell',
        },
      }),
      TableHeader.configure({
        HTMLAttributes: {
          class: 'modern-table-header',
        },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph', 'table'],
      }),
      KeySwapExtension,
      VimExtension.configure({
        enabled: vimModeEnabled,
        onSave: () => {
          if (content && onChange) {
            onChange(content);
          }
        },
        onQuit: () => {
          setVimModeEnabled(false);
        },
        getFilename: () => {
          return 'note.md';
        }
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      const newContent = editor.getHTML();
      const newText = editor.getText();

      if (newText !== lastText || newContent !== lastContent) {
        setLastText(newText);
        setLastContent(newContent);
        onChange(newContent);
      }
    },
    editorProps: {
      attributes: {
        class: 'modern-prose-editor',
      },
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content, false);
      setLastContent(content);
      setLastText(editor.getText());
    }
  }, [content, editor]);

  useEffect(() => {
    if (editor) {
      editor.extensionStorage.vim = {
        ...editor.extensionStorage.vim,
        enabled: vimModeEnabled
      };
    }
  }, [vimModeEnabled, editor]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key === ';') {
        event.preventDefault();
        handleVimModeToggle();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  if (!editor) {
    return null;
  }

  const isTableSelected = () => {
    return editor.isActive('table');
  };  

  const handleVimModeToggle = () => {
    const isEnabled = toggleVimMode();
    setVimModeEnabled(isEnabled);
    
    if (window.vimMode && window.vimMode.statusElement) {
      const statusMessage = isEnabled ? 'Vim mode enabled' : 'Vim mode disabled';
      window.vimMode.statusElement.textContent = statusMessage;
      window.vimMode.statusElement.style.display = 'block';
      
      setTimeout(() => {
        if (window.vimMode && window.vimMode.statusElement) {
          if (isEnabled) {
            window.vimMode.statusElement.textContent = window.vimMode.mode.toUpperCase();
          } else {
            window.vimMode.statusElement.style.display = 'none';
          }
        }
      }, 1500);
    }
  };

  const ToolbarButton = ({ 
    icon, 
    label, 
    isActive = false, 
    onClick, 
    disabled = false 
  }: {
    icon: React.ReactNode;
    label: string;
    isActive?: boolean;
    onClick: () => void;
    disabled?: boolean;
  }) => (
    <Tooltip label={label} position={isMobile ? 'top' : 'bottom'}>
      <ActionIcon
        variant={isActive ? 'filled' : 'subtle'}
        color={isActive ? 'blue' : 'gray'}
        onClick={onClick}
        onMouseDown={(e) => e.preventDefault()}
        disabled={disabled}
        size={isMobile ? 'sm' : 'md'}
        className="modern-toolbar-button"
        style={{
          minWidth: isMobile ? (window.innerWidth <= 375 ? '30px' : '34px') : '40px',
          minHeight: isMobile ? (window.innerWidth <= 375 ? '30px' : '34px') : '40px',
          maxWidth: isMobile ? (window.innerWidth <= 375 ? '30px' : '34px') : undefined,
          maxHeight: isMobile ? (window.innerWidth <= 375 ? '30px' : '34px') : undefined,
          borderRadius: isMobile ? (window.innerWidth <= 375 ? '5px' : '6px') : 'var(--radius-lg)',
          margin: isMobile ? (window.innerWidth <= 375 ? '0 0.03rem' : '0 0.05rem') : '0',
          fontSize: isMobile ? (window.innerWidth <= 375 ? '10px' : '11px') : '14px',
          touchAction: 'manipulation',
          flexShrink: isMobile ? 0 : undefined
        }}
      >
        {icon}
      </ActionIcon>
    </Tooltip>
  );

  const ToolbarGroup = ({ children }: { children: React.ReactNode }) => (
    <Group gap={isMobile ? (window.innerWidth <= 375 ? 1 : 2) : 6} wrap="nowrap">
      {children}
    </Group>
  );

  const ToolbarDivider = () => (
    <Divider 
      orientation="vertical" 
      style={{
        height: isMobile ? (window.innerWidth <= 375 ? '24px' : '28px') : '24px',
        margin: isMobile ? '0 0.2rem' : '0 0.25rem'
      }}
    />
  );

  return (
    <Box 
      className={`modern-rich-text-editor ${isMobile ? 'mobile-editor' : 'desktop-editor'}`}
      style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        height: '100%',
        background: 'var(--editor-bg)',
        borderRadius: isMobile ? 0 : 'var(--radius-xl)',
        overflow: 'hidden',
        position: 'relative',
        flex: 1,
        minHeight: 0
      }}
    >
      {/* Modern Toolbar */}
      <Box 
        className="modern-toolbar"
        style={{ 
          background: 'var(--editor-toolbar)',
          borderBottom: '1px solid var(--editor-border)',
          padding: isMobile ? (window.innerWidth <= 375 ? '0.2rem 0.4rem' : '0.25rem 0.5rem') : '0.75rem 1rem',
          overflowX: isMobile ? 'auto' : 'visible',
          overflowY: 'hidden',
          scrollbarWidth: 'none',
          flexShrink: 0,
          height: isMobile ? (window.innerWidth <= 375 ? '48px' : '52px') : '60px',
          minHeight: isMobile ? (window.innerWidth <= 375 ? '48px' : '52px') : '60px',
          maxHeight: isMobile ? (window.innerWidth <= 375 ? '48px' : '52px') : '60px',
          display: 'flex',
          alignItems: 'center'
        }}
      >
        <Group 
          gap={isMobile ? "xs" : "md"} 
          wrap="nowrap" 
          style={{ 
            minWidth: isMobile ? 'max-content' : 'auto',
            width: '100%'
          }}
        >
          {/* Text Formatting */}
          <ToolbarGroup>
            <ToolbarButton
              icon={<IconBold size={isMobile ? 14 : 16} />}
              label="Bold"
              isActive={editor?.isActive('bold') ?? false}
              onClick={() => editor?.chain().focus().toggleBold().run()}
            />
            <ToolbarButton
              icon={<IconItalic size={isMobile ? 14 : 16} />}
              label="Italic"
              isActive={editor?.isActive('italic') ?? false}
              onClick={() => editor?.chain().focus().toggleItalic().run()}
            />
          </ToolbarGroup>

          {!isMobile && <ToolbarDivider />}

          {/* Headings */}
          <ToolbarGroup>
            <ToolbarButton
              icon={<IconH1 size={isMobile ? 14 : 16} />}
              label="Heading 1"
              isActive={editor?.isActive('heading', { level: 1 }) ?? false}
              onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
            />
            <ToolbarButton
              icon={<IconH2 size={isMobile ? 14 : 16} />}
              label="Heading 2"
              isActive={editor?.isActive('heading', { level: 2 }) ?? false}
              onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
            />
          </ToolbarGroup>

          {!isMobile && <ToolbarDivider />}

          {/* Lists */}
          <ToolbarGroup>
            <ToolbarButton
              icon={<IconList size={isMobile ? 14 : 16} />}
              label="Bullet List"
              isActive={editor?.isActive('bulletList') ?? false}
              onClick={() => editor?.chain().focus().toggleBulletList().run()}
            />
            <ToolbarButton
              icon={<IconListNumbers size={isMobile ? 14 : 16} />}
              label="Numbered List"
              isActive={editor?.isActive('orderedList') ?? false}
              onClick={() => editor?.chain().focus().toggleOrderedList().run()}
            />
          </ToolbarGroup>

          {!isMobile && <ToolbarDivider />}

          {/* Block Elements - Only quote on mobile */}
          <ToolbarGroup>
            <ToolbarButton
              icon={<IconQuote size={isMobile ? 14 : 16} />}
              label="Quote"
              isActive={editor?.isActive('blockquote') ?? false}
              onClick={() => editor?.chain().focus().toggleBlockquote().run()}
            />
            {!isMobile && (
              <ToolbarButton
                icon={<IconCode size={16} />}
                label="Code Block"
                isActive={editor?.isActive('codeBlock') ?? false}
                onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
              />
            )}
          </ToolbarGroup>

          {/* Table - Desktop only */}
          {!isMobile && (
            <>
              <ToolbarDivider />
              <ToolbarGroup>
                <ToolbarButton
                  icon={<IconTable size={16} />}
                  label="Insert Table"
                  onClick={() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
                />
              </ToolbarGroup>
            </>
          )}

          {/* Table Controls - Only show when table is selected */}
          {isTableSelected() && (
            <>
              {!isMobile && <ToolbarDivider />}
              <ToolbarGroup>
                <ToolbarButton
                  icon={<IconRowInsertBottom size={isMobile ? 14 : 16} />}
                  label="Add Row"
                  onClick={() => editor?.chain().focus().addRowAfter().run()}
                />
                <ToolbarButton
                  icon={<IconColumnInsertRight size={isMobile ? 14 : 16} />}
                  label="Add Column"
                  onClick={() => editor?.chain().focus().addColumnAfter().run()}
                />
                <ToolbarButton
                  icon={<IconTrash size={isMobile ? 14 : 16} />}
                  label="Delete Table"
                  onClick={() => editor?.chain().focus().deleteTable().run()}
                />
              </ToolbarGroup>
            </>
          )}

          {/* Text Alignment - Desktop only */}
          {!isMobile && (
            <>
              <ToolbarDivider />
              <ToolbarGroup>
                <ToolbarButton
                  icon={<IconAlignLeft size={16} />}
                  label="Align Left"
                  isActive={editor?.isActive({ textAlign: 'left' }) ?? false}
                  onClick={() => editor?.chain().focus().setTextAlign('left').run()}
                />
                <ToolbarButton
                  icon={<IconAlignCenter size={16} />}
                  label="Align Center"
                  isActive={editor?.isActive({ textAlign: 'center' }) ?? false}
                  onClick={() => editor?.chain().focus().setTextAlign('center').run()}
                />
                <ToolbarButton
                  icon={<IconAlignRight size={16} />}
                  label="Align Right"
                  isActive={editor?.isActive({ textAlign: 'right' }) ?? false}
                  onClick={() => editor?.chain().focus().setTextAlign('right').run()}
                />
              </ToolbarGroup>
            </>
          )}

          {/* Vim Mode Toggle - Desktop only */}
          {!isMobile && (
            <>
              <ToolbarDivider />
              <Tooltip label="Vim Mode (Ctrl+;)" position="bottom">
                <Switch
                  label="Vim"
                  checked={vimModeEnabled}
                  onChange={handleVimModeToggle}
                  size="sm"
                  color="blue"
                  thumbIcon={vimModeEnabled ? <IconKeyboard size={12} /> : null}
                  styles={{
                    root: { alignItems: 'center' },
                    label: { fontSize: '0.875rem', fontWeight: 500 }
                  }}
                />
              </Tooltip>
            </>
          )}
        </Group>
      </Box>

      {/* Editor Content */}
      <Box
        style={{
          flex: 1,
          overflow: 'hidden',
          position: 'relative',
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column'
        }}
        className={`modern-editor-content ${isMobile ? 'mobile-editor' : 'desktop-editor'}`}
      >
        <EditorContent 
          editor={editor}
          style={{ 
            height: '100%',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            minHeight: 0
          }}
          className={`modern-editor-prose ${isMobile ? 'mobile-editor' : 'desktop-editor'}`}
        />
      </Box>
    </Box>
  );
}