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

export function MarkdownEditor({ 
  content, 
  onChange, 
  isMobile = false,
  defaultView = 'edit', 
  editorType: initialEditorType = 'markdown' 
}: MarkdownEditorProps) {
  const [view, setView] = useState<'edit' | 'preview' | 'split'>(isMobile ? 'edit' : defaultView);
  const [editorType, setEditorType] = useState(initialEditorType);

  const renderEditor = () => (
    editorType === 'richtext' ? (
      <Box style={{ 
        height: '100%', 
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0
      }}>
        <RichTextEditor 
          content={content} 
          onChange={onChange}
          isMobile={!!isMobile}
        />
      </Box>
    ) : (
      <Textarea
        value={content}
        onChange={(e) => onChange(e.currentTarget.value)}
        styles={{
          root: { 
            height: '100%',
            display: 'flex',
            flexDirection: 'column'
          },
          wrapper: { 
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            flex: 1
          },
          input: {
            flex: 1,
            minHeight: isMobile ? '300px' : '400px',
            padding: isMobile ? '1rem' : '1.5rem',
            fontSize: isMobile ? '16px' : '14px',
            lineHeight: isMobile ? '1.6' : '1.5',
            borderRadius: 0,
            border: 'none',
            backgroundColor: 'var(--editor-bg)',
            color: 'var(--text-primary)',
            resize: 'none',
            outline: 'none',
            boxShadow: 'none',
            fontFamily: isMobile 
              ? '-apple-system, BlinkMacSystemFont, sans-serif' 
              : '"SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, monospace'
          }
        }}
        autosize
        minRows={isMobile ? 15 : 20}
      />
    )
  );

  const renderPreview = () => (
    <Box 
      className="markdown-preview" 
      style={{ 
        height: '100%', 
        overflow: 'auto',
        padding: isMobile ? '1rem' : '1.5rem',
        background: 'var(--editor-bg)',
        color: 'var(--text-primary)',
        fontSize: isMobile ? '16px' : '14px',
        lineHeight: isMobile ? '1.6' : '1.5'
      }}
    >
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
      return (
        <Box style={{ 
          height: '100%', 
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          minHeight: 0,
          WebkitOverflowScrolling: 'touch'
        }}>
          {view === 'edit' ? renderEditor() : renderPreview()}
        </Box>
      );
    }

    switch (view) {
      case 'preview':
        return renderPreview();
      case 'split':
        return (
          <Group grow style={{ height: '100%', gap: 0 }}>
            <Box style={{ borderRight: '1px solid var(--editor-border)' }}>
              {renderEditor()}
            </Box>
            {renderPreview()}
          </Group>
        );
      default: // 'edit'
        return renderEditor();
    }
  };

  return (
    <Box 
      className={`markdown-editor-container ${isMobile ? 'mobile-editor' : ''}`}
      style={{ 
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--editor-bg)',
        overflow: 'hidden',
        flex: isMobile ? 1 : undefined,
        minHeight: isMobile ? 0 : undefined
      }}
    >
      {/* Toolbar */}
      <Box 
        className="modern-toolbar"
        style={{
          padding: isMobile ? '0.5rem' : '0.75rem 1rem',
          borderBottom: '1px solid var(--editor-border)',
          background: 'var(--editor-toolbar)',
          flexShrink: 0,
          display: 'flex',
          justifyContent: isMobile ? 'flex-end' : 'space-between',
          alignItems: 'center',
          minHeight: isMobile ? '60px' : 'auto',
          maxHeight: isMobile ? '60px' : 'auto',
          overflow: isMobile ? 'hidden' : 'visible'
        }}
      >
        {!isMobile && <WordCount content={content} />}
        <Group gap="xs">
          {isMobile ? (
            <ActionIcon
              variant={view === 'edit' ? 'filled' : 'subtle'}
              onClick={() => setView(view === 'edit' ? 'preview' : 'edit')}
              size={44}
            >
              {view === 'edit' ? <IconEye size={20} /> : <IconEdit size={20} />}
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
      </Box>
      
      {/* Content Area */}
      <Box 
        style={{ 
          flex: 1,
          overflow: isMobile ? 'hidden' : 'auto',
          position: 'relative',
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {renderContent()}
      </Box>
    </Box>
  );
}