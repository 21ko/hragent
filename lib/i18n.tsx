"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
export type Lang = "fr" | "en";

interface Dict {
  nav: {
    new: string;
    dashboard: string;
    candidates: string;
    developers: string;
  };
  roles: Record<string, string>;
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
  landing: {
    navLinks: string[];
    navCta: string;
    heroTitle: string;
    heroLead: string;
    heroLeadStrong: string;
    heroLeadTail: string;
    ctaCompany: string;
    ctaWorker: string;
    audience: string;
    intakeTitle: string;
    stepOf: (n: number) => string;
    fProfile: string;
    fProfileOptions: string[];
    fCount: string;
    fDate: string;
    fLocation: string;
    fContinue: string;
    step2Title: string;
    fBudget: string;
    fStart: string;
    fEnd: string;
    fDescription: string;
    fBack: string;
    fLaunch: string;
    fLaunching: string;
    intakeFootnote: string;
    trust: string;
    stats: { value: string; label: string }[];
    stepsEyebrow: string;
    stepsTitle: string;
    steps: { n: string; title: string; body: string }[];
    ctaBandTitle: string;
    ctaBandSubtitle: string;
    ctaBandButton: string;
    footerTagline: string;
    footerLinks: string[];
  };
}

const FR: Dict = {
  nav: {
    new: "Nouvelle mission",
    dashboard: "Tableau de bord",
    candidates: "Candidats",
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
  landing: {
    navLinks: ["Fonctionnement", "Profils", "Tarifs", "Connexion"],
    navCta: "Lancer une mission",
    heroTitle: "Votre équipe événementielle, staffée en moins d'une minute.",
    heroLead:
      "Décrivez votre mission. Notre agent sélectionne les meilleurs profils, calcule un tarif juste, les ",
    heroLeadStrong: "appelle pour un court entretien RH",
    heroLeadTail: " et bascule sur WhatsApp s'ils ne répondent pas.",
    ctaCompany: "Je suis une entreprise",
    ctaWorker: "Je cherche une mission",
    audience: "Hôtes·ses · Agents de sécurité · Équipes événementielles",
    intakeTitle: "Nouvelle mission",
    stepOf: (n) => `Étape ${n}/2`,
    fProfile: "Type de profil",
    fProfileOptions: [
      "Hôte·sse d'accueil",
      "Agent de sécurité",
      "Équipe événementielle",
    ],
    fCount: "Nombre",
    fDate: "Date",
    fLocation: "Lieu",
    fContinue: "Continuer",
    step2Title: "Détails de la mission",
    fBudget: "Budget max (€ / pers. / jour)",
    fStart: "Début",
    fEnd: "Fin",
    fDescription: "Description de l'événement",
    fBack: "Retour",
    fLaunch: "Lancer la mission",
    fLaunching: "L'agent travaille…",
    intakeFootnote: "Tarif estimé en temps réel · Aucun engagement",
    trust: "Ils orchestrent leurs événements avec Staffly",
    stats: [
      { value: "< 60s", label: "pour constituer une shortlist complète" },
      { value: "15+", label: "profils qualifiés proposés par mission" },
      { value: "92%", label: "de taux de réponse — appel + WhatsApp" },
    ],
    stepsEyebrow: "Comment l'agent travaille",
    stepsTitle: "Du brief à la réservation, sans friction.",
    steps: [
      {
        n: "01",
        title: "Décrivez votre besoin",
        body: "Type de profil, date, lieu, nombre. En une phrase libre ou via le formulaire guidé.",
      },
      {
        n: "02",
        title: "Appel & tarif juste",
        body: "L'agent classe les profils, calcule un tarif équitable, puis les appelle pour un court entretien RH.",
      },
      {
        n: "03",
        title: "Relance WhatsApp",
        body: "Sans réponse à l'appel, l'agent bascule automatiquement sur WhatsApp. Vous suivez tout en direct.",
      },
    ],
    ctaBandTitle: "Prêt à staffer votre prochain événement ?",
    ctaBandSubtitle:
      "Lancez votre première mission en moins d'une minute. Sans engagement.",
    ctaBandButton: "Lancer une mission",
    footerTagline: "© 2026 — Staffing événementiel par IA",
    footerLinks: ["Mentions légales", "Confidentialité", "Contact"],
  },
};

const EN: Dict = {
  nav: {
    new: "New mission",
    dashboard: "Dashboard",
    candidates: "Candidates",
    developers: "Developers",
  },
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
  landing: {
    navLinks: ["How it works", "Profiles", "Pricing", "Log in"],
    navCta: "Start a mission",
    heroTitle: "Your event team, staffed in under a minute.",
    heroLead:
      "Describe your mission. Our agent picks the best profiles, computes a fair rate, ",
    heroLeadStrong: "calls them for a short HR interview",
    heroLeadTail: " and switches to WhatsApp if they don't answer.",
    ctaCompany: "I'm a company",
    ctaWorker: "I'm looking for work",
    audience: "Hosts · Security guards · Event crews",
    intakeTitle: "New mission",
    stepOf: (n) => `Step ${n}/2`,
    fProfile: "Profile type",
    fProfileOptions: ["Host / Hostess", "Security guard", "Event crew"],
    fCount: "Count",
    fDate: "Date",
    fLocation: "Location",
    fContinue: "Continue",
    step2Title: "Mission details",
    fBudget: "Max budget (€ / person / day)",
    fStart: "Start",
    fEnd: "End",
    fDescription: "Event description",
    fBack: "Back",
    fLaunch: "Launch the mission",
    fLaunching: "Agent is working…",
    intakeFootnote: "Live estimated rate · No commitment",
    trust: "They orchestrate their events with Staffly",
    stats: [
      { value: "< 60s", label: "to build a full shortlist" },
      { value: "15+", label: "qualified profiles per mission" },
      { value: "92%", label: "response rate — call + WhatsApp" },
    ],
    stepsEyebrow: "How the agent works",
    stepsTitle: "From brief to booking, friction-free.",
    steps: [
      {
        n: "01",
        title: "Describe your need",
        body: "Profile type, date, location, count. In one free sentence or via the guided form.",
      },
      {
        n: "02",
        title: "Call & fair rate",
        body: "The agent ranks profiles, computes a fair rate, then calls them for a short HR interview.",
      },
      {
        n: "03",
        title: "WhatsApp follow-up",
        body: "No answer on the call? The agent automatically switches to WhatsApp. You track it all live.",
      },
    ],
    ctaBandTitle: "Ready to staff your next event?",
    ctaBandSubtitle: "Launch your first mission in under a minute. No commitment.",
    ctaBandButton: "Start a mission",
    footerTagline: "© 2026 — AI event staffing",
    footerLinks: ["Legal", "Privacy", "Contact"],
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
