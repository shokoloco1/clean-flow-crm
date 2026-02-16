import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { formatDateAU } from "./australian";

interface JobData {
  id: string;
  location: string;
  scheduled_date: string;
  scheduled_time: string;
  start_time: string | null;
  end_time: string | null;
  status: string;
  quality_score: number | null;
  geofence_validated: boolean | null;
  notes: string | null;
  clients?: { name: string } | null;
  profiles?: { full_name: string } | null;
}

interface PhotoData {
  id: string;
  photo_url: string;
  photo_type: "before" | "after";
  created_at: string;
}

interface ChecklistItem {
  id: string;
  room_name: string;
  task_name: string;
  status: string;
  completed_at: string | null;
  issue_note: string | null;
}

export function generateSingleJobPDF(
  job: JobData,
  photos: PhotoData[] = [],
  checklist: ChecklistItem[] = [],
): jsPDF {
  const doc = new jsPDF();

  // Header
  doc.setFontSize(20);
  doc.setTextColor(40, 40, 40);
  doc.text("Job Report", 14, 22);

  // Job info box
  doc.setFillColor(245, 247, 250);
  doc.rect(14, 28, 182, 35, "F");

  doc.setFontSize(12);
  doc.setTextColor(60, 60, 60);
  doc.text(`Client: ${job.clients?.name || "N/A"}`, 18, 38);
  doc.text(`Location: ${job.location}`, 18, 46);
  doc.text(`Date: ${formatDateAU(job.scheduled_date)}`, 18, 54);
  doc.text(`Scheduled Time: ${job.scheduled_time.slice(0, 5)}`, 110, 54);

  // Status badge
  const statusLabels: Record<string, string> = {
    completed: "COMPLETED",
    in_progress: "IN PROGRESS",
    pending: "PENDING",
    cancelled: "CANCELLED",
  };

  const statusColors: Record<string, [number, number, number]> = {
    completed: [34, 197, 94],
    in_progress: [234, 179, 8],
    pending: [156, 163, 175],
    cancelled: [239, 68, 68],
  };

  const statusColor = statusColors[job.status] || [156, 163, 175];
  doc.setFillColor(...statusColor);
  doc.roundedRect(140, 32, 50, 10, 2, 2, "F");
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text(statusLabels[job.status] || job.status.toUpperCase(), 165, 39, { align: "center" });

  let currentY = 72;

  // Staff info
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(11);
  doc.text(`Assigned Staff: ${job.profiles?.full_name || "Unassigned"}`, 14, currentY);
  currentY += 8;

  // Time details
  if (job.start_time || job.end_time) {
    doc.setFontSize(10);
    if (job.start_time) {
      doc.text(`Start: ${format(new Date(job.start_time), "HH:mm")}`, 14, currentY);
    }
    if (job.end_time) {
      doc.text(`End: ${format(new Date(job.end_time), "HH:mm")}`, 60, currentY);
    }
    if (job.start_time && job.end_time) {
      const duration = Math.round(
        (new Date(job.end_time).getTime() - new Date(job.start_time).getTime()) / 60000,
      );
      doc.text(`Duration: ${duration} min`, 106, currentY);
    }
    currentY += 8;
  }

  // Quality & GPS
  doc.text(`Quality: ${job.quality_score ? `${job.quality_score}%` : "N/A"}`, 14, currentY);
  doc.text(`GPS Validated: ${job.geofence_validated ? "Yes" : "No"}`, 60, currentY);
  currentY += 12;

  // Notes
  if (job.notes) {
    doc.setFontSize(11);
    doc.setTextColor(40, 40, 40);
    doc.text("Notes:", 14, currentY);
    currentY += 6;
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    const noteLines = doc.splitTextToSize(job.notes, 180);
    doc.text(noteLines, 14, currentY);
    currentY += noteLines.length * 5 + 8;
  }

  // Checklist
  if (checklist.length > 0) {
    doc.setFontSize(12);
    doc.setTextColor(40, 40, 40);
    doc.text("Checklist", 14, currentY);
    currentY += 6;

    const checklistData = checklist.map((item) => [
      item.room_name,
      item.task_name,
      item.status === "completed" ? "✓" : item.status === "issue" ? "⚠" : "○",
      item.issue_note || "-",
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [["Area", "Task", "Status", "Note"]],
      body: checklistData,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [59, 130, 246], textColor: 255 },
      columnStyles: {
        0: { cellWidth: 35 },
        1: { cellWidth: 60 },
        2: { cellWidth: 15, halign: "center" },
        3: { cellWidth: 70 },
      },
    });

    currentY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  }

  // Photos summary
  if (photos.length > 0) {
    if (currentY > 250) {
      doc.addPage();
      currentY = 20;
    }

    const beforeCount = photos.filter((p) => p.photo_type === "before").length;
    const afterCount = photos.filter((p) => p.photo_type === "after").length;

    doc.setFontSize(12);
    doc.setTextColor(40, 40, 40);
    doc.text("Evidence Photos", 14, currentY);
    currentY += 6;
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.text(`${beforeCount} "before" photos | ${afterCount} "after" photos`, 14, currentY);
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Generated: ${format(new Date(), "dd/MM/yyyy HH:mm")} | Page ${i} of ${pageCount}`,
      105,
      290,
      { align: "center" },
    );
  }

  return doc;
}
