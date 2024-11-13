import { Progress, Text, Paper, Stack } from '@mantine/core';

interface SyncProgressProps {
  progress: {
    total_notes: number;
    processed_notes: number;
    current_operation: string;
    errors: string[];
  };
}

export function SyncProgress({ progress }: SyncProgressProps) {
  const percentage = Math.round(
    (progress.processed_notes / progress.total_notes) * 100
  );

  return (
    <Paper p="md" withBorder>
      <Stack gap="xs">
        <Text size="sm" fw={500}>
          {progress.current_operation}
        </Text>
        <Progress 
          value={percentage}
          size="xl"
          radius="xl"
          striped
          animated
        >
          <Progress.Label>{percentage}%</Progress.Label>
        </Progress>
        <Text size="xs" c="dimmed">
          {progress.processed_notes} of {progress.total_notes} notes processed
        </Text>
        {progress.errors.length > 0 && (
          <Stack gap={4}>
            {progress.errors.map((error, index) => (
              <Text key={index} size="xs" c="red">
                {error}
              </Text>
            ))}
          </Stack>
        )}
      </Stack>
    </Paper>
  );
}