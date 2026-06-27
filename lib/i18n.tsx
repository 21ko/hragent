"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { RoleType } from "./types";

export type Lang = "fr" | "en";

interface Dict {
  nav: { new: string; dashboard: string; developers: string };
  roles: Record<RoleType, string>;
  missionStatus: Record<string, string>;
  callStatus: Record<string, string>;
  whatsappStatus: Record<string, string>;
  home: {
    badge: string;
    title: string;
    subtitle: string;
    bullets: string[];
    formTitle: string;
    role: string;
    people: string;
    city: string;
    date: string;
    start: string;
    end: string;
    budget: string;
    description: string;
    submit: string;
    submitting: string;
    formHint: string;
  };
  results: {
    back: string;
    people: string;
    budgetMax: string;
    outreachTitle: string;
    seeOthers: (n: number) => string;
    pricingTitle: string;
    expMult: string;
    urgencyMult: string;
    formula: string;
    copy: string;
    copied: string;
    suggestedRate: string;
    confidence: string;
    reachedByPhone: string;
    callNotes: string;
    simAnswer: string;
    simNoAnswer: string;
    simYes: string;
    simNo: string;
    noCandidatesTitle: string;
    newMission: string;
    activityTitle: string;
    working: string[];
  };
  dashboard: { title: string; newMission: string; loading: string; empty: string; emptyCta: string };
}

const FR: Dict = {
  nav: {
    new: "Nouvelle mission",
    dashboard: "Tableau de bord",
    developers: "Développeurs",
  },
  roles: {
    hostess: "Hôtesse",
    security: "Agent de sécurité",
    event_staff: "Staff événementiel",
  },
  missionStatus: {
    pending_outreach: "Préparation",
    awaiting_replies: "En attente de réponses",
    complete: "Complète",
    no_candidates: "Aucun candidat",
  },
  callStatus: {
    pending: "Appel en attente",
    calling: "Appel en cours",
    answered: "A répondu au téléphone",
    no_answer: "Pas de réponse",
    failed: "Appel échoué",
  },
  whatsappStatus: {
    pending: "En attente",
    sent: "WhatsApp envoyé",
    replied_yes: "A confirmé (OUI)",
    replied_no: "A décliné (NON)",
    failed: "Échec d'envoi",
  },
  home: {
    badge: "Agent IA · bout en bout",
    title: "Recrutez du personnel événementiel en moins de 60 secondes.",
    subtitle:
      "Décrivez votre mission. Notre agent IA analyse le brief, shortliste les meilleurs profils, calcule un tarif juste, appelle les candidats puis les relance par WhatsApp — sans intervention humaine.",
    bullets: [
      "Matching intelligent par ville, expérience et langues",
      "Tarification transparente (expérience × urgence)",
      "Appel téléphonique d'abord, WhatsApp en relance",
    ],
    formTitle: "",
    role: "Type de poste",
    people: "Nombre de personnes",
    city: "Ville",
    date: "Date de la mission",
    start: "Heure de début",
    end: "Heure de fin",
    budget: "Budget max (€ / personne / jour)",
    description: "Description de l'événement",
    submit: "Lancer l'agent IA",
    submitting: "L'agent travaille…",
    formHint:
      "L'agent shortliste, tarifie, appelle et contacte les candidats automatiquement.",
  },
  results: {
    back: "Tableau de bord",
    people: "personne(s)",
    budgetMax: "budget max",
    outreachTitle: "Top 3 contactés (appel puis WhatsApp)",
    seeOthers: (n) => `Voir les ${n} autres candidats shortlistés`,
    pricingTitle: "Tarification expliquée",
    expMult: "Multiplicateur d'expérience",
    urgencyMult: "Multiplicateur d'urgence",
    formula:
      "tarif = tarif de base × multiplicateur d'expérience × multiplicateur d'urgence",
    copy: "Copier le récapitulatif",
    copied: "Copié ✓",
    suggestedRate: "tarif suggéré / jour",
    confidence: "confiance",
    reachedByPhone: "Joint par téléphone",
    callNotes: "Notes d'appel",
    simAnswer: "Simuler réponse appel",
    simNoAnswer: "Simuler non-réponse",
    simYes: "Simuler OUI",
    simNo: "Simuler NON",
    noCandidatesTitle: "Aucun candidat éligible",
    newMission: "Nouvelle mission",
    activityTitle: "Activité de l'agent",
    working: [
      "Analyse du brief de mission…",
      "Recherche des candidats dans la base…",
      "Classement par adéquation…",
      "Calcul des tarifs justes…",
      "Appel des candidats…",
      "Relance WhatsApp…",
    ],
  },
  dashboard: {
    title: "Tableau de bord",
    newMission: "+ Nouvelle mission",
    loading: "Chargement…",
    empty: "Aucune mission pour l'instant.",
    emptyCta: "Créez-en une.",
  },
};

