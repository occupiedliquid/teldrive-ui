import { Button, Dropdown, DropdownItem, DropdownMenu, DropdownTrigger } from "@tw-material/react";
import IconPhSun from "~icons/ph/sun";
import IconRiMoonClearLine from "~icons/ri/moon-clear-line";

import { useTheme } from "@/components/theme-provider";

export function ThemeToggle() {
  const { setTheme } = useTheme();

  return (
    <Dropdown
      classNames={{
        content: "min-w-36",
      }}
    >
      <DropdownTrigger>
        <Button className="text-inherit" variant="text" isIconOnly>
          <IconPhSun className="pointer-events-none size-6 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <IconRiMoonClearLine
            className="pointer-events-none absolute size-6 rotate-90 scale-0 transition-all 
            dark:rotate-0 dark:scale-100"
          />
          <span className="sr-only">テーマ</span>
        </Button>
      </DropdownTrigger>
      <DropdownMenu
        aria-label="Theme Menu"
        className="rounded-lg shadow-1"
        itemClasses={{
          title: "text-medium",
          startContent: "text-on-surface",
          endContent: "text-on-surface",
        }}
      >
        <DropdownItem key="light" onPress={() => setTheme("light")}>
          ライト
        </DropdownItem>
        <DropdownItem key="dark" onPress={() => setTheme("dark")}>
          ダーク
        </DropdownItem>
        <DropdownItem key="system" onPress={() => setTheme("system")}>
          システムの既定
        </DropdownItem>
      </DropdownMenu>
    </Dropdown>
  );
}
