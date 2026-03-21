import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { embed } from "ai";
import { google } from "@ai-sdk/google";

function loadEnv() {
  const envPath = path.join(process.cwd(), ".env.local");
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf("=");
    process.env[line.slice(0, idx)] = line.slice(idx + 1);
  }
}

loadEnv();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { persistSession: false, autoRefreshToken: false },
  }
);

const seedEntries = [
  {
    title: "CCII - Composizione negoziata: finalità e presupposti operativi",
    category: "Normativa",
    metadata: {
      source_url: "https://www.giustizia.it/giustizia/page/en/crisi_di_impresa",
      source_type: "ministeriale",
      tags: ["CCII", "composizione negoziata", "risanamento"],
    },
    content:
      "Sintesi operativa della disciplina della composizione negoziata nel Codice della crisi: l'istituto è pensato per l'emersione anticipata della crisi e per la ricerca assistita di soluzioni di risanamento, con focus sulla continuità aziendale e sulla praticabilità del piano. È rilevante quando l'impresa manifesta squilibri patrimoniali, economici o finanziari recuperabili con strumenti di riequilibrio e con il supporto dell'esperto indipendente.",
  },
  {
    title: "CCII - Accesso alla composizione negoziata e ruolo dell'esperto",
    category: "Normativa",
    metadata: {
      source_url: "https://www.giustizia.it/giustizia/page/en/crisi_di_impresa",
      source_type: "ministeriale",
      tags: ["esperto", "istanza", "piattaforma"],
    },
    content:
      "La procedura ruota attorno all'istanza dell'imprenditore e all'intervento di un esperto indipendente selezionato tramite gli strumenti predisposti dal sistema pubblico. L'esperto facilita le trattative, valuta la ragionevole perseguibilità del risanamento e presidia il corretto svolgimento del confronto con i creditori, senza sostituirsi agli organi gestori nelle scelte aziendali.",
  },
  {
    title: "CCII - Misure protettive e cautelari nella composizione negoziata",
    category: "Normativa",
    metadata: {
      source_url: "https://www.giustizia.it/giustizia/page/en/crisi_di_impresa",
      source_type: "ministeriale",
      tags: ["misure protettive", "tribunale", "urgenza"],
    },
    content:
      "Le misure protettive servono a sterilizzare, per un tempo limitato e sotto controllo giudiziale, le iniziative esecutive o cautelari che potrebbero compromettere il tavolo di risanamento. Nella redazione del ricorso è decisivo descrivere la crisi, il programma di ristrutturazione, la funzionalità delle misure rispetto alle trattative e l'assenza di un uso dilatorio dello strumento.",
  },
  {
    title: "CCII - Procedimento giudiziale di conferma, modifica e revoca delle misure",
    category: "Normativa",
    metadata: {
      source_url: "https://www.giustizia.it/giustizia/page/en/crisi_di_impresa",
      source_type: "ministeriale",
      tags: ["udienza", "conferma", "revoca"],
    },
    content:
      "Nel procedimento davanti al tribunale, la conferma delle misure richiede allegazioni aggiornate sulla serietà delle trattative, sulla proporzionalità della protezione richiesta e sul pregiudizio che deriverebbe dall'aggressione individuale dei creditori. La tenuta dell'istanza dipende dalla coerenza tra documentazione aziendale, piano di risanamento e cronoprogramma delle interlocuzioni con i creditori principali.",
  },
  {
    title: "Ministero della Giustizia 2024 - strumenti attuativi e piattaforma della composizione negoziata",
    category: "Prassi",
    metadata: {
      source_url: "https://www.giustizia.it/giustizia/page/en/crisi_di_impresa",
      source_type: "ministeriale",
      updated_at: "2024-12-10",
      tags: ["piattaforma", "checklist", "documento pratico"],
    },
    content:
      "La scheda ministeriale aggiornata a dicembre 2024 evidenzia che la composizione negoziata deve essere supportata da documenti standardizzati, check-list di risanamento e strumenti informatici che aiutano a verificare la sostenibilità del debito e la ragionevole perseguibilità del piano. In ottica difensiva, è utile richiamare l'allineamento tra i documenti depositati e gli standard attuativi ministeriali per rafforzare la credibilità della domanda.",
  },
  {
    title: "Prassi giudiziale 2025 - criteri ricorrenti per la tutela protettiva",
    category: "Giurisprudenza",
    metadata: {
      source_url: "https://www.tribunale.cosenza.giustizia.it/decreti-di-fissazione-delle-udienze_145.html",
      source_type: "giurisprudenza_di_merito",
      note: "Sintesi inferenziale ricavata da prassi pubblicata su siti giudiziari",
      tags: ["prassi tribunali", "misure protettive", "merito"],
    },
    content:
      "Dalla prassi di merito pubblicata dai tribunali emerge una linea ricorrente: le misure protettive vengono trattate favorevolmente quando il fascicolo offre dati aziendali aggiornati, un quadro credibile delle esposizioni, un percorso di risanamento non meramente esplorativo e segnali concreti di interlocuzione con i creditori. Le istanze deboli sono invece quelle prive di numeri verificabili o di collegamento puntuale tra protezione richiesta e utilità per il risanamento.",
  },
];

const existingTitlesResult = await supabase
  .from("knowledge_base")
  .select("title")
  .in(
    "title",
    seedEntries.map((entry) => entry.title)
  );

if (existingTitlesResult.error) {
  throw new Error(
    `Verifica knowledge_base fallita: ${existingTitlesResult.error.message}`
  );
}

const existingTitles = new Set(
  (existingTitlesResult.data ?? []).map((row) => row.title)
);
const entriesToInsert = seedEntries.filter(
  (entry) => !existingTitles.has(entry.title)
);

for (const entry of entriesToInsert) {
  const { embedding } = await embed({
    model: google.embedding("gemini-embedding-001"),
    value: `${entry.title}\n\n${entry.content}`,
    providerOptions: {
      google: {
        outputDimensionality: 768,
        taskType: "RETRIEVAL_DOCUMENT",
      },
    },
  });

  if (embedding.length !== 768) {
    throw new Error(
      `Embedding non valido per "${entry.title}": ${embedding.length}`
    );
  }

  const { error } = await supabase.from("knowledge_base").insert({
    title: entry.title,
    content: entry.content,
    category: entry.category,
    metadata: entry.metadata,
    embedding,
  });

  if (error) {
    throw new Error(`Insert knowledge_base fallita: ${error.message}`);
  }

  console.log(`[ok] seeded: ${entry.title}`);
}

if (entriesToInsert.length === 0) {
  console.log("[ok] knowledge_base gia popolata con i seed iniziali");
}
