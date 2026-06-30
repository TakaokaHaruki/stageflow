import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

const QUERY_KEY = ["appConfig", "custom_roles"];

export function useCustomRoles() {
  const queryClient = useQueryClient();

  const { data: customRoles = [] } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const list = await base44.entities.AppConfig.filter({ key: "custom_roles" });
      const record = list?.[0];
      if (!record?.value) return [];
      try {
        const parsed = JSON.parse(record.value);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    },
    staleTime: 30_000,
  });

  const saveRoles = async (nextRoles) => {
    const list = await base44.entities.AppConfig.filter({ key: "custom_roles" });
    const record = list?.[0];
    const value = JSON.stringify(nextRoles);
    if (record) {
      await base44.entities.AppConfig.update(record.id, { value });
    } else {
      await base44.entities.AppConfig.create({ key: "custom_roles", value });
    }
    queryClient.setQueryData(QUERY_KEY, nextRoles);
    queryClient.invalidateQueries({ queryKey: QUERY_KEY });
  };

  return { customRoles, saveRoles };
}