import { memo } from "react";
import { getRouteApi } from "@tanstack/react-router";

import { AccountTab } from "./account-tab";
import { ApperanceTab } from "./apperance-tab";
import { GeneralTab } from "./general-tab";
import { InfoTab } from "./info-tab";

const fileRoute = getRouteApi("/_authed/settings/$tabId");

export const SettingsTabView = memo(() => {
  const params = fileRoute.useParams();

  switch (params.tabId) {
    case "外観":
      return <ApperanceTab />;
    case "アカウント":
      return <AccountTab />;
    case "基本設定":
      return <GeneralTab />;
    default:
      return <InfoTab />;
  }
});
