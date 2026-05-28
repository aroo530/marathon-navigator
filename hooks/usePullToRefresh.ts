import { logger } from '@/utils/logger';
import { useState } from "react";
import { RefreshControl } from "react-native";
import { Colors } from "@/constants/Theme";

export const usePullToRefresh = (refreshFunction: () => Promise<void>) => {
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshFunction();
    } catch (error) {
      logger.error("Error refreshing:", error);
    } finally {
      setRefreshing(false);
    }
  };

  // Return the props needed to create RefreshControl
  const refreshControlProps = {
    refreshing,
    onRefresh,
    colors: [Colors.blue[2]],
    tintColor: Colors.blue[2],
  };

  return {
    refreshing,
    onRefresh,
    refreshControlProps,
  };
};
