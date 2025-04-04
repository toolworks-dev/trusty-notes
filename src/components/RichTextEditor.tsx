import { useEditor, EditorContent, Editor } from '@tiptap/react';
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
import { Group, ActionIcon, Tooltip, Box } from '@mantine/core';
import {
  IconRowInsertBottom,
  IconColumnInsertRight,
  IconTrash,
  IconRowRemove,
  IconColumnRemove,
  IconBold,
  IconItalic,
  IconList,
  IconListNumbers,
  IconQuote,
  IconCode,
  IconH1,
  IconH2,
} from '@tabler/icons-react';
import { useEffect, useState, CSSProperties } from 'react';

const tableStyles = {
  '.ProseMirror': {
    '& table': {
      borderCollapse: 'collapse',
      margin: '1rem 0',
      width: '100%',
      backgroundColor: 'var(--mantine-color-gray-0)',
      border: '2px solid var(--mantine-color-gray-3)',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    },
    '& td, & th': {
      border: '2px solid var(--mantine-color-gray-3)',
      padding: '0.75rem',
      position: 'relative',
      verticalAlign: 'top',
      textAlign: 'left',
      minWidth: '100px',
      '> *': {
        margin: 0,
      }
    },
    '& th': {
      fontWeight: 'bold',
      backgroundColor: 'var(--mantine-color-gray-1)',
    },
    '& .selectedCell': {
      backgroundColor: 'var(--mantine-color-blue-1)',
    },
    '& .selectedCell:after': {
      zIndex: 2,
      position: 'absolute',
      content: '""',
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      background: 'var(--mantine-color-blue-filled)',
      opacity: 0.12,
      pointerEvents: 'none',
    },
    '[data-mantine-color-scheme="dark"] &': {
      '& table': {
        backgroundColor: 'var(--mantine-color-dark-6)',
        border: '2px solid var(--mantine-color-dark-4)',
      },
      '& td, & th': {
        border: '2px solid var(--mantine-color-dark-4)',
      },
      '& th': {
        backgroundColor: 'var(--mantine-color-dark-5)',
      },
      '& .selectedCell': {
        backgroundColor: 'var(--mantine-color-dark-5)',
      },
      '& .selectedCell:after': {
        background: 'var(--mantine-color-blue-4)',
        opacity: 0.08,
      }
    }
  }
};

interface RichTextEditorProps {
  content: string;
  onChange: (value: string) => void;
  isMobile: boolean;
}