const EN: Dict = {
  nav: { new: "New mission", dashboard: "Dashboard", developers: "Developers" },
  roles: {
    hostess: "Host / Hostess",
    security: "Security guard",
    event_staff: "Event staff",
  },
  missionStatus: {
    pending_outreach: "Preparing",
    awaiting_replies: "Awaiting replies",
    complete: "Complete",
    no_candidates: "No candidates",
  },
  callStatus: {
    pending: "Call pending",
    calling: "Calling",
    answered: "Answered the call",
    no_answer: "No answer",
    failed: "Call failed",
  },
  whatsappStatus: {
    pending: "Pending",
    sent: "WhatsApp sent",
    replied_yes: "Confirmed (YES)",
    replied_no: "Declined (NO)",
    failed: "Send failed",
  },
  home: {
    badge: "AI agent · end to end",
    title: "Staff your event in under 60 seconds.",
    subtitle:
      "Describe your mission. Our AI agent parses the brief, shortlists the best profiles, computes a fair rate, calls the candidates, then follows up on WhatsApp — with no human in the loop.",
    bullets: [
      "Smart matching by city, experience and languages",
      "Transparent pricing (experience × urgency)",
      "Phone call first, WhatsApp as fallback",
    ],
    formTitle: "",
    role: "Role",
    people: "People needed",
    city: "City",
    date: "Mission date",
    start: "Start time",
    end: "End time",
    budget: "Max budget (€ / person / day)",
    description: "Event description",
    submit: "Run the AI agent",
    submitting: "Agent is working…",
    formHint:
      "The agent shortlists, prices, calls and contacts candidates automatically.",
  },
  results: {
    back: "Dashboard",
    people: "person(s)",
    budgetMax: "max budget",
    outreachTitle: "Top 3 contacted (call then WhatsApp)",
    seeOthers: (n) => `See ${n} more shortlisted candidates`,
    pricingTitle: "Pricing explained",
    expMult: "Experience multiplier",
    urgencyMult: "Urgency multiplier",
    formula: "rate = base rate × experience multiplier × urgency multiplier",
    copy: "Copy summary",
    copied: "Copied ✓",
    suggestedRate: "suggested rate / day",
    confidence: "confidence",
    reachedByPhone: "Reached by phone",
    callNotes: "Call notes",
    simAnswer: "Simulate call answered",
    simNoAnswer: "Simulate no answer",
    simYes: "Simulate YES",
    simNo: "Simulate NO",
    noCandidatesTitle: "No eligible candidates",
    newMission: "New mission",
    activityTitle: "Agent activity",
    working: [
      "Parsing the job brief…",
      "Searching the candidate database…",
      "Ranking by fit…",
      "Computing fair rates…",
      "Calling candidates…",
      "WhatsApp follow-up…",
    ],
  },
  dashboard: {
    title: "Dashboard",
    newMission: "+ New mission",
    loading: "Loading…",
    empty: "No missions yet.",
    emptyCta: "Create one.",
  },
};

const DICTS: Record<Lang, Dict> = { fr: FR, en: EN };

interface LangCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: Dict;
}

const Ctx = createContext<LangCtx | null>(null);

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("fr");

  useEffect(() => {
    const stored = localStorage.getItem("staffly_lang") as Lang | null;
    if (stored === "fr" || stored === "en") setLangState(stored);
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    localStorage.setItem("staffly_lang", l);
  }, []);

  return (
    <Ctx.Provider value={{ lang, setLang, t: DICTS[lang] }}>
      {children}
    </Ctx.Provider>
  );
}

export function useI18n(): LangCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useI18n must be used within LangProvider");
  return ctx;
}
