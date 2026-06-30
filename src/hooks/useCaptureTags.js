import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { DEFAULT_CAPTURE_TAGS } from "@/lib/staffRoles";

const QUERY_KEY = ["appConfig", "capture_tags"];

export function useCaptureTags() {
  const queryClient = useQueryClient();

  const { data: tags = [] } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const list = await base44.entities.AppConfig.filter({ key: "capture_tags" });
      const record = list?.[0];
      if (!record?.value) return DEFAULT_CAPTURE_TAGS;
      try {
        const parsed = JSON.parse(record.value);
        return Array.isArray(parsed) ? parsed : DEFAULT_CAPTURE_TAGS;
      } catch {
        return DEFAULT_CAPTURE_TAGS;
      }
    },
    staleTime: 30_000,
  });

  const saveTags = async (nextTags) => {
    const list = await base44.entities.AppConfig.filter({ key: "capture_tags" });
    const record = list?.[0];
    const value = JSON.stringify(nextTags);
    if (record) {
      await base44.entities.AppConfig.update(record.id, { value });
    } else {
      await base44.entities.AppConfig.create({ key: "capture_tags", value });
    }
    queryClient.setQueryData(QUERY_KEY, nextTags);
    queryClient.invalidateQueries({ queryKey: QUERY_KEY });
  };

  return { tags, saveTags };
}