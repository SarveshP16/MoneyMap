// PDF export for Income & Tax — a real, text-based document (not a
// screenshot), built with jsPDF + jspdf-autotable. Both are dynamically
// imported inside the function body rather than statically at the top of
// this file, so Vite code-splits them into their own chunk that only loads
// when someone actually clicks "Export PDF" — the main bundle never pays
// for a library most sessions won't touch.

import { formatCurrency } from '../../lib/currency';
import { formatIsoDate } from '../../lib/dates';
import { financialYearLabel } from '../../lib/financeTotals';
import { incomeTypeLabel, type CurrencyInfo, type IncomeRecord } from '../../lib/types';

const INK = '#0d1321';
const MUTED = '#5d6685';
const AMBER = '#e8a33d';
const LINE = '#d8d2c4';

/** Per-financial-year subtotals, newest year first — same grouping
 *  `financialYearLabel` already does per record in the app, aggregated
 *  across every record instead of just the current year (a PDF meant to
 *  hand to an accountant is more useful covering the full history than
 *  only what's currently on screen). */
function groupByFinancialYear(records: IncomeRecord[], isAustralian: boolean) {
  const groups = new Map<string, { label: string; latest: number; records: IncomeRecord[] }>();
  for (const r of records) {
    const date = new Date(r.dateReceived);
    const label = financialYearLabel(date, isAustralian);
    const existing = groups.get(label);
    if (existing) {
      existing.records.push(r);
      existing.latest = Math.max(existing.latest, date.getTime());
    } else {
      groups.set(label, { label, latest: date.getTime(), records: [r] });
    }
  }
  return [...groups.values()].sort((a, b) => b.latest - a.latest);
}

export async function exportIncomePdf(records: IncomeRecord[], currency: CurrencyInfo): Promise<void> {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);

  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;

  doc.setProperties({ title: 'MoneyMap — Income & Tax', author: 'MoneyMap' });

  // Header ------------------------------------------------------------
  doc.setTextColor(AMBER);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('MONEYMAP', margin, 48);

  doc.setTextColor(INK);
  doc.setFontSize(22);
  doc.text('Income & Tax', margin, 74);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(MUTED);
  const generated = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date());
  doc.text(`Generated ${generated} · ${currency.isoCode}`, margin, 90);
  doc.setDrawColor(LINE);
  doc.line(margin, 100, pageWidth - margin, 100);

  const byYear = groupByFinancialYear(records, currency.isAustralian);
  const yearColumnLabel = currency.isAustralian ? 'Financial year' : 'Year';

  // Summary table: one row per year, oldest logic reused from the page's
  // own "this FY" stat (fyGross - fyTax), applied per year here.
  const summaryRows = byYear.map((g) => {
    const gross = g.records.reduce((s, r) => s + r.grossAmount, 0);
    const tax = g.records.reduce((s, r) => s + (r.taxWithheld ?? 0), 0);
    return [g.label, formatCurrency(gross, currency), formatCurrency(tax, currency), formatCurrency(gross - tax, currency)];
  });
  const totalGross = records.reduce((s, r) => s + r.grossAmount, 0);
  const totalTax = records.reduce((s, r) => s + (r.taxWithheld ?? 0), 0);

  autoTable(doc, {
    startY: 116,
    margin: { left: margin, right: margin },
    head: [[yearColumnLabel, 'Gross', 'Tax withheld', 'Net']],
    body: summaryRows,
    foot: [['All time', formatCurrency(totalGross, currency), formatCurrency(totalTax, currency), formatCurrency(totalGross - totalTax, currency)]],
    theme: 'plain',
    styles: { fontSize: 9, textColor: INK, cellPadding: { top: 5, bottom: 5, left: 0, right: 8 } },
    headStyles: { textColor: MUTED, fontStyle: 'bold', lineWidth: { bottom: 0.75 }, lineColor: LINE },
    footStyles: { textColor: INK, fontStyle: 'bold', lineWidth: { top: 0.75 }, lineColor: LINE },
    columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' } },
  });

  // Detail table: every record, newest first — same order as the screen.
  const sorted = [...records].sort((a, b) => new Date(b.dateReceived).getTime() - new Date(a.dateReceived).getTime());

  const head = currency.isAustralian
    ? ['Date', yearColumnLabel, 'Source', 'Type', 'Gross', 'Tax', 'Super', 'Net', 'Note']
    : ['Date', yearColumnLabel, 'Source', 'Gross', 'Tax', 'Net', 'Note'];

  const body = sorted.map((r) => {
    const date = new Date(r.dateReceived);
    const common = [
      formatIsoDate(date),
      financialYearLabel(date, currency.isAustralian),
      r.sourceName,
    ];
    const amounts = [
      formatCurrency(r.grossAmount, currency),
      r.taxWithheld != null ? formatCurrency(r.taxWithheld, currency) : '—',
    ];
    const net = r.netAmount != null ? formatCurrency(r.netAmount, currency) : '—';
    const note = r.note ?? '';

    if (currency.isAustralian) {
      return [
        ...common,
        r.incomeType ? incomeTypeLabel[r.incomeType] : '—',
        ...amounts,
        r.superAmount != null ? formatCurrency(r.superAmount, currency) : '—',
        net,
        note,
      ];
    }
    return [...common, ...amounts, net, note];
  });

  const docWithLastTable = doc as typeof doc & { lastAutoTable?: { finalY: number } };

  autoTable(doc, {
    startY: (docWithLastTable.lastAutoTable?.finalY ?? 116) + 28,
    margin: { left: margin, right: margin },
    head: [head],
    body,
    theme: 'striped',
    styles: { fontSize: 8, textColor: INK, cellPadding: 5 },
    headStyles: { fillColor: INK, textColor: '#ffffff', fontStyle: 'bold' },
    alternateRowStyles: { fillColor: '#f6f4ee' },
    didDrawPage: (data) => {
      doc.setFontSize(8);
      doc.setTextColor(MUTED);
      doc.text(
        `Page ${data.pageNumber} of ${doc.getNumberOfPages()}`,
        pageWidth - margin,
        doc.internal.pageSize.getHeight() - 20,
        { align: 'right' },
      );
    },
  });

  doc.save(`moneymap-income-tax-${formatIsoDate(new Date())}.pdf`);
}
