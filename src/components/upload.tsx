import type React from "react";
import { memo, useCallback, useEffect, useMemo, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ColorsLight, FbIcon, useIconData } from "@teldrive_jp/tw-file-browser";
import { Button, Listbox, ListboxItem } from "@tw-material/react";
import IcOutlineCheckCircle from "~icons/ic/outline-check-circle";
import IcRoundClose from "~icons/ic/round-close";
import IcRoundErrorOutline from "~icons/ic/round-error-outline";
import IconParkOutlineCloseOne from "~icons/icon-park-outline/close-one";
import IconParkOutlineDownC from "~icons/icon-park-outline/down-c";
import IconParkOutlineUpC from "~icons/icon-park-outline/up-c";
import LineMdCancel from "~icons/line-md/cancel";
import clsx from "clsx";
import md5 from "md5";
import pLimit from "p-limit";
import toast from "react-hot-toast";
import { useShallow } from "zustand/react/shallow";

import useSettings from "@/hooks/use-settings";
import { scrollbarClasses } from "@/utils/classes";
import { filesize, formatTime, zeroPad } from "@/utils/common";
import { $api, fetchClient } from "@/utils/api";
import { useSession } from "@/utils/query-options";
import { FileUploadStatus, useFileUploadStore } from "@/utils/stores";
import type { components } from "@/lib/api";
import { useSearch } from "@tanstack/react-router";

type UploadParams = Record<string, string | number | boolean | undefined>;

const uploadChunk = <T extends {}>(
  url: string,
  body: Blob,
  params: UploadParams,
  signal: AbortSignal,
  onProgress: (progress: number) => void,
) => {
  return new Promise<T>((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    const uploadUrl = new URL(url);

    for (const key of Object.keys(params)) {
      uploadUrl.searchParams.append(key, String(params[key]));
    }

    signal.addEventListener("abort", () => xhr.abort());

    xhr.open("POST", uploadUrl.href, true);
    xhr.setRequestHeader("Content-Type", "application/octet-stream");

    xhr.responseType = "json";

    xhr.upload.onprogress = (event) =>
      event.lengthComputable && onProgress((event.loaded / event.total) * 100);

    xhr.onload = () => {
      onProgress(100);
      resolve(xhr.response as T);
    };

    xhr.onabort = () => {
      reject(new Error("Upload aborted"));
    };
    xhr.onerror = () => {
      reject(new Error("Upload failed"));
    };
    xhr.send(body);
  });
};

