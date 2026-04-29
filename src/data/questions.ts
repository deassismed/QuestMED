export type Area =
  | "Clínica Médica"
  | "Cirurgia"
  | "Pediatria"
  | "Ginecologia e Obstetrícia"
  | "Medicina Preventiva";

export type Option = {
  id: "A" | "B" | "C" | "D";
  text: string;
};

export type Question = {
  id: string;
  area: Area;
  statement: string;
  options: Option[];
  correctOptionId: Option["id"];
  hint: string;
  statistics: Record<Option["id"], number>;
};

export const dailyQuestions: Question[] = [
  {
    id: "CM-0142",
    area: "Clínica Médica",
    statement:
      "Um paciente de 62 anos, hipertenso e diabético, procura atendimento por dispneia progressiva e edema de membros inferiores. Ao exame, apresenta turgência jugular, crepitações bibasais e terceira bulha. Qual conduta inicial é mais adequada?",
    options: [
      { id: "A", text: "Iniciar diurético de alça e otimizar investigação de insuficiência cardíaca." },
      { id: "B", text: "Prescrever antibiótico para pneumonia comunitária sem exames adicionais." },
      { id: "C", text: "Solicitar apenas controle ambulatorial em seis meses." },
      { id: "D", text: "Suspender todos os anti-hipertensivos imediatamente." },
    ],
    correctOptionId: "A",
    hint: "Observe os sinais de congestão sistêmica e pulmonar associados a terceira bulha.",
    statistics: { A: 68, B: 14, C: 6, D: 12 },
  },
  {
    id: "PED-0208",
    area: "Pediatria",
    statement:
      "Lactente de 9 meses apresenta febre, tosse e sibilância difusa há dois dias. Está hidratado, com saturação de 96% em ar ambiente e sem tiragens importantes. Qual é a abordagem mais indicada?",
    options: [
      { id: "A", text: "Internação imediata em UTI pediátrica." },
      { id: "B", text: "Tratamento de suporte, orientação familiar e reavaliação se houver piora." },
      { id: "C", text: "Corticosteroide sistêmico obrigatório por sete dias." },
      { id: "D", text: "Antibioticoterapia empírica para bronquiolite viral." },
    ],
    correctOptionId: "B",
    hint: "Em quadros leves, a prioridade é suporte e sinais de alarme.",
    statistics: { A: 9, B: 73, C: 11, D: 7 },
  },
  {
    id: "GO-0311",
    area: "Ginecologia e Obstetrícia",
    statement:
      "Gestante de 30 semanas chega ao pronto atendimento com pressão arterial de 164/108 mmHg em duas medidas e cefaleia intensa. Qual deve ser a prioridade no manejo inicial?",
    options: [
      { id: "A", text: "Aguardar consulta de pré-natal de rotina." },
      { id: "B", text: "Indicar alta com dieta hipossódica exclusiva." },
      { id: "C", text: "Controlar pressão grave e avaliar sinais de pré-eclâmpsia com gravidade." },
      { id: "D", text: "Solicitar teste oral de tolerância à glicose." },
    ],
    correctOptionId: "C",
    hint: "Pressão em faixa grave na gestação exige ação imediata e avaliação de gravidade.",
    statistics: { A: 4, B: 8, C: 81, D: 7 },
  },
];
