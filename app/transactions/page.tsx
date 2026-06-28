"use client";

import { useI18n } from "@/lib/i18n";

const rows = [
  ["STF-0628", "Lancement Rivoli", "1 080 €", "130 €", "950 €", "Payé"],
  ["STF-0621", "Salon VivaTech", "4 320 €", "518 €", "3 802 €", "Payé"],
  ["STF-0614", "Dîner Maison A.", "2 160 €", "259 €", "1 901 €", "En cours"],
];

export default function TransactionsPage() {
  const { lang } = useI18n(); const fr = lang === "fr";
  return <div>
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><p className="mono-label">{fr ? "Flux financiers" : "Financial flow"}</p><h1 className="mt-2 text-3xl font-extrabold tracking-[-.03em]">Transactions</h1></div><button className="btn-ghost">{fr ? "Exporter CSV" : "Export CSV"}</button></div>
    <div className="mt-8 grid gap-4 sm:grid-cols-3"><Metric label={fr ? "Volume traité (juin)" : "Processed volume (June)"} value="48 250 €" /><Metric label={fr ? "Commission Staffly" : "Staffly commission"} value="5 790 €" accent /><Metric label={fr ? "À reverser aux candidats" : "Due to candidates"} value="12 400 €" /></div>
    <div className="mt-8 rounded-2xl border border-line bg-white p-5"><div className="flex items-center justify-center gap-3 text-sm"><span className="rounded-xl bg-surface px-4 py-3 font-semibold">{fr ? "Client paie" : "Client pays"}</span><span className="text-accent">→</span><span className="rounded-xl bg-accent-tint px-4 py-3 font-semibold text-accent">Staffly · 12%</span><span className="text-accent">→</span><span className="rounded-xl bg-surface px-4 py-3 font-semibold">{fr ? "Candidat reçoit" : "Candidate receives"}</span></div></div>
    <div className="mt-6 overflow-x-auto rounded-2xl border border-line bg-white"><table className="w-full min-w-[720px] text-left text-sm"><thead className="border-b border-line bg-surface/50 text-xs text-muted"><tr>{["Réf.", fr ? "Mission" : "Mission", fr ? "Montant" : "Amount", "Commission", fr ? "Net candidat" : "Candidate net", fr ? "Statut" : "Status"].map(h => <th key={h} className="px-5 py-3 font-semibold">{h}</th>)}</tr></thead><tbody>{rows.map(row => <tr key={row[0]} className="border-b border-line last:border-0">{row.map((cell, index) => <td key={cell} className={`px-5 py-4 ${index === 0 ? "font-mono text-xs text-muted" : index === 1 ? "font-semibold" : ""}`}>{index === 5 ? <span className="badge bg-green-50 text-green-700">{cell}</span> : cell}</td>)}</tr>)}</tbody></table></div>
  </div>;
}
function Metric({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) { return <div className="card"><p className="text-xs text-muted">{label}</p><p className={`mt-3 text-2xl font-extrabold ${accent ? "text-accent" : ""}`}>{value}</p></div>; }
