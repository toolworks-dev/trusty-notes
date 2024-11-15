import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeHighlight from 'rehype-highlight';
import { Box, Group, ActionIcon, Tooltip, Textarea, Text } from '@mantine/core';
import { 
  IconEye, 
  IconEdit, 
  IconColumns, 
  IconTypography 
} from '@tabler/icons-react';
import 'highlight.js/styles/github.css';
import { RichTextEditor } from './RichTextEditor';

interface MarkdownEditorProps {
  content: string;
  onChange: (value: string) => void;
  isMobile?: boolean;
  defaultView?: 'edit' | 'preview' | 'split';
  editorType?: 'markdown' | 'richtext';
}

function WordCount({ content }: { content: string }) {
  const words = content.trim() ? content.trim().split(/\s+/).length : 0;
  const characters = content.length;
  const readingTime = Math.ceil(words / 200);

  return (
    <Group gap="xs">
      <Text size="xs" c="dimmed">{words} words</Text>
      <Text size="xs" c="dimmed">·</Text>
      <Text size="xs" c="dimmed">{characters} characters</Text>
      <Text size="xs" c="dimmed">·</Text>
      <Text size="xs" c="dimmed">{readingTime} min read</Text>
    </Group>
  );
}

export function MarkdownEditor({ content, onChange, isMobile, defaultView = 'edit', editorType: initialEditorType = 'markdown' }: MarkdownEditorProps) {
  const [view, setView] = useState<'edit' | 'preview' | 'split'>(isMobile ? 'edit' : defaultView);
  const [editorType, setEditorType] = useState(initialEditorType);

  const renderEditor = () => (
    editorType === 'richtext' ? (
      <RichTextEditor 
        content={content} 
        onChange={onChange} 
      />
    ) : (
      <Textarea
        value={content}
        onChange={(e) => onChange(e.currentTarget.value)}
        styles={{
          root: { height: '100%' },
          wrapper: { height: '100%' },
          input: {
            height: '100%',
            padding: '1rem',
            fontSize: isMobile ? '16px' : undefined,
            borderRadius: 'var(--mantine-radius-md)',
            border: '1px solid var(--mantine-color-gray-3)',
            backgroundColor: 'var(--mantine-color-body)',
            transition: 'border-color 100ms ease',
            '&:focus': {
              borderColor: 'var(--mantine-color-blue-filled)',
              outline: 'none'
            },
            '&:hover': {
              borderColor: 'var(--mantine-color-gray-5)'
            }
          }
        }}
      />
    )
  );

  const renderPreview = () => (
    <Box className="markdown-preview" p="md" style={{ height: '100%', overflow: 'auto' }}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, rehypeHighlight]}
      >
        {content}
      </ReactMarkdown>
    </Box>
  );

  const renderContent = () => {
    if (isMobile) {
      return view === 'edit' ? renderEditor() : renderPreview();
    }

    switch (view) {
      case 'preview':
        return renderPreview();
      case 'split':
        return (
          <Group grow style={{ height: '100%' }}>
            {renderEditor()}
            {renderPreview()}
          </Group>
        );
      default: // 'edit'
        return renderEditor();
    }
  };

  return (
    <Box style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Group justify="space-between" mb="xs">
        <WordCount content={content} />
        <Group>
          {isMobile ? (
            <ActionIcon
              variant={view === 'edit' ? 'filled' : 'subtle'}
              onClick={() => setView(view === 'edit' ? 'preview' : 'edit')}
            >
              {view === 'edit' ? <IconEye size={16} /> : <IconEdit size={16} />}
            </ActionIcon>
          ) : (
            <>
              <Tooltip label="Markdown">
                <ActionIcon
                  variant={editorType === 'markdown' && view === 'edit' ? 'filled' : 'subtle'}
                  onClick={() => {
                    setEditorType('markdown');
                    setView('edit');
                  }}
                >
                  <IconEdit size={16} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="Rich Text">
                <ActionIcon
                  variant={editorType === 'richtext' && view === 'edit' ? 'filled' : 'subtle'}
                  onClick={() => {
                    setEditorType('richtext');
                    setView('edit');
                  }}
                >
                  <IconTypography size={16} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="Preview">
                <ActionIcon
                  variant={view === 'preview' ? 'filled' : 'subtle'}
                  onClick={() => setView('preview')}
                >
                  <IconEye size={16} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="Split View">
                <ActionIcon
                  variant={view === 'split' ? 'filled' : 'subtle'}
                  onClick={() => setView('split')}
                >
                  <IconColumns size={16} />
                </ActionIcon>
              </Tooltip>
            </>
          )}
        </Group>
      </Group>
      {renderContent()}
    </Box>
  );
}