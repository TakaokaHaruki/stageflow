export const SYSTEM_FIELDS = ['id', 'created_date', 'updated_date', 'created_by_id', 'created_by', 'is_sample', '_id'];

export function cleanRecord(r) {
  if (!r || typeof r !== 'object') return {};
  const out = {};
  for (const k of Object.keys(r)) {
    if (!SYSTEM_FIELDS.includes(k)) out[k] = r[k];
  }
  return out;
}

export function jstNow() {
  const d = new Date();
  const jst = new Date(d.getTime() + 9 * 3600 * 1000);
  return jst.toISOString().slice(0, 16).replace('T', ' ');
}

export const ENTITY_MAP = {
  positions: 'Position',
  staff: 'Staff',
  emergency_contacts: 'EmergencyContact',
  event_sheets: 'EventSheet',
  announcements: 'Announcement',
  shared_files: 'SharedFile',
  side_settings: 'PositionSideSettings',
  map_areas: 'MapArea',
  tasks: 'Task',
  position_type_overrides: 'PositionTypeOverride',
};

export const SECTIONS = [
  { key: 'positions', label: '配置表', getKey: (r) => `${r.name || ''}|${r.time_slot || ''}|${(r.parts || []).join(',')}` },
  { key: 'staff', label: 'スタッフ', getKey: (r) => r.name || '' },
  { key: 'emergency_contacts', label: '緊急連絡先', getKey: (r) => r.role_title || '' },
  { key: 'event_sheets', label: '注意事項', getKey: () => 'event_sheet' },
  { key: 'announcements', label: 'お知らせ', getKey: (r) => r.title || '' },
  { key: 'shared_files', label: '配布資料', getKey: (r) => r.title || '' },
  { key: 'side_settings', label: '上下手設定', getKey: () => 'side_settings' },
  { key: 'map_areas', label: 'マップエリア', getKey: (r) => r.name || '' },
  { key: 'tasks', label: 'タスク', getKey: (r) => r.title || '' },
  { key: 'position_type_overrides', label: '説明上書き', getKey: (r) => r.position_type_name || '' },
];

export async function collectEventRaw(client, event_id) {
  const [
    positions, staff, emergencyContacts, eventSheets,
    announcements, sharedFiles, sideSettings, mapAreas,
    tasks, typeOverrides
  ] = await Promise.all([
    client.entities.Position.filter({ event_id }, '-created_date', 500),
    client.entities.Staff.filter({ event_id }, '-created_date', 500),
    client.entities.EmergencyContact.filter({ event_id }, '-order', 200),
    client.entities.EventSheet.filter({ event_id }, '-created_date', 50),
    client.entities.Announcement.filter({ event_id }, '-created_date', 200),
    client.entities.SharedFile.filter({ event_id }, '-created_date', 200),
    client.entities.PositionSideSettings.filter({ event_id }, '-created_date', 50),
    client.entities.MapArea.filter({ event_id }, '-order', 200),
    client.entities.Task.filter({ event_id }, '-order', 200),
    client.entities.PositionTypeOverride.filter({ event_id }, '-created_date', 200),
  ]);
  return {
    positions, staff, emergency_contacts: emergencyContacts, event_sheets: eventSheets,
    announcements, shared_files: sharedFiles, side_settings: sideSettings,
    map_areas: mapAreas, tasks, position_type_overrides: typeOverrides,
  };
}

export function cleanBackupData(raw) {
  const out = {};
  for (const key of Object.keys(ENTITY_MAP)) {
    out[key] = (raw[key] || []).map(cleanRecord);
  }
  return out;
}

export function backupSummary(backup_data) {
  const labels = {
    positions: '配置', staff: 'スタッフ', emergency_contacts: '緊急連絡先', event_sheets: '注意事項',
    announcements: 'お知らせ', shared_files: '配布資料', side_settings: '上下手設定', map_areas: 'マップエリア',
    tasks: 'タスク', position_type_overrides: '説明上書き'
  };
  return Object.keys(labels)
    .filter(k => Array.isArray(backup_data[k]) && backup_data[k].length > 0)
    .map(k => `${labels[k]}${backup_data[k].length}`)
    .join('・');
}

export function buildComparison(backupArr, currentArr, getKey) {
  const backupMap = new Map();
  const currentMap = new Map();
  for (const r of backupArr) { const key = getKey(r); if (key && !backupMap.has(key)) backupMap.set(key, r); }
  for (const r of currentArr) { const key = getKey(r); if (key && !currentMap.has(key)) currentMap.set(key, r); }
  const allKeys = new Set([...backupMap.keys(), ...currentMap.keys()]);
  const details = [];
  let added = 0, removed = 0, modified = 0, same = 0;
  for (const key of allKeys) {
    const b = backupMap.get(key);
    const c = currentMap.get(key);
    if (!c) { added++; details.push({ key, status: 'added', backup: b, current: null }); }
    else if (!b) { removed++; details.push({ key, status: 'removed', backup: null, current: c }); }
    else {
      const bStr = JSON.stringify(cleanRecord(b));
      const cStr = JSON.stringify(cleanRecord(c));
      if (bStr === cStr) { same++; details.push({ key, status: 'same', backup: b, current: c }); }
      else { modified++; details.push({ key, status: 'modified', backup: b, current: c }); }
    }
  }
  return { backup_count: backupArr.length, current_count: currentArr.length, added, removed, modified, same, details };
}

export function buildFullComparison(backupData, currentClean) {
  return SECTIONS.map(s => ({
    key: s.key,
    label: s.label,
    ...buildComparison(backupData[s.key] || [], currentClean[s.key] || [], s.getKey),
  }));
}

export async function restoreEventBackup(client, event_id, backupData) {
  const rawCurrent = await collectEventRaw(client, event_id);
  const result = { deleted: {}, restored: {} };
  for (const key of Object.keys(ENTITY_MAP)) {
    const entityName = ENTITY_MAP[key];
    for (const r of rawCurrent[key]) {
      try { await client.entities[entityName].delete(r.id); result.deleted[key] = (result.deleted[key] || 0) + 1; } catch (e) {}
    }
    const backupRecords = backupData[key] || [];
    if (backupRecords.length) {
      await client.entities[entityName].bulkCreate(backupRecords.map(cleanRecord));
      result.restored[key] = backupRecords.length;
    }
  }
  return result;
}