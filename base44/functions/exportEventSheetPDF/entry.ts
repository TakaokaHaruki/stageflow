import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { jsPDF } from 'npm:jspdf@4.2.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { eventId } = await req.json();
    if (!eventId) {
      return Response.json({ error: 'eventId is required' }, { status: 400 });
    }

    // Fetch event data
    const event = await base44.entities.Event.get(eventId);
    if (!event) {
      return Response.json({ error: 'Event not found' }, { status: 404 });
    }

    // Fetch event sheet data
    const sheets = await base44.entities.EventSheet.filter({ event_id: eventId });
    const sheet = sheets[0] || null;

    // Create PDF
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    let yPos = margin;

    // Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(24);
    doc.text(event.name, pageWidth / 2, yPos + 10, { align: 'center' });
    yPos += 20;

    // Event basic info
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    
    if (event.date) {
      const dateStr = new Date(event.date).toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long'
      });
      doc.text(`開催日：${dateStr}`, margin, yPos + 5);
      yPos += 8;
    }

    if (event.venue) {
      doc.text(`会場：${event.venue}`, margin, yPos + 5);
      yPos += 8;
    }

    // Time slots
    doc.setFont('helvetica', 'bold');
    doc.text('【時間案内】', margin, yPos + 5);
    yPos += 8;
    doc.setFont('helvetica', 'normal');

    const timeSlots = [
      { label: '先行', start: event.time_priority, end: event.time_priority_end },
      { label: '開場', start: event.time_open, end: event.time_open_end },
      { label: '開演', start: event.time_start, end: event.time_start_end },
      { label: '終演', start: event.time_end, end: event.time_end_end }
    ];

    for (const slot of timeSlots) {
      if (slot.start) {
        let timeText = `${slot.label}: ${slot.start}`;
        if (slot.end) timeText += ` - ${slot.end}`;
        doc.text(timeText, margin + 5, yPos + 5);
        yPos += 6;
      }
    }

    yPos += 10;

    // Custom notes
    if (sheet?.custom_notes) {
      doc.setFont('helvetica', 'bold');
      doc.text('【注意事項】', margin, yPos + 5);
      yPos += 8;
      doc.setFont('helvetica', 'normal');
      
      const noteLines = doc.splitTextToSize(sheet.custom_notes, pageWidth - margin * 2);
      for (const line of noteLines) {
        if (yPos + 5 > pageHeight - 30) {
          doc.addPage();
          yPos = margin;
        }
        doc.text(line, margin, yPos + 5);
        yPos += 6;
      }
    }

    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(10);
      doc.setTextColor(150);
      doc.text(`作成日：${new Date().toLocaleDateString('ja-JP')} | ${i} / ${pageCount}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
    }

    // Generate PDF bytes
    const pdfBytes = doc.output('arraybuffer');
    
    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${event.name}_公演シート.pdf"`
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});