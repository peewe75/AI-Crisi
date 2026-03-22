export const SOVRAINDEBITAMENTO_DOCUMENT_OPTIONS = [
  {
    value: "Parere_Strategico_Sovraindebitamento",
    title: "Genera Parere Strategico Sovraindebitamento",
    subtitle:
      "Analizza la situazione del debitore non fallibile, individua la procedura minore più adatta (Piano Consumatore, Concordato Minore, Liquidazione Controllata) e definisce la strategia difensiva.",
    sections: [
      "Sommario esecutivo",
      "Qualificazione del soggetto e presupposti soggettivi",
      "Analisi della situazione debitoria",
      "Procedura consigliata e motivazione",
      "Ruolo dell'OCC e documentazione necessaria",
      "Rischi e cautele operative",
      "Prossimi passi",
    ],
  },
  {
    value: "Ricorso_Piano_Consumatore",
    title: "Genera Ricorso Piano Ristrutturazione Debiti Consumatore",
    subtitle:
      "Redige il ricorso introduttivo per il piano di ristrutturazione dei debiti del consumatore (art. 67 CCII), comprensivo di relazione OCC, piano di pagamento e misure protettive.",
    sections: [
      "Intestazione e parti",
      "Presupposti soggettivi del consumatore",
      "Esposizione debitoria e patrimonio",
      "Proposta di piano e modalità di soddisfazione dei creditori",
      "Relazione OCC e documentazione allegata",
      "Richiesta misure protettive",
      "Conclusioni e richieste al Tribunale",
    ],
  },
  {
    value: "Ricorso_Concordato_Minore",
    title: "Genera Proposta Concordato Minore",
    subtitle:
      "Redige la proposta di concordato minore (art. 74 CCII) per soggetti non fallibili che esercitano attività di impresa o lavoro autonomo, con o senza continuità aziendale.",
    sections: [
      "Intestazione e parti",
      "Presupposti soggettivi",
      "Esposizione debitoria e attivo patrimoniale",
      "Contenuto della proposta concordataria",
      "Continuità o liquidazione dell'attività",
      "Relazione OCC",
      "Richiesta misure protettive e conclusioni",
    ],
  },
  {
    value: "Domanda_Liquidazione_Controllata",
    title: "Genera Domanda Liquidazione Controllata",
    subtitle:
      "Redige la domanda di apertura della liquidazione controllata (art. 268 CCII), procedura liquidatoria per soggetti sovraindebitati non fallibili.",
    sections: [
      "Intestazione e parti",
      "Presupposti soggettivi e oggettivi",
      "Situazione patrimoniale e debitoria",
      "Documentazione allegata (elenco creditori, inventario beni)",
      "Relazione OCC",
      "Richiesta di apertura e nomina liquidatore",
      "Misure protettive richieste",
    ],
  },
  {
    value: "Istanza_Misure_Protettive_Sovraindebitamento",
    title: "Genera Istanza Misure Protettive Sovraindebitamento",
    subtitle:
      "Redige l'istanza di sospensione delle procedure esecutive e divieto di nuove azioni cautelari nell'ambito delle procedure di sovraindebitamento (artt. 69-70, 76-78 CCII).",
    sections: [
      "Intestazione e parti",
      "Procedura in corso e stato della domanda",
      "Azioni esecutive pendenti",
      "Periculum in mora e fumus",
      "Richiesta di sospensione e divieto",
      "Conclusioni",
    ],
  },
  {
    value: "Istanza_Nomina_OCC",
    title: "Genera Istanza Nomina Gestore Crisi / OCC",
    subtitle:
      "Redige l'istanza di nomina del gestore della crisi presso il Presidente del Tribunale o direttamente all'Organismo di Composizione della Crisi (OCC) territorialmente competente.",
    sections: [
      "Intestazione e destinatario",
      "Identificazione del debitore e qualificazione",
      "Situazione debitoria sintetica",
      "Procedura che si intende attivare",
      "Richiesta di nomina e documentazione allegata",
    ],
  },
  {
    value: "Memoria_Integrativa_Sovraindebitamento",
    title: "Genera Memoria Integrativa / Difensiva",
    subtitle:
      "Predispone memorie integrative, difensive o di risposta a istanze di revoca dell'omologazione nelle procedure di sovraindebitamento (artt. 70, 72, 78, 82 CCII).",
    sections: [
      "Oggetto e riferimento procedurale",
      "Ricostruzione fattuale",
      "Contestazione dei motivi avversari",
      "Adempimenti e stato del piano",
      "Integrazioni documentali",
      "Conclusioni e richieste",
    ],
  },
  {
    value: "Ricorso_Esdebitazione_Incapiente",
    title: "Genera Ricorso Esdebitazione Debitore Incapiente",
    subtitle:
      "Redige il ricorso per l'esdebitazione del debitore incapiente (art. 283 CCII), istituto che consente la liberazione dai debiti al debitore persona fisica che non ha alcun attivo da liquidare.",
    sections: [
      "Intestazione e parti",
      "Presupposti soggettivi dell'incapienza",
      "Dimostrazione assenza attivo liquidabile",
      "Meritevolezza del debitore",
      "Documentazione allegata e relazione OCC",
      "Conclusioni e richiesta di esdebitazione",
    ],
  },
] as const;

