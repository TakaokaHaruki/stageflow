import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

// 会場ごと・ポジション名ごとのピン位置を取得・保存する
export function usePositionMapPins(venueId) {
  const queryClient = useQueryClient();
  const queryKey = ["positionMapPins", venueId];

  const { data: pins = [], isLoading } = useQuery({
    queryKey,
    queryFn: () =>
      venueId ? base44.entities.PositionMapPin.filter({ venue_id: venueId }) : [],
    enabled: Boolean(venueId),
  });

  const upsertMutation = useMutation({
    mutationFn: async ({ venueId, venueName, positionName, x, y, existingId }) => {
      const payload = {
        venue_id: venueId,
        venue_name: venueName || "",
        position_name: positionName,
        map_x: x,
        map_y: y,
      };
      if (existingId) {
        return base44.entities.PositionMapPin.update(existingId, payload);
      }
      return base44.entities.PositionMapPin.create(payload);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.PositionMapPin.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  return { pins, isLoading, upsertMutation, deleteMutation };
}