const positionSideCache = new Map();

function getPositionSideCacheKey(eventId) {
  return `stageflow:position_side:${eventId}`;
}

export function normalizePositionSideSettings(raw) {
  return {
    position_types: raw?.position_types || {},
    positions: raw?.positions || {},
    updated_at: raw?.updated_at || null,
  };
}

function hasPositionSideSettings(settings) {
  return Boolean(
    Object.keys(settings?.position_types || {}).length ||
    Object.keys(settings?.positions || {}).length
  );
}

function readCachedPositionSideSettings(eventId) {
  const inMemory = positionSideCache.get(eventId);
  if (inMemory) return inMemory;
  if (typeof window === "undefined") return normalizePositionSideSettings();
  try {
    const cached = JSON.parse(window.localStorage.getItem(getPositionSideCacheKey(eventId)) || "{}");
    const settings = normalizePositionSideSettings(cached);
    if (hasPositionSideSettings(settings)) {
      positionSideCache.set(eventId, settings);
      return settings;
    }
  } catch {
    // Ignore corrupt local cache.
  }
  return normalizePositionSideSettings();
}

export function rememberPositionSideSettings(eventId, settings) {
  const normalized = normalizePositionSideSettings(settings);
  if (!hasPositionSideSettings(normalized)) return normalized;
  positionSideCache.set(eventId, normalized);
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(getPositionSideCacheKey(eventId), JSON.stringify(normalized));
    } catch {
      // Storage may be unavailable; in-memory cache still prevents visible flicker for this session.
    }
  }
  return normalized;
}

export async function loadPositionSideSettings(base44, eventId) {
  try {
    const records = await base44.entities.PositionSideSettings.filter({ event_id: eventId });
    const record = (records || []).sort((a, b) =>
      new Date(b.updated_at || b.updated_date || 0) - new Date(a.updated_at || a.updated_date || 0)
    )[0];
    if (record && hasPositionSideSettings(normalizePositionSideSettings(record))) {
      return rememberPositionSideSettings(eventId, record);
    }
  } catch (error) {
    console.warn("PositionSideSettings SDK read failed; falling back to cache.", error);
  }

  return readCachedPositionSideSettings(eventId);
}

export function applyPositionSideMutation(settings, positionId, data) {
  const previous = normalizePositionSideSettings(settings);
  const current = previous.positions[positionId] || {};
  const splitBySide = Boolean(data.split_by_side ?? current.split_by_side);
  const kamite = data.staff_names_kamite ?? current.staff_names_kamite ?? [];
  const shimote = data.staff_names_shimote ?? current.staff_names_shimote ?? [];
  return {
    ...previous,
    positions: {
      ...previous.positions,
      [positionId]: {
        ...current,
        split_by_side: splitBySide,
        staff_names_kamite: kamite,
        staff_names_shimote: shimote,
      },
    },
    updated_at: new Date().toISOString(),
  };
}

export function applyPositionSideSettingsToTypes(positionTypes) {
  // split_by_side is persisted directly on the PositionType entity — no override needed.
  return positionTypes || [];
}

export function applyPositionSideSettingsToPositions(positions, positionTypes, settings) {
  const typeSettings = settings?.position_types || {};
  const positionSettings = settings?.positions || {};
  return (positions || []).map((position) => {
    const saved = positionSettings[position.id] || {};
    const splitByType = typeSettings[position.name];
    const splitBySide = Boolean(saved.split_by_side ?? splitByType ?? position.split_by_side);
    // DB実データ（Position本体）を第一優先：キャッシュのstaff_names_kamite/shimoteは
    // 古い可能性があるため参照せず、split_by_sideフラグの解決のみsavedを参照する。
    return {
      ...position,
      split_by_side: splitBySide,
      staff_names_kamite: position.staff_names_kamite || [],
      staff_names_shimote: position.staff_names_shimote || [],
    };
  });
}