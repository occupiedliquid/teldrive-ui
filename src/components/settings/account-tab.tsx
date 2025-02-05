import { memo, useCallback } from "react";
import type { UserSession } from "@/types";
import { useMutation, useQueryClient, useSuspenseQueries } from "@tanstack/react-query";
import { Button, scrollbarClasses, Select, SelectItem, Textarea } from "@tw-material/react";
import IcRoundCancel from "~icons/ic/round-cancel";
import IcRoundCheckCircle from "~icons/ic/round-check-circle";
import IcRoundContentCopy from "~icons/ic/round-content-copy";
import IcRoundRemoveCircleOutline from "~icons/ic/round-remove-circle-outline";
import clsx from "clsx";

import { Controller, useForm } from "react-hook-form";
import toast from "react-hot-toast";

import { chunkArray, copyDataToClipboard } from "@/utils/common";
import { $api, fetchClient } from "@/utils/api";

import type { components } from "@/lib/api";
import { NetworkError } from "@/utils/fetch-throw";
import SyncIcon from "~icons/material-symbols/sync";

const validateBots = (value?: string) => {
  if (value) {
    const regexPattern = /^\d{10}:[A-Za-z\d_-]{35}$/gm;
    return regexPattern.test(value) || "Invalid Token format";
  }
  return false;
};

const Session = memo(({ appName, location, createdAt, valid, hash, current }: UserSession) => {
  const deleteSession = $api.useMutation("delete", "/users/sessions/{id}", {
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["get", "/users/sessions"] });
    },
  });
  const queryClient = useQueryClient();

  return (
    <div
      className={clsx(
        "flex  flex-col justify-between p-4 rounded-lg gap-1 relative",
        valid ? "bg-green-500/20" : "bg-red-500/20",
      )}
    >
      {(!current || !valid) && (
        <Button
          isIconOnly
          variant="text"
          size="sm"
          className="absolute top-1 right-1"
          onPress={() => deleteSession.mutateAsync({ params: { path: { id: hash } } })}
        >
          <IcRoundCancel />
        </Button>
      )}

      <div className="flex gap-1 items-center">
        {valid ? (
          <IcRoundCheckCircle className="text-green-500 size-4" />
        ) : (
          <IcRoundCancel className="text-red-500 size-4" />
        )}
        <p className="font-medium">{appName || "Unknown"}</p>
      </div>
      <p className="text-sm font-normal">
        Created : {new Date(createdAt).toISOString().split("T")[0]}
      </p>
      {location && <p className="text-sm font-normal">場所 : {location}</p>}
    </div>
  );
});

export const AccountTab = memo(() => {
  const { control, handleSubmit } = useForm<{ tokens: string }>({
    defaultValues: { tokens: "" },
  });

  const [{ data: userConfig }, { data: sessions }, { data: channelData }] = useSuspenseQueries({
    queries: [
      $api.queryOptions("get", "/users/config"),
      $api.queryOptions("get", "/users/sessions"),
      $api.queryOptions("get", "/users/channels"),
    ],
  });

  const removeBots = $api.useMutation("delete", "/users/bots");

  const syncChannels = $api.useMutation("patch", "/users/channels/sync", {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["get", "/users/channels"] });
      toast.success("Channels Synced");
    },
  });

  const queryClient = useQueryClient();

  const copyTokens = useCallback(() => {
    if (userConfig && userConfig.bots.length > 0) {
      copyDataToClipboard(userConfig.bots).then(() => {
        toast.success("Tokens Copied");
      });
    }
  }, [userConfig?.bots]);

  const botAddition = useMutation({
    mutationFn: async (tokens: string) => {
      const tokensList = tokens.trim().split("\n");
      if (tokensList.length === 0) {
        throw new Error("No tokens provided");
      }
      const tokenPromises = chunkArray(tokensList, 8).map((tokens) =>
        fetchClient.POST("/users/bots", {
          body: {
            bots: tokens,
          },
        }),
      );
      return Promise.all(tokenPromises);
    },
    onSuccess: () => {
      toast.success("bots added");
      queryClient.invalidateQueries({ queryKey: ["get", "/users/config"] });
    },
    onError: async (error) => {
      if (error instanceof NetworkError) {
        const errorData = (await error.data?.json()) as components["schemas"]["Error"];
        toast.error(errorData.message.split(":").slice(-1)[0]!.trim());
      }
    },
  });
  const updateChannel = $api.useMutation("patch", "/users/channels");

  const onSubmit = useCallback(
    async ({ tokens }: { tokens: string }) => {
      botAddition.mutateAsync(tokens);
    },
    [botAddition],
  );

  const handleSelectionChange = useCallback(
    (value: any) => {
      const channelId = Number.parseInt([...value][0]);
      const channelName = channelData?.find((c) => c.channelId === channelId)?.channelName;
      updateChannel.mutateAsync({ body: { channelId, channelName } }).then(() => {
        toast.success("Channel updated");
        queryClient.invalidateQueries({ queryKey: ["get", "/users/config"] });
      });
    },
    [channelData],
  );

  return (
    <div className={clsx("grid grid-cols-6 gap-8 p-2 w-full overflow-y-auto", scrollbarClasses)}>
      <div className="col-span-6 xs:col-span-3 flex flex-col justify-around">
        <div>
          <p className="text-lg font-medium">Bot</p>
          <p className="text-sm font-normal text-on-surface-variant">
            Botをアカウントに追加
          </p>
        </div>
        <div className="col-span-6 xs:col-span-3 flex flex-col gap-2">
          <p className="text-lg font-medium">{`現在のBot数: ${userConfig?.bots.length || 0}`}</p>
          <div className="inline-flex gap-4">
            <Button
              title="トークンをクリップボードにコピー"
              variant="text"
              className="text-inherit"
              onPress={copyTokens}
              isIconOnly
            >
              <IcRoundContentCopy />
            </Button>

            <Button
              variant="text"
              title="ボットを削除"
              className="text-inherit"
              onPress={() => removeBots.mutate({})}
              isLoading={removeBots.isPending}
              isIconOnly
            >
              <IcRoundRemoveCircleOutline />
            </Button>
          </div>
        </div>
      </div>
      <div className="col-span-6 xs:col-span-3">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-2">
          <Controller
            name="tokens"
            control={control}
            rules={{ required: true, validate: validateBots }}
            render={({ field, fieldState: { error } }) => (
              <Textarea
                {...field}
                disableAutosize
                classNames={{
                  input: "h-32",
                }}
                placeholder="1行につき1トークンを入力"
                autoComplete="off"
                errorMessage={error ? error.message : ""}
                isInvalid={!!error}
              />
            )}
          />
          <Button isLoading={botAddition.isPending} type="submit" variant="filledTonal">
            ボットを追加
          </Button>
        </form>
      </div>
      <div className="col-span-6 xs:col-span-3">
        <p className="text-lg font-medium">チャンネルを選択</p>
        <p className="text-sm font-normal text-on-surface-variant">
          既定のTelegramチャンネルを設定
        </p>
      </div>
      <div className="col-span-6 xs:col-span-3 flex gap-2">
        <Select
          aria-label="Select Channel"
          size="lg"
          className="col-span-6 xs:col-span-3"
          scrollShadowProps={{
            isEnabled: false,
          }}
          classNames={{
            popoverContent: "rounded-lg shadow-1",
          }}
          variant="bordered"
          items={channelData || []}
          defaultSelectedKeys={[userConfig.channelId ? userConfig.channelId.toString() : ""]}
          onSelectionChange={handleSelectionChange}
        >
          {(channel) => (
            <SelectItem key={channel.channelId} value={channel.channelId}>
              {channel.channelName}
            </SelectItem>
          )}
        </Select>
        <Button
          isIconOnly
          variant="text"
          title="チャンネルを同期"
          className={clsx(syncChannels.isPending && "pointer-events-none")}
          onPress={() => syncChannels.mutate({})}
        >
          <SyncIcon className={clsx(syncChannels.isPending && "animate-spin")} />
        </Button>
      </div>
      <div className="col-span-6">
        <p className="text-lg font-medium">セッション</p>
        <p className="text-sm font-normal text-on-surface-variant">
          有効なセッション一覧
        </p>
        <div className="flex pt-2 flex-wrap gap-2">
          {sessions?.map((session) => (
            <Session key={session.hash} {...session} />
          ))}
        </div>
      </div>
    </div>
  );
});
