import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeHighlight from 'rehype-highlight';
import { Box, Group, ActionIcon, Tooltip, Textarea, Text } from '@mantine/core';
import { IconEye, IconEdit, IconColumns } from '@tabler/icons-react';
import 'highlight.js/styles/github.css';

interface MarkdownEditorProps {
  content: string;
  onChange: (value: string) => void;
  isMobile?: boolean;
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

export function MarkdownEditor({ content, onChange, isMobile }: MarkdownEditorProps) {
  const [view, setView] = useState<'edit' | 'preview' | 'split'>(isMobile ? 'edit' : 'split');

  const renderContent = () => {
    if (isMobile) {
      return view === 'edit' ? (
        <Textarea
          value={content}
          onChange={(e) => onChange(e.currentTarget.value)}
          styles={{
            root: { height: '100%' },
            wrapper: { height: '100%' },
            input: {
              height: '100%',
              padding: '1rem',
              fontSize: '16px', // Prevents zoom on iOS
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
      ) : (
        <Box className="markdown-preview" p="md" style={{ height: '100%', overflow: 'auto' }}>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeRaw, rehypeHighlight]}
          >
            {content}
          </ReactMarkdown>
        </Box>
      );
    }

    // Desktop layout
    switch (view) {
      case 'edit':
        return (
          <Textarea
            value={content}
            onChange={(e) => onChange(e.currentTarget.value)}
            styles={{
              root: { height: '100%' },
              wrapper: { height: '100%' },
              input: {
                height: '100%',
                padding: '1rem',
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
        );
      case 'preview':
        return (
          <Box className="markdown-preview" p="md" style={{ height: '100%', overflow: 'auto' }}>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeRaw, rehypeHighlight]}
            >
              {content}
            </ReactMarkdown>
          </Box>
        );
      case 'split':
        return (
          <Group grow style={{ height: '100%' }}>
            <Textarea
              value={content}
              onChange={(e) => onChange(e.currentTarget.value)}
              styles={{
                root: { height: '100%' },
                wrapper: { height: '100%' },
                input: {
                  height: '100%',
                  padding: '1rem',
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
            <Box className="markdown-preview" p="md" style={{ height: '100%', overflow: 'auto' }}>
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw, rehypeHighlight]}
              >
                {content}
              </ReactMarkdown>
            </Box>
          </Group>
        );
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
              <Tooltip label="Edit">
                <ActionIcon
                  variant={view === 'edit' ? 'filled' : 'subtle'}
                  onClick={() => setView('edit')}
                >
                  <IconEdit size={16} />
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