import { Component, createMemo, createResource, createSignal, lazy, onMount, Show, Suspense } from "solid-js";
import { Badge } from "../ui/badge";
import { getModel } from "~/lib/commands/models";
import SetDefault from "./toolbar-items/set-default";
import { DuplicateModel } from "./toolbar-items/duplicate-model";
import DeleteModel from "./toolbar-items/delete-model";
import { StatusLine } from "./status-line";
import { LoaderSpin } from "../loader-spin";
import { Progress } from "../ui/progress";
import ProgressSize from "../custom-ui/progress-size";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Details } from "./sections/details";
import { SystemPromptSection } from "./sections/system-prompt";
import { currentModelPageModel } from "~/lib/contexts/globals/model-page";
import { getTaskMap } from "~/lib/contexts/globals/pull-model-tasks";
import { defaultModel, reloadActiveModels } from "~/lib/contexts/globals/model-states";
import { ProgressEvent } from "~/lib/schemas/events/progress";
import { ModelInfo } from "./sections/model-info";
import { PlaceholderPage } from "./placeholder-title";

interface FetchingProps {
  modelName: string | null;
  downloadInfo?: ProgressEvent;
}

async function fetcher({ modelName, downloadInfo }: FetchingProps) {
  if (!modelName || (downloadInfo && downloadInfo.type !== "success")) {
    return null;
  }

  return await getModel(modelName);
}

const [tabValue, setTabValue] = createSignal<string>("details");

export const ModelDetails: Component = () => {
  const model = () => currentModelPageModel();

  const downloadInfo = createMemo(() => {
    const taskMap = getTaskMap();
    const m = model?.();

    if (taskMap && m) {
      return taskMap[m];
    }

    return undefined;
  });

  const [modelInfo] = createResource(() => ({ modelName: model(), downloadInfo: downloadInfo() }), fetcher);

  onMount(() => {
    reloadActiveModels();
  });

  const DownloadContent: Component = () => {
    const progress = createMemo(() => {
      const obj = downloadInfo();
      if (obj?.type === "inProgress") {
        return {
          total: obj.total,
          completed: obj.completed,
        };
      }

      return undefined;
    });

    return (
      <Show when={progress()}>
        {(infoObj) => (
          <div class="flex text-sm gap-2 md:gap-3.5 items-center">
            <Progress
              minValue={0}
              maxValue={infoObj().total ?? undefined}
              value={infoObj().completed}
              class="w-48 md:w-56 lg:w-72 xl:w-96"
            />
            <ProgressSize completed={infoObj().completed ?? undefined} total={infoObj().total ?? undefined} />
          </div>
        )}
      </Show>
    );
  }

  const CodeBlock = lazy(() => import("~/lib/components/custom-ui/code-block"));

  return (
    <Show when={model?.()} fallback={<PlaceholderPage />}>
      {(m) => (
        <div class="flex flex-col h-full px-4 py-6 gap-4 overflow-y-auto">
          <div class="border border-border px-4 py-3 rounded flex flex-col gap-3">
            <div class="flex items-center gap-2">
              <h3 class="font-bold text-xl">{m()}</h3>
              <Show when={defaultModel() === m()}>
                <Badge variant="outline">Default</Badge>
              </Show>
              <div class="grow" />
              <div class="flex gap-2 items-center">
                <Show when={!downloadInfo()}>
                  <Show when={defaultModel?.() !== m()}>
                    <SetDefault model={m} />
                  </Show>
                  <DuplicateModel model={m} />
                  <DeleteModel model={m} />
                </Show>
              </div>
            </div>
            <StatusLine downloadInfo={downloadInfo} model={m} />
          </div>

          <div>
            <Show when={modelInfo.loading}>
              <LoaderSpin text="Loading..." />
            </Show>

            <DownloadContent />

            <Suspense>
              <Tabs value={tabValue()} onChange={setTabValue}>
                <Show when={modelInfo()}>
                  {(info) => (
                    <TabsList class="sticky -top-6 z-20">
                      <Show when={info().details}>
                        <TabsTrigger value="details">Details</TabsTrigger>
                      </Show>
                      <TabsTrigger value="modelfile">Modelfile</TabsTrigger>
                      <Show when={info().model_info}>
                        <TabsTrigger value="info">Model Info</TabsTrigger>
                      </Show>
                      <Show when={info().parameters}>
                        <TabsTrigger value="parameters">Parameters</TabsTrigger>
                      </Show>
                      <TabsTrigger value="template">Template</TabsTrigger>
                      <TabsTrigger value="system-prompt">System Prompt</TabsTrigger>
                    </TabsList>
                  )}
                </Show>

                <div>
                  <Show when={modelInfo()}>
                    {(info) => (
                      <>
                        <Show when={info().modelfile}>
                          {(content) => (
                            <TabsContent value="modelfile">
                              <CodeBlock code={content()} lang="modelfile" />
                            </TabsContent>
                          )}
                        </Show>
                        <Show when={info().details}>
                          {(d) => (
                            <TabsContent value="details">
                              <Details value={d()} />
                            </TabsContent>
                          )}
                        </Show>
                        <Show when={info().model_info}>
                          {(mi) => (
                            <TabsContent value="info">
                              <ModelInfo value={mi()} />
                            </TabsContent>
                          )}
                        </Show>
                        <Show when={info().parameters}>
                          {(p) => (
                            <TabsContent value="parameters">
                              <CodeBlock code={p()} />
                            </TabsContent>
                          )}
                        </Show>
                        <Show when={info().template}>
                          {(t) => (
                            <TabsContent value="template">
                              <CodeBlock code={t()} lang="ollama/template" />
                            </TabsContent>
                          )}
                        </Show>
                        <TabsContent value="system-prompt">
                          <SystemPromptSection model={m()} />
                        </TabsContent>
                      </>
                    )}
                  </Show>
                </div>
              </Tabs>
            </Suspense>
          </div>
        </div>
      )}
    </Show>
  );
}
