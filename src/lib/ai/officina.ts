export const DOCUMENT_GENERATION_OPTIONS = [
  {
    value: "Parere_Strategico",
    title: "Genera Parere Strategico",
    subtitle:
      "Imposta una linea difensiva e operativa per la crisi, con lettura dei documenti caricati e delle fonti pertinenti.",
    sections: [
      "Sommario esecutivo",
      "Premessa fattuale",
      "Analisi economico-giuridica",
      "Strategia consigliata",
      "Rischi e cautele",
      "Prossimi passi operativi",
    ],
  },
  {
    value: "Parere_Creditori_Erario",
    title: "Genera Parere su Creditori ed Erario",
    subtitle:
      "Valuta priorita negoziali, esposizione verso banche, fornitori ed Erario e costruisce una strategia di interlocuzione.",
    sections: [
      "Quadro dell'esposizione",
      "Posizione dell'Erario e degli enti previdenziali",
      "Creditori strategici",
      "Linee negoziali suggerite",
      "Misure di protezione o continuita utili",
    ],
  },
  {
    value: "Ricorso_Misure_Protettive",
    title: "Genera Ricorso Misure Protettive",
    subtitle:
      "Redige una bozza argomentata in stile giudiziale, focalizzata su presupposti, urgenza e supporto documentale.",
    sections: [
      "Intestazione e parti",
      "Premessa in fatto",
      "Presupposti di ammissibilita",
      "Periculum e fumus",
      "Richieste al tribunale",
      "Documenti allegati e cautele istruttorie",
    ],
  },
  {
    value: "Istanza_Proroga_Misure_Protettive",
    title: "Genera Istanza di Proroga Misure Protettive",
    subtitle:
      "Predispone l'istanza di proroga evidenziando stato delle trattative, risultati ottenuti e necessita della prosecuzione.",
    sections: [
      "Premessa e cronologia",
      "Attivita svolta nelle trattative",
      "Utilita della proroga",
      "Persistenza dei presupposti",
      "Richieste conclusive",
    ],
  },
  {
    value: "Memoria_Integrativa_Tribunale",
    title: "Genera Memoria Integrativa per il Tribunale",
    subtitle:
      "Prepara una memoria di chiarimento o integrazione documentale da depositare in sede giudiziale.",
    sections: [
      "Oggetto della memoria",
      "Integrazioni fattuali",
      "Produzione documentale",
      "Chiarimenti giuridici",
      "Conclusioni",
    ],
  },
  {
    value: "Piano_Risanamento_Operativo",
    title: "Genera Piano di Risanamento Operativo",
    subtitle:
      "Organizza il materiale del fascicolo in un documento strategico-operativo per sostenere continuita e riequilibrio.",
    sections: [
      "Executive summary",
      "Diagnosi della crisi",
      "Azioni industriali e finanziarie",
      "Cronoprogramma",
      "Milestone e KPI",
      "Rischi di esecuzione",
    ],
  },
  {
    value: "Lettera_Creditori_Strategici",
    title: "Genera Lettera ai Creditori Strategici",
    subtitle:
      "Predispone una bozza di comunicazione formale per banche, fornitori chiave o controparti essenziali.",
    sections: [
      "Contesto e finalita",
      "Rappresentazione sintetica della crisi",
      "Misure richieste al creditore",
      "Benefici della continuita",
      "Invito al confronto",
    ],
  },
  {
    value: "Verbale_Avanzamento_Trattative",
    title: "Genera Verbale di Avanzamento Trattative",
    subtitle:
      "Redige un verbale strutturato per cristallizzare stato avanzamento, interlocuzioni e punti aperti.",
    sections: [
      "Partecipanti e contesto",
      "Sintesi degli incontri svolti",
      "Posizioni dei creditori",
      "Punti condivisi",
      "Questioni aperte e prossime attivita",
    ],
  },
] as const;

export type DocumentGenerationType =
  (typeof DOCUMENT_GENERATION_OPTIONS)[number]["value"];

export function isDocumentGenerationType(
  value: string
): value is DocumentGenerationType {
  return DOCUMENT_GENERATION_OPTIONS.some((option) => option.value === value);
}

export function getDocumentGenerationOption(value: DocumentGenerationType) {
  return (
    DOCUMENT_GENERATION_OPTIONS.find((option) => option.value === value) ??
    DOCUMENT_GENERATION_OPTIONS[0]
  );
}

export function createGeneratedActTitle(params: {
  companyName: string;
  documentType: DocumentGenerationType;
  version?: number;
}) {
  const option = getDocumentGenerationOption(params.documentType);
  const versionSuffix =
    typeof params.version === "number" ? ` · v${params.version}` : "";

  return `${option.title} · ${params.companyName}${versionSuffix}`;
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

export function createGeneratedActFilename(params: {
  companyName: string;
  documentType: DocumentGenerationType;
  version: number;
}) {
  const option = getDocumentGenerationOption(params.documentType);
  return `${slugify(option.title)}-${slugify(params.companyName)}-v${params.version}.md`;
}