const uploadFile = async (
  file: File,
  path: string,
  chunkSize: number,
  userId: number,
  concurrency: number,
  encyptFile: boolean,
  signal: AbortSignal,
  onProgress: (progress: number) => void,
  onCreate: (payload: any) => Promise<void>,
) => {
  const fileName = file.name;

  const res = (
    await fetchClient.GET("/files", {
      params: {
        query: { path, name: fileName, operation: "find" },
      },
    })
  ).data;

  if (res && res.items.length > 0) {
    throw new Error("File already exists");
  }

  const totalParts = Math.ceil(file.size / chunkSize);

  const limit = pLimit(concurrency);

  const uploadId = md5(
    `${path}/${fileName}${file.size.toString()}${formatTime(file.lastModified)}${userId}`,
  );

  const url = `${window.location.origin}/api/uploads/${uploadId}`;

  const uploadedParts = (
    await fetchClient.GET("/uploads/{id}", {
      params: {
        path: {
          id: uploadId,
        },
      },
    })
  ).data!;

  let channelId = 0;

  if (uploadedParts.length > 0) {
    channelId = uploadedParts[0].channelId;
  }

  const partUploadPromises: Promise<components["schemas"]["UploadPart"]>[] = [];

  const partProgress: number[] = [];

  for (let partIndex = 0; partIndex < totalParts; partIndex++) {
    if (uploadedParts?.findIndex((item) => item.partNo === partIndex + 1) > -1) {
      partProgress[partIndex] = 100;
      continue;
    }

    partUploadPromises.push(
      limit(() =>
        (async () => {
          const start = partIndex * chunkSize;

          const end = Math.min(partIndex * chunkSize + chunkSize, file.size);

          const fileBlob = totalParts > 1 ? file.slice(start, end) : file;

          const partName =
            totalParts > 1 ? `${fileName}.part.${zeroPad(partIndex + 1, 3)}` : fileName;

          const params = {
            partName,
            fileName,
            partNo: partIndex + 1,
            encrypted: encyptFile,
            channelId,
          } as const;

          const asset = await uploadChunk<components["schemas"]["UploadPart"]>(
            url,
            fileBlob,
            params,
            signal,
            (progress) => {
              partProgress[partIndex] = progress;
            },
          );
          return asset;
        })(),
      ),
    );
  }

  const timer = setInterval(() => {
    const totalProgress = partProgress.reduce((sum, progress) => sum + progress, 0);
    onProgress(totalProgress / totalParts);
  }, 1000);

  signal.addEventListener("abort", () => {
    limit.clearQueue();
    clearInterval(timer);
  });

  const parts = await Promise.all(partUploadPromises);

  const uploadParts = uploadedParts
    .concat(parts)
    .sort((a, b) => a.partNo - b.partNo)
    .map((item) => ({ id: item.partId, salt: item.salt }));

  const payload = {
    name: fileName,
    mimeType: file.type ?? "application/octet-stream",
    type: "file",
    parts: uploadParts,
    size: file.size,
    path: path ? path : "/",
    encrypted: encyptFile,
    channelId,
  } as const;

  await onCreate(payload);
  await fetchClient.DELETE("/uploads/{id}", {
    params: {
      path: {
        id: uploadId,
      },
    },
  });
  clearInterval(timer);
};

const UploadFileEntry = memo(({ id }: { id: string }) => {
  const { status, progress, file } = useFileUploadStore((state) => state.fileMap[id]);
  const removeFile = useFileUploadStore((state) => state.actions.removeFile);
  const { name, size } = file;

  const { icon, colorCode } = useIconData({ name, isDir: false, id: "" });

  const progresStats = useMemo(() => {
    if (status === FileUploadStatus.UPLOADING) {
      return `${filesize((progress / 100) * size)} of ${filesize(size)}`;
    }
    if (status === FileUploadStatus.UPLOADED) {
      return `${filesize(size)}`;
    }
    return "";
  }, [progress, size, status]);

  const renderIcon = useCallback(() => {
    if (status === FileUploadStatus.NOT_STARTED || status === FileUploadStatus.UPLOADING) {
      return (
        <Button onPress={() => removeFile(id)} className="text-inherit" variant="text" isIconOnly>
          <IcRoundClose />
        </Button>
      );
    }
    if (status === FileUploadStatus.UPLOADED) {
      return (
        <Button className="text-green-600" variant="text" isIconOnly>
          <IcOutlineCheckCircle />
        </Button>
      );
    }
    if (status === FileUploadStatus.FAILED) {
      return (
        <Button className="text-red-600" variant="text" isIconOnly>
          <IcRoundErrorOutline />
        </Button>
      );
    }
    return (
      <Button className="text-gray-800" variant="text" isIconOnly>
        <LineMdCancel />
      </Button>
    );
  }, [status, id, removeFile]);

  return (
    <div className="flex size-full items-center gap-3">
      <div
        className="size-8 grid rounded-lg shrink-0"
        style={{ backgroundColor: `${ColorsLight[colorCode]}1F` }}
      >
        <FbIcon
          className="size-5 text-center min-w-5 place-self-center text-primary"
          icon={icon}
          style={{
            color: ColorsLight[colorCode],
          }}
        />
      </div>
      <div className="flex flex-col gap-2 truncate flex-1">
        <p title={name} className="truncate text-base font-normal">
          {name}
        </p>
        {progresStats && (
          <>
            <div
              style={{ width: `${progress}%` }}
              className="bg-primary h-0.5 w-0 transition-[width] duration-300 ease-in"
            />
            <p className="text-sm font-normal">{progresStats}</p>
          </>
        )}
      </div>
      {renderIcon()}
    </div>
  );
});

export const Upload = ({ queryKey }: { queryKey: any[] }) => {
  const { fileIds, currentFile, collapse, fileDialogOpen, actions } = useFileUploadStore(
    useShallow((state) => ({
      fileIds: state.filesIds,
      fileMap: state.fileMap,
      currentFile: state.fileMap[state.currentFileId],
      collapse: state.collapse,
      actions: state.actions,
      fileDialogOpen: state.fileDialogOpen,
    })),
  );

  const { settings } = useSettings();

  const [session] = useSession();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const openFileSelector = useCallback(() => {
    fileInputRef?.current?.click();
    window.addEventListener("focus", () => actions.setFileDialogOpen(false), {
      once: true,
    });
  }, []);

  useEffect(() => {
    if (fileDialogOpen) {
      openFileSelector();
    }
  }, [fileDialogOpen]);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
      ? Array.from(event.target.files).filter((f) => f.size > 0)
      : [];
    if (files.length > 0) {
      actions.addFiles(files);
    }
  }, []);

  const queryClient = useQueryClient();

  const creatFile = $api.useMutation("post", "/files", {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });
  const { path } = useSearch({ from: "/_authed/$view" });

  useEffect(() => {
    if (currentFile?.id && currentFile?.status === FileUploadStatus.NOT_STARTED) {
      actions.setFileUploadStatus(currentFile.id, FileUploadStatus.UPLOADING);
      uploadFile(
        currentFile.file,
        path || "/",
        Number(settings.splitFileSize),
        session?.userId as number,
        Number(settings.uploadConcurrency),
        Boolean(settings.encryptFiles),
        currentFile.controller.signal,
        (progress) => actions.setProgress(currentFile.id, progress),
        async (payload) => {
          await creatFile.mutateAsync({
            body: payload,
          });
          if (creatFile.isSuccess) {
            actions.setFileUploadStatus(currentFile.id, FileUploadStatus.UPLOADED);
          }
        },
      )
        .then(() => {
          actions.setFileUploadStatus(currentFile.id, FileUploadStatus.UPLOADED);
          actions.startNextUpload();
        })
        .catch((err) => {
          toast.error(err.message);
        });
    }
  }, [currentFile?.id]);

  return (
    <div className="fixed right-10 bottom-10">
      <input
        className="opacity-0"
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileChange}
      />
      {fileIds.length > 0 && (
        <div className="max-w-xs">
          <div
            className={clsx(
              "shadow-md w-full flex items-center gap-2",
              "px-4 py-2 text-sm font-medium bg-surface-container min-h-12",
              collapse ? "rounded-lg" : "rounded-t-lg",
            )}
          >
            <span>Upload</span>
            <span className="text-label-medium">
              {fileIds.length} {fileIds.length > 1 ? "files" : "file"}
            </span>
            <div className="inline-flex gap-2 ml-auto">
              <Button
                variant="text"
                className="text-inherit"
                isIconOnly
                onPress={actions.toggleCollapse}
              >
                {collapse ? <IconParkOutlineUpC /> : <IconParkOutlineDownC />}
              </Button>
              <Button
                variant="text"
                className="text-inherit"
                isIconOnly
                onPress={actions.cancelUpload}
              >
                <IconParkOutlineCloseOne />
              </Button>
            </div>
          </div>
          <Listbox
            aria-label="Upload Files"
            isVirtualized={fileIds.length > 100}
            className={clsx(
              "max-w-xs rounded-none rounded-b-lg dark:bg-surface-container-lowest bg-surface shadow-md",
              "transition-[max-height] duration-300 ease-in-out select-none",
              scrollbarClasses,
              collapse ? "max-h-0 overflow-hidden" : "max-h-80 overflow-y-auto",
            )}
          >
            {fileIds.map((id, _) => (
              <ListboxItem
                className="data-[hover=true]:bg-transparent px-0"
                key={id}
                textValue={id}
              >
                <UploadFileEntry id={id} />
              </ListboxItem>
            ))}
          </Listbox>
        </div>
      )}
    </div>
  );
};
