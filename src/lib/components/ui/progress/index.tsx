import type { Component, JSX, ValidComponent } from "solid-js";
import { splitProps } from "solid-js";

import type { PolymorphicProps } from "@kobalte/core/polymorphic";
import * as ProgressPrimitive from "@kobalte/core/progress";

import { Label } from "~/lib/components/ui/label";
import { cn } from "~/lib/utils/class-names";

export type ProgressRootProps<T extends ValidComponent = "div"> = ProgressPrimitive.ProgressRootProps<T> & {
  children?: JSX.Element;
  indeterminate?: boolean;
  class?: string;
};

export const Progress = <T extends ValidComponent = "div">(props: PolymorphicProps<T, ProgressRootProps<T>>) => {
  const [local, others] = splitProps(props as ProgressRootProps, [
    "children",
    "indeterminate",
    "value",
    "maxValue",
    "class",
  ]);
  return (
    <ProgressPrimitive.Root
      maxValue={local.maxValue}
      value={local.indeterminate ? (local.maxValue ?? 100) : local.value}
      class={local.class}
      {...others}
    >
      {local.children}
      <ProgressPrimitive.Track class="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
        <ProgressPrimitive.Fill
          class={cn(
            "h-full w-[var(--kb-progress-fill-width)] flex-1 bg-primary transition-all",
            local.indeterminate && "animate-indeterminate",
          )}
        />
      </ProgressPrimitive.Track>
    </ProgressPrimitive.Root>
  );
};

export const ProgressLabel: Component<ProgressPrimitive.ProgressLabelProps> = (props) => {
  return <ProgressPrimitive.Label as={Label} {...props} />;
};

export const ProgressValueLabel: Component<ProgressPrimitive.ProgressValueLabelProps> = (props) => {
  return <ProgressPrimitive.ValueLabel as={Label} {...props} />;
};