export function RichTextEditor({ content, onChange, isMobile }: RichTextEditorProps) {
  const [lastContent, setLastContent] = useState(content);
  const [lastText, setLastText] = useState('');

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
      Image,
      CodeBlock,
      Highlight,
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: 'rich-text-table',
        },
        handleWidth: 4,
        cellMinWidth: 100,
        lastColumnResizable: true,
        allowTableNodeSelection: true,
      }),
      TableRow,
      TableCell.configure({
        HTMLAttributes: {
          class: 'rich-text-table-cell',
        },
      }),
      TableHeader.configure({
        HTMLAttributes: {
          class: 'rich-text-table-header',
        },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph', 'table'],
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
        class: 'rich-text-editor',
        style: 'height: 100%',
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

  if (!editor) {
    return null;
  }

  const editorInstance: Editor = editor;

  const runCommand = (callback: (chain: ReturnType<typeof editorInstance.chain>) => void) => {
    callback(editorInstance.chain().focus());
  };

  const isTableSelected = () => {
    return editorInstance.isActive('table');
  };  

  const ToolbarWrapper = (
    <Box 
      className={isMobile ? "mobile-toolbar" : "desktop-toolbar"}
      style={{ 
        position: 'sticky',
        top: 0,
        backgroundColor: 'var(--mantine-color-body)',
        zIndex: 10,
        borderBottom: '1px solid var(--mantine-color-gray-3)',
        padding: '4px'
      }}
    >
      <Group gap={4} wrap={isMobile ? "nowrap" : "wrap"}>
        <Group gap={4}>
          <Tooltip label="Bold">
            <ActionIcon
              variant={editor?.isActive('bold') ? 'filled' : 'subtle'}
              onClick={() => runCommand(chain => chain.toggleBold().run())}
              size="sm"
            >
              <IconBold size={16} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Italic">
            <ActionIcon
              variant={editor?.isActive('italic') ? 'filled' : 'subtle'}
              onClick={() => runCommand(chain => chain.toggleItalic().run())}
              size="sm"
            >
              <IconItalic size={16} />
            </ActionIcon>
          </Tooltip>
        </Group>

        <Group gap={4}>
          <Tooltip label="Heading 1">
            <ActionIcon
              variant={editor?.isActive('heading', { level: 1 }) ? 'filled' : 'subtle'}
              onClick={() => runCommand(chain => chain.toggleHeading({ level: 1 }).run())}
              size="sm"
            >
              <IconH1 size={16} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Heading 2">
            <ActionIcon
              variant={editor?.isActive('heading', { level: 2 }) ? 'filled' : 'subtle'}
              onClick={() => runCommand(chain => chain.toggleHeading({ level: 2 }).run())}
              size="sm"
            >
              <IconH2 size={16} />
            </ActionIcon>
          </Tooltip>
        </Group>

        <Group gap={4}>
          <Tooltip label="Bullet List">
            <ActionIcon
              variant={editor?.isActive('bulletList') ? 'filled' : 'subtle'}
              onClick={() => runCommand(chain => chain.toggleBulletList().run())}
              size="sm"
            >
              <IconList size={16} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Numbered List">
            <ActionIcon
              variant={editor?.isActive('orderedList') ? 'filled' : 'subtle'}
              onClick={() => runCommand(chain => chain.toggleOrderedList().run())}
              size="sm"
            >
              <IconListNumbers size={16} />
            </ActionIcon>
          </Tooltip>
        </Group>

        <Group gap={4}>
          <Tooltip label="Quote">
            <ActionIcon
              variant={editor?.isActive('blockquote') ? 'filled' : 'subtle'}
              onClick={() => runCommand(chain => chain.toggleBlockquote().run())}
              size="sm"
            >
              <IconQuote size={16} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Code">
            <ActionIcon
              variant={editor?.isActive('code') ? 'filled' : 'subtle'}
              onClick={() => runCommand(chain => chain.toggleCode().run())}
              size="sm"
            >
              <IconCode size={16} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Group>
    </Box>
  );

  const mobileBorderStyle: CSSProperties = isMobile ? {
    borderLeft: '1px solid var(--mantine-color-gray-3)',
    borderRight: '1px solid var(--mantine-color-gray-3)',
    borderBottom: '1px solid var(--mantine-color-gray-3)',
    borderTop: 'none',
    borderRadius: '8px',
    padding: '1rem',
    overflow: 'hidden',
    flex: 1
  } : { 
    border: '1px solid var(--mantine-color-gray-3)', 
    borderRadius: 'var(--mantine-radius-md)', 
    padding: '1rem',
    overflow: 'hidden',
    flex: 1 
  };

  return (
    <Box style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%',
      overflow: 'hidden'
    }}>
      {ToolbarWrapper}
      {isTableSelected() && (
        <Group mb="xs" wrap="nowrap">
          <Tooltip label="Add Row">
            <ActionIcon
              variant="subtle"
              onClick={() => runCommand(chain => chain.addRowAfter().run())}
            >
              <IconRowInsertBottom size={16} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Add Column">
            <ActionIcon
              variant="subtle"
              onClick={() => runCommand(chain => chain.addColumnAfter().run())}
            >
              <IconColumnInsertRight size={16} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Delete Row">
            <ActionIcon
              variant="subtle"
              color="red"
              onClick={() => runCommand(chain => chain.deleteRow().run())}
            >
              <IconRowRemove size={16} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Delete Column">
            <ActionIcon
              variant="subtle"
              color="red"
              onClick={() => runCommand(chain => chain.deleteColumn().run())}
            >
              <IconColumnRemove size={16} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Delete Table">
            <ActionIcon
              variant="subtle"
              color="red"
              onClick={() => runCommand(chain => chain.deleteTable().run())}
            >
              <IconTrash size={16} />
            </ActionIcon>
          </Tooltip>
        </Group>
      )}
      <Box
        style={{
          flex: '1 1 auto',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          ...tableStyles,
          ...mobileBorderStyle
        }}
      >
        <EditorContent 
          editor={editorInstance}
          style={{
            flex: '1 1 auto',
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            overflow: 'hidden',
          }}
          className={`rich-text-table-container ${isMobile ? 'mobile-editor' : ''}`}
        />
      </Box>
    </Box>
  );
}