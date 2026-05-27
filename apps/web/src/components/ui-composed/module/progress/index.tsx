import * as React from "react";
import { Progress } from "@base-ui/react/progress";
import { cn } from "@/utils/lib/utils";
import styles from "./index.module.css";

// ====================
// Props
// ====================
type ProgressRootProps = React.ComponentProps<typeof Progress.Root>;
type ProgressLabelProps = React.ComponentProps<typeof Progress.Label>;
type ProgressValueProps = React.ComponentProps<typeof Progress.Value>;
type ProgressTrackProps = React.ComponentProps<typeof Progress.Track>;
type ProgressIndicatorProps = React.ComponentProps<typeof Progress.Indicator>;

// ====================
// Progress Root
// ====================
function ProgressRoot({ className, ...props }: ProgressRootProps) {
  return (
    <Progress.Root
      {...props}
      className={cn(styles.Progress, className)}
    />
  );
}

// ====================
// Label
// ====================
function ProgressLabel({ className, ...props }: ProgressLabelProps) {
  return (
    <Progress.Label
      {...props}
      className={cn(styles.Label, className)}
    />
  );
}

// ====================
// Value
// ====================
function ProgressValue({ className, ...props }: ProgressValueProps) {
  return (
    <Progress.Value
      {...props}
      className={cn(styles.Value, className)}
    />
  );
}

// ====================
// Track
// ====================
function ProgressTrack({ className, ...props }: ProgressTrackProps) {
  return (
    <Progress.Track
      {...props}
      className={cn(styles.Track, className)}
    />
  );
}

// ====================
// Indicator
// ====================
function ProgressIndicator({ className, ...props }: ProgressIndicatorProps) {
  return (
    <Progress.Indicator
      {...props}
      className={cn(styles.Indicator, className)}
    />
  );
}

// ====================
// Example
// ====================
function ExampleProgress() {
  const [value, setValue] = React.useState(20);

  // Simulate changes
  React.useEffect(() => {
    const interval = setInterval(() => {
      setValue((current) =>
        Math.min(100, Math.round(current + Math.random() * 25))
      );
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <ProgressRoot value={value}>
      <ProgressLabel>Export</ProgressLabel>
      <ProgressValue />
      <ProgressTrack>
        <ProgressIndicator />
      </ProgressTrack>
    </ProgressRoot>
  );
}

// ====================
// Export
// ====================
export {
  ProgressRoot,
  ProgressLabel,
  ProgressValue,
  ProgressTrack,
  ProgressIndicator,
  ExampleProgress,
};
