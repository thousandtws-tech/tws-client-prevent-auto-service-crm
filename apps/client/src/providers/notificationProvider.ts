import type { NotificationProvider } from "@refinedev/core";
import { useNotificationProvider as useMuiNotificationProvider } from "@refinedev/mui";
import { pushNotificationCenterItem } from "../services/notificationCenter";

export const useAppNotificationProvider = (): NotificationProvider => {
  const provider = useMuiNotificationProvider();

  return {
    open: (params) => {
      try {
        pushNotificationCenterItem(params);
      } catch {
        // Ignora falha de persistência para não interromper o toast visual.
      }

      provider.open(params);
    },
    close: provider.close,
  };
};