export type SovraindebitamentoDocumentGenerationType =
  (typeof SOVRAINDEBITAMENTO_DOCUMENT_OPTIONS)[number]["value"];

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

export type AnyDocumentGenerationType =
  | DocumentGenerationType
  | SovraindebitamentoDocumentGenerationType;

export function isDocumentGenerationType(
  value: string
): value is DocumentGenerationType {
  return DOCUMENT_GENERATION_OPTIONS.some((option) => option.value === value);
}

export function isSovraindebitamentoDocumentGenerationType(
  value: string
): value is SovraindebitamentoDocumentGenerationType {
  return SOVRAINDEBITAMENTO_DOCUMENT_OPTIONS.some(
    (option) => option.value === value
  );
}

export function isAnyDocumentGenerationType(
  value: string
): value is AnyDocumentGenerationType {
  return (
    isDocumentGenerationType(value) ||
    isSovraindebitamentoDocumentGenerationType(value)
  );
}

export function getDocumentGenerationOption(value: DocumentGenerationType) {
  return (
    DOCUMENT_GENERATION_OPTIONS.find((option) => option.value === value) ??
    DOCUMENT_GENERATION_OPTIONS[0]
  );
}

export function getAnyDocumentGenerationOption(
  value: AnyDocumentGenerationType
) {
  const crisi = DOCUMENT_GENERATION_OPTIONS.find(
    (option) => option.value === value
  );
  if (crisi) return crisi;
  return (
    SOVRAINDEBITAMENTO_DOCUMENT_OPTIONS.find(
      (option) => option.value === value
    ) ?? SOVRAINDEBITAMENTO_DOCUMENT_OPTIONS[0]
  );
}

const SOVRAINDEBITAMENTO_TYPES = [
  "Piano Consumatore",
  "Concordato Minore",
  "Liquidazione Controllata",
  "Esdebitazione Incapiente",
] as const;

export function isSovraindebitamentoPractice(practiceType: string): boolean {
  return SOVRAINDEBITAMENTO_TYPES.includes(
    practiceType as (typeof SOVRAINDEBITAMENTO_TYPES)[number]
  );
}

export function getDocumentOptionsForPractice(practiceType: string) {
  return isSovraindebitamentoPractice(practiceType)
    ? SOVRAINDEBITAMENTO_DOCUMENT_OPTIONS
    : DOCUMENT_GENERATION_OPTIONS;
}

export function createGeneratedActTitle(params: {
  companyName: string;
  documentType: AnyDocumentGenerationType;
  version?: number;
}) {
  const option = getAnyDocumentGenerationOption(params.documentType);
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
  documentType: AnyDocumentGenerationType;
  version: number;
}) {
  const option = getAnyDocumentGenerationOption(params.documentType);
  return `${slugify(option.title)}-${slugify(params.companyName)}-v${params.version}.md`;
}
