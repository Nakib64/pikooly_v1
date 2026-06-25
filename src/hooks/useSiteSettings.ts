import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const SITE_SETTINGS_UPDATED_EVENT = "pikooly:site-settings-updated";
export const SITE_SETTINGS_UPDATED_STORAGE_KEY = "pikooly_site_settings_updated_at";

export const useSiteSettings = () => {
  const queryClient = useQueryClient();
  const { data: settings = {}, isLoading } = useQuery({
    queryKey: ["site-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("key, value");
      if (error) throw error;
      const map: Record<string, string> = {};
      data?.forEach((s) => {
        map[s.key] = s.value || "";
      });
      return map;
    },
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    const refreshSettings = () => {
      queryClient.invalidateQueries({ queryKey: ["site-settings"] });
    };
    const handleStorage = (event: StorageEvent) => {
      if (event.key === SITE_SETTINGS_UPDATED_STORAGE_KEY) refreshSettings();
    };

    window.addEventListener(SITE_SETTINGS_UPDATED_EVENT, refreshSettings);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener(SITE_SETTINGS_UPDATED_EVENT, refreshSettings);
      window.removeEventListener("storage", handleStorage);
    };
  }, [queryClient]);

  return { settings, isLoading };
};
