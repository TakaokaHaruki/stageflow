import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// 新規イベント作成時に、過去イベントの設定をまるごとコピーする。
// コピー対象: Event本体 / Staff / Position / EmergencyContact / MapArea / PositionTypeOverride / EventSheet / SharedFile
// リセット対象: status(準備中) / active_preset_id / scrape_url* / locked_staff_names / admin_only / added_by / added_at_jst / Announcement(コピーしない)

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['admin', 'chief'].includes(user.role)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { sourceEventId, name, date } = await req.json();
    if (!sourceEventId) {
      return Response.json({ error: 'sourceEventId is required' }, { status: 400 });
    }

    const svc = base44.asServiceRole;

    // 1. ソースイベント取得
    const source = await svc.entities.Event.get(sourceEventId);
    if (!source) return Response.json({ error: 'Source event not found' }, { status: 404 });

    // 2. 新規イベント作成
    const newEvent = await svc.entities.Event.create({
      name: name || `${source.name}（コピー）`,
      date: date || '',
      venue: source.venue || '',
      description: source.description || '',
      status: '準備中',
      time_priority: source.time_priority || '',
      time_priority_end: source.time_priority_end || '',
      time_open: source.time_open || '',
      time_open_end: source.time_open_end || '',
      time_start: source.time_start || '',
      time_start_end: source.time_start_end || '',
      time_end: source.time_end || '',
      time_end_end: source.time_end_end || '',
      map_image_url: source.map_image_url || '',
      map_pdf_url: source.map_pdf_url || '',
      continuous_mode: Boolean(source.continuous_mode),
      show_map: Boolean(source.show_map),
      show_tasks: source.show_tasks !== undefined ? Boolean(source.show_tasks) : true,
      // リセット
      active_preset_id: '',
      scrape_url: '',
      scrape_url_history: [],
      locked_staff_names: [],
      admin_only: false,
    });

    const newId = newEvent.id;

    // 3. Staff コピー
    const staff = await svc.entities.Staff.filter({ event_id: sourceEventId }, undefined, 500);
    await svc.entities.Staff.bulkCreate(
      (staff || []).map((s) => ({
        event_id: newId,
        name: s.name || '',
        acast_id: s.acast_id || '',
        note: s.note || '',
        note_before: s.note_before || '',
        note_during: s.note_during || '',
        note_after: s.note_after || '',
        color: s.color || '',
        costume_change: Boolean(s.costume_change),
        break: Boolean(s.break),
        skills: Array.isArray(s.skills) ? s.skills : [],
        roles: Array.isArray(s.roles) ? s.roles : [],
      }))
    );

    // 4. Position コピー（staff_names / chief_names は名前で保持・added_by系はリセット）
    const positions = await svc.entities.Position.filter({ event_id: sourceEventId }, undefined, 500);
    await svc.entities.Position.bulkCreate(
      (positions || []).map((p) => ({
        event_id: newId,
        name: p.name || '',
        category: p.category || '',
        time_slot: p.time_slot || '開場中',
        staff_names: Array.isArray(p.staff_names) ? [...p.staff_names] : [],
        staff_names_kamite: Array.isArray(p.staff_names_kamite) ? [...p.staff_names_kamite] : [],
        staff_names_shimote: Array.isArray(p.staff_names_shimote) ? [...p.staff_names_shimote] : [],
        split_by_side: Boolean(p.split_by_side),
        notes: p.notes || '',
        map_x: p.map_x,
        map_y: p.map_y,
        map_x_kamite: p.map_x_kamite,
        map_y_kamite: p.map_y_kamite,
        map_x_shimote: p.map_x_shimote,
        map_y_shimote: p.map_y_shimote,
        color: p.color || '',
        required_count: p.required_count || 0,
        required_skills: Array.isArray(p.required_skills) ? [...p.required_skills] : [],
        required_roles: Array.isArray(p.required_roles) ? [...p.required_roles] : [],
        chief_name: p.chief_name || '',
        chief_names: Array.isArray(p.chief_names) ? [...p.chief_names] : [],
        order: p.order ?? 0,
      }))
    );

    // 5. EmergencyContact コピー
    const contacts = await svc.entities.EmergencyContact.filter({ event_id: sourceEventId }, undefined, 500);
    if (contacts && contacts.length) {
      await svc.entities.EmergencyContact.bulkCreate(
        contacts.map((c) => ({
          event_id: newId,
          role_title: c.role_title || '',
          name: c.name || '',
          phone: c.phone || '',
          order: c.order ?? 0,
        }))
      );
    }

    // 6. MapArea コピー
    const areas = await svc.entities.MapArea.filter({ event_id: sourceEventId }, undefined, 500);
    if (areas && areas.length) {
      await svc.entities.MapArea.bulkCreate(
        areas.map((a) => ({
          event_id: newId,
          name: a.name || '',
          type: a.type || 'rectangle',
          x: a.x,
          y: a.y,
          width: a.width,
          height: a.height,
          color: a.color || '#e2e8f0',
          order: a.order ?? 0,
        }))
      );
    }

    // 7. PositionTypeOverride コピー
    const overrides = await svc.entities.PositionTypeOverride.filter({ event_id: sourceEventId }, undefined, 500);
    if (overrides && overrides.length) {
      await svc.entities.PositionTypeOverride.bulkCreate(
        overrides.map((o) => ({
          event_id: newId,
          position_type_name: o.position_type_name || '',
          description: o.description || '',
          resources: Array.isArray(o.resources) ? [...o.resources] : [],
        }))
      );
    }

    // 8. EventSheet コピー
    const sheets = await svc.entities.EventSheet.filter({ event_id: sourceEventId }, undefined, 10);
    if (sheets && sheets.length === 0) {
      await svc.entities.EventSheet.create({
        event_id: newId,
        custom_notes: '',
      });
    } else if (sheets && sheets.length) {
      await svc.entities.EventSheet.create({
        event_id: newId,
        custom_notes: sheets[0].custom_notes || '',
      });
    }

    // 9. SharedFile コピー（created_by_id はサービスロールで cloner 権限）
    const files = await svc.entities.SharedFile.filter({ event_id: sourceEventId }, undefined, 500);
    if (files && files.length) {
      await svc.entities.SharedFile.bulkCreate(
        files.map((f) => ({
          event_id: newId,
          title: f.title || '',
          description: f.description || '',
          file_url: f.file_url || '',
          file_name: f.file_name || '',
          visibility: f.visibility || 'public',
          allowed_roles: Array.isArray(f.allowed_roles) ? [...f.allowed_roles] : [],
          allowed_staff_names: Array.isArray(f.allowed_staff_names) ? [...f.allowed_staff_names] : [],
        }))
      );
    }

    return Response.json({ event: newEvent });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}