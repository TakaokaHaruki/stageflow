import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { loadEventById } from "@/lib/eventLoader";
import { usePositionMapPins } from "@/hooks/usePositionMapPins";

function svgDataUri(svg) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg || "")}`;
}

/**
 * PDF出力メニューで必要な各種データ（ミーティング用紙リスト・配置マップ素材・ポジション）を一括取得するフック。
 * event は親から渡されることを想定。マップ画像はSVGの場合data URI化して返す。
 */
export function usePdfExportData(eventId, event) {
  // ミーティング用紙一覧
  const { data: sheets = [], isLoading: sheetsLoading } = useQuery({
    queryKey: ["meeting_sheets_pdf", eventId],
    queryFn: async () => {
      const res = await base44.entities.MeetingSheet.filter(
        { event_id: eventId },
        { sort: "-updated_date", limit: 100 }
      );
      return res.items || [];
    },
    enabled: !!eventId,
  });

  // 会場・客席配置図
  const { data: venues = [] } = useQuery({
    queryKey: ["venues"],
    queryFn: () => base44.entities.Venue.list(),
  });
  const { data: seatingMaps = [] } = useQuery({
    queryKey: ["seating_maps"],
    queryFn: () => base44.entities.SeatingMap.list(),
  });

  // ポジション一覧（配置マップPDFのスタッフ重ね描画用）
  const { data: rawPositions = [] } = useQuery({
    queryKey: ["positions", eventId],
    queryFn: async () => {
      const res = await base44.functions.invoke("getPositionList", { eventId });
      return res?.data?.positions ?? [];
    },
    enabled: !!eventId,
  });

  const venue = useMemo(() => {
    const name = (event?.venue || "").trim();
    if (!name) return null;
    return venues.find((v) => v.name === name) || null;
  }, [event, venues]);

  const venueId = venue?.id || "";
  const { pins = [] } = usePositionMapPins(venueId);

  const mapImageSource = useMemo(() => {
    if (venueId) {
      const sm = seatingMaps.find((m) => m.venue_id === venueId && m.svg_url);
      if (sm?.svg_url) return { type: "svg", url: sm.svg_url };
    }
    if (event?.map_image_url) return { type: "image", url: event.map_image_url };
    return null;
  }, [venueId, seatingMaps, event]);

  const [mapSrc, setMapSrc] = useState("");
  useEffect(() => {
    let cancelled = false;
    setMapSrc("");
    if (!mapImageSource) return;
    if (mapImageSource.type === "image") {
      setMapSrc(mapImageSource.url);
      return;
    }
    fetch(mapImageSource.url)
      .then((r) => r.text())
      .then((text) => {
        if (!cancelled) setMapSrc(svgDataUri(text));
      })
      .catch(() => {
        if (!cancelled) setMapSrc(mapImageSource.url);
      });
    return () => { cancelled = true; };
  }, [mapImageSource]);

  return {
    sheets,
    sheetsLoading,
    positions: rawPositions,
    pins,
    mapSrc,
    hasMap: Boolean(mapSrc),
  };
}