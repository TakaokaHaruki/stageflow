import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

const QUERY_KEY = ["appConfig", "position_categories"];
const DEFAULT_CATEGORIES = ["客案", "場内配置", "場外配置", "楽屋口"];

export function usePositionCategories() {
  const queryClient = useQueryClient();

  const { data: categories = DEFAULT_CATEGORIES } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const list = await base44.entities.AppConfig.filter({ key: "position_categories" });
      const record = list?.[0];
      if (!record?.value) return DEFAULT_CATEGORIES;
      try {
        const parsed = JSON.parse(record.value);
        return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_CATEGORIES;
      } catch {
        return DEFAULT_CATEGORIES;
      }
    },
    staleTime: 30_000,
  });

  const saveCategories = async (nextCategories) => {
    const list = await base44.entities.AppConfig.filter({ key: "position_categories" });
    const record = list?.[0];
    const value = JSON.stringify(nextCategories);
    if (record) {
      await base44.entities.AppConfig.update(record.id, { value });
    } else {
      await base44.entities.AppConfig.create({ key: "position_categories", value });
    }
    queryClient.setQueryData(QUERY_KEY, nextCategories);
    queryClient.invalidateQueries({ queryKey: QUERY_KEY });
  };

  const addCategory = async (category) => {
    const trimmed = category.trim();
    if (!trimmed || categories.includes(trimmed)) return;
    await saveCategories([...categories, trimmed]);
  };

  return { categories, saveCategories, addCategory };
}