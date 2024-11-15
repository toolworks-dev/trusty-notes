import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import CodeBlock from '@tiptap/extension-code-block';
import Highlight from '@tiptap/extension-highlight';
import { Group, ActionIcon, Tooltip, Box } from '@mantine/core';
import {
  IconBold,
  IconItalic,
  IconList,
  IconListNumbers,
  IconQuote,
  IconCode,
  //IconLink,
  //IconPhoto,
  IconH1,
  IconH2,
  IconH3,
  IconClearFormatting,
} from '@tabler/icons-react';
import { useEffect } from 'react';

interface RichTextEditorProps {
  content: string;
  onChange: (value: string) => void;
}

export function RichTextEditor({ content, onChange }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
      }),
      Image,
      CodeBlock,
      Highlight,
    ],
    content,
    onUpdate: ({ editor }: { editor: Editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'rich-text-editor',
      },
    },  
  });
  
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

    if (!editor) {
      return null;
    }

  return (
    <Box style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Group mb="xs" wrap="nowrap">
        <Tooltip label="Bold">
          <ActionIcon
            variant={editor.isActive('bold') ? 'filled' : 'subtle'}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            <IconBold size={16} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label="Italic">
          <ActionIcon
            variant={editor.isActive('italic') ? 'filled' : 'subtle'}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            <IconItalic size={16} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label="Heading 1">
          <ActionIcon
            variant={editor.isActive('heading', { level: 1 }) ? 'filled' : 'subtle'}
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          >
            <IconH1 size={16} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label="Heading 2">
          <ActionIcon
            variant={editor.isActive('heading', { level: 2 }) ? 'filled' : 'subtle'}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          >
            <IconH2 size={16} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label="Heading 3">
          <ActionIcon
            variant={editor.isActive('heading', { level: 3 }) ? 'filled' : 'subtle'}
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          >
            <IconH3 size={16} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label="Bullet List">
          <ActionIcon
            variant={editor.isActive('bulletList') ? 'filled' : 'subtle'}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            <IconList size={16} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label="Numbered List">
          <ActionIcon
            variant={editor.isActive('orderedList') ? 'filled' : 'subtle'}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          >
            <IconListNumbers size={16} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label="Blockquote">
          <ActionIcon
            variant={editor.isActive('blockquote') ? 'filled' : 'subtle'}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
          >
            <IconQuote size={16} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label="Code Block">
          <ActionIcon
            variant={editor.isActive('codeBlock') ? 'filled' : 'subtle'}
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          >
            <IconCode size={16} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label="Clear Formatting">
          <ActionIcon
            variant="subtle"
            onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
          >
            <IconClearFormatting size={16} />
          </ActionIcon>
        </Tooltip>
      </Group>
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
        }}
      >
        <EditorContent 
          editor={editor}
          style={{
            flex: '1 1 auto',
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
          }}
        />
      </Box>
    </Box>
  );
} 