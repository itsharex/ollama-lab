import { Component, createResource, Suspense } from "solid-js";
import { TextField, TextFieldTextArea } from "../../ui/text-field";
import { getModelSystemPrompt, setModelSystemPrompt } from "~/lib/commands/system-prompts";
import { LoadingScreen } from "../../custom-ui/loading-screen";

export const SystemPromptSection: Component<{
  model: string;
}> = (props) => {
  const model = () => props.model;

  const [promptInfo, { mutate }] = createResource(model, async (modelValue) => {
    return await getModelSystemPrompt(modelValue);
  });

  return (
    <Suspense fallback={<LoadingScreen text="Loading..." />}>
      <div class="flex flex-col px-2 py-2 gap-2">
        <div class="text-sm text-muted-foreground">
          <p>Tell the model how to behave. System prompts in existing sessions will not be changed.</p>
        </div>

        <TextField value={promptInfo() ?? ""} onChange={(value) => mutate(value)}>
          <TextFieldTextArea
            onBlur={() => {
              const content = promptInfo();
              setModelSystemPrompt(model(), content ?? "").then((result) => mutate(result));
            }}
          />
        </TextField>
      </div>
    </Suspense>
  );
}
