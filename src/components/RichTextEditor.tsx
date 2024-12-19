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
} from '@tabler/icons-react';
import { useEffect, useState } from 'react';

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
}

export function RichTextEditor({ content, onChange }: RichTextEditorProps) {
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

  const isMobile = false; // Replace with actual mobile detection logic

  const ToolbarWrapper = isMobile ? (
    <Box 
      style={{ 
        overflowX: 'auto',
        overflowY: 'hidden',
        WebkitOverflowScrolling: 'touch',
        position: 'sticky',
        top: 0,
        backgroundColor: 'var(--mantine-color-body)',
        zIndex: 10,
        borderBottom: '1px solid var(--mantine-color-gray-3)',
        padding: '4px'
      }}
    >
      <Group gap="xs" wrap="nowrap" style={{ minWidth: 'max-content' }}>
        {/* Toolbar content */}
      </Group>
    </Box>
  ) : (
    <Group gap="xs">
      {/* Toolbar content */}
    </Group>
  );

  return (
    <Box style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
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
          border: '1px solid var(--mantine-color-gray-3)',
          borderRadius: 'var(--mantine-radius-md)',
          padding: '1rem',
          overflow: 'auto',
          minHeight: 0,
          ...tableStyles,
        }}
      >
        <EditorContent 
          editor={editorInstance}
          style={{
            flex: '1 1 auto',
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
          }}
          className="rich-text-table-container"
        />
      </Box>
    </Box>
  );
}