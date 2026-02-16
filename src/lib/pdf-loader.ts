/** Lazily loads jsPDF + jspdf-autotable on first use (~250KB deferred from initial bundle). */
export async function loadPdfLibs() {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  return { jsPDF, autoTable };
}
