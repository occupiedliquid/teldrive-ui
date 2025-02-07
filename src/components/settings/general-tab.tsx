import { memo, useCallback } from "react";
import { Button, Input, Select, SelectItem, Switch } from "@tw-material/react";
import clsx from "clsx";
import { Controller, useForm } from "react-hook-form";

import useSettings from "@/hooks/use-settings";
import { scrollbarClasses } from "@/utils/classes";
import { splitFileSizes } from "@/utils/common";

function validateUrl(value: string) {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}
export const GeneralTab = memo(() => {
  const { settings, setSettings } = useSettings();

  const { control, handleSubmit } = useForm({
    defaultValues: settings,
  });

  const onSubmit = useCallback((data: typeof settings) => setSettings(data), []);

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className={clsx("grid grid-cols-6 gap-8 p-2 pr-4 w-full overflow-y-auto", scrollbarClasses)}
    >
      <div className="col-span-6 xs:col-span-3">
        <p className="text-lg font-medium">並列アップロード</p>
        <p className="text-sm font-normal text-on-surface-variant">アップロード時のパート分割数</p>
      </div>
      <Controller
        name="uploadConcurrency"
        control={control}
        render={({ field, fieldState: { error } }) => (
          <Input
            size="lg"
            className="col-span-6 xs:col-span-3"
            variant="bordered"
            isInvalid={!!error}
            errorMessage={error?.message}
            type="number"
            {...field}
          />
        )}
      />
      <div className="col-span-6 xs:col-span-3">
        <p className="text-lg font-medium">リサイズホスト</p>
        <p className="text-sm font-normal text-on-surface-variant">
          サムネイルを表示するためのサーバー
        </p>
      </div>
      <Controller
        name="resizerHost"
        control={control}
        rules={{
          validate: (value) => (value ? validateUrl(value) || "Must be a valid Host" : true),
        }}
        render={({ field, fieldState: { error } }) => (
          <Input
            size="lg"
            className="col-span-6 xs:col-span-3"
            variant="bordered"
            placeholder="https://resizer.example.com"
            isInvalid={!!error}
            errorMessage={error?.message}
            {...field}
          />
        )}
      />
      <div className="col-span-6 xs:col-span-3">
        <p className="text-lg font-medium">ページサイズ</p>
        <p className="text-sm font-normal text-on-surface-variant">ページあたりのファイル量</p>
      </div>
      <Controller
        name="pageSize"
        control={control}
        render={({ field, fieldState: { error } }) => (
          <Input
            size="lg"
            className="col-span-6 xs:col-span-3"
            variant="bordered"
            isInvalid={!!error}
            errorMessage={error?.message}
            {...field}
            type="number"
          />
        )}
      />

      <div className="col-span-6 xs:col-span-3">
        <p className="text-lg font-medium">ファイル分割</p>
        <p className="text-sm font-normal text-on-surface-variant">
          並列アップロード時の1パートの分割サイズ
        </p>
      </div>
      <Controller
        name="splitFileSize"
        control={control}
        render={({ field, fieldState: { error } }) => (
          <Select
            aria-label="Split File Size"
            size="lg"
            className="col-span-6 xs:col-span-3"
            variant="bordered"
            isInvalid={!!error}
            defaultSelectedKeys={[field.value]}
            scrollShadowProps={{
              isEnabled: false,
            }}
            classNames={{
              popoverContent: "rounded-lg shadow-1",
            }}
            items={splitFileSizes}
            errorMessage={error?.message}
            {...field}
          >
            {(size) => (
              <SelectItem key={size.value} value={size.value}>
                {size.label}
              </SelectItem>
            )}
          </Select>
        )}
      />
      <div className="col-span-6 xs:col-span-3">
        <p className="text-lg font-medium">ファイルを暗号化</p>
        <p className="text-sm font-normal text-on-surface-variant">
          ファイルを暗号化した後アップロード
        </p>
      </div>
      <div className="col-span-6 xs:col-span-3">
        <Controller
          name="encryptFiles"
          control={control}
          render={({ field }) => (
            <Switch
              size="lg"
              onChange={field.onChange}
              isSelected={field.value}
              name={field.name}
              onBlur={field.onBlur}
            />
          )}
        />
      </div>

      <div className="col-span-6 xs:col-span-3">
        <p className="text-lg font-medium">Rclone</p>
        <p className="text-sm font-normal text-on-surface-variant">
         Rcloneのwebdavから直接ファイルを取得
        </p>
      </div>
      <Controller
        name="rcloneProxy"
        control={control}
        rules={{
          validate: (value) => (value ? validateUrl(value) || "Must be a valid Host" : true),
        }}
        render={({ field, fieldState: { error } }) => (
          <Input
            size="lg"
            className="col-span-6 xs:col-span-3"
            variant="bordered"
            placeholder="http://localhost:8080"
            isInvalid={!!error}
            errorMessage={error?.message}
            {...field}
          />
        )}
      />
      <div className="col-span-6 flex justify-end">
        <Button type="submit" variant="filledTonal">
          保存
        </Button>
      </div>
    </form>
  );
});
