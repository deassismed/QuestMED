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
  explanationTitle: string;
  videoId?: string;
};

const demoVideoId = "M7lc1UVf-VE";

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
    explanationTitle: "Congestão e insuficiência cardíaca",
    videoId: demoVideoId,
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
    explanationTitle: "Bronquiolite leve no lactente",
    videoId: demoVideoId,
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
    explanationTitle: "Hipertensão grave na gestação",
    videoId: demoVideoId,
  },
  {
    id: "CIR-0440",
    area: "Cirurgia",
    statement:
      "Homem de 38 anos apresenta dor em fossa ilíaca direita, náuseas e febre baixa há 18 horas. Exame mostra defesa localizada e leucocitose. Qual hipótese e conduta inicial são mais compatíveis?",
    options: [
      { id: "A", text: "Apendicite aguda; avaliação cirúrgica e preparo para tratamento definitivo." },
      { id: "B", text: "Síndrome do intestino irritável; alta com antiespasmódico." },
      { id: "C", text: "Pancreatite crônica; dieta livre e retorno se piora." },
      { id: "D", text: "Litíase renal sem dor; apenas hidratação oral." },
    ],
    correctOptionId: "A",
    hint: "Dor migratória ou localizada em fossa ilíaca direita com defesa sugere abdome agudo inflamatório.",
    statistics: { A: 76, B: 8, C: 5, D: 11 },
    explanationTitle: "Apendicite aguda",
    videoId: demoVideoId,
  },
  {
    id: "MP-0506",
    area: "Medicina Preventiva",
    statement:
      "Uma unidade de saúde identifica baixa cobertura vacinal em crianças menores de 1 ano. Qual ação é mais alinhada à atenção primária?",
    options: [
      { id: "A", text: "Aguardar procura espontânea sem busca ativa." },
      { id: "B", text: "Realizar busca ativa, revisar cartões e organizar vacinação de faltosos." },
      { id: "C", text: "Suspender vacinação até nova campanha nacional." },
      { id: "D", text: "Encaminhar todas as crianças para hospital terciário." },
    ],
    correctOptionId: "B",
    hint: "Cobertura vacinal é indicador clássico para atuação territorial e busca ativa.",
    statistics: { A: 6, B: 84, C: 4, D: 6 },
    explanationTitle: "Busca ativa e cobertura vacinal",
    videoId: demoVideoId,
  },
  {
    id: "CM-0617",
    area: "Clínica Médica",
    statement:
      "Paciente com dor torácica opressiva há 50 minutos apresenta supradesnivelamento do segmento ST em derivações inferiores. Qual conduta tem maior impacto prognóstico imediato?",
    options: [
      { id: "A", text: "Agendar teste ergométrico ambulatorial." },
      { id: "B", text: "Iniciar reperfusão conforme disponibilidade e tempo de atendimento." },
      { id: "C", text: "Repetir eletrocardiograma em 24 horas antes de qualquer conduta." },
      { id: "D", text: "Tratar como ansiedade sem investigação adicional." },
    ],
    correctOptionId: "B",
    hint: "No infarto com supra, tempo até reperfusão muda mortalidade.",
    statistics: { A: 5, B: 86, C: 6, D: 3 },
    explanationTitle: "IAM com supradesnivelamento",
    videoId: demoVideoId,
  },
  {
    id: "PED-0722",
    area: "Pediatria",
    statement:
      "Criança de 4 anos chega sonolenta, com vômitos, desidratação e glicemia capilar de 420 mg/dL. Há respiração profunda e cetonúria. Qual diagnóstico deve guiar o manejo inicial?",
    options: [
      { id: "A", text: "Cetoacidose diabética." },
      { id: "B", text: "Hipoglicemia por jejum." },
      { id: "C", text: "Crise convulsiva febril simples." },
      { id: "D", text: "Rinite alérgica persistente." },
    ],
    correctOptionId: "A",
    hint: "Hiperglicemia, cetonúria, desidratação e respiração profunda apontam para acidose metabólica.",
    statistics: { A: 79, B: 9, C: 7, D: 5 },
    explanationTitle: "Cetoacidose diabética pediátrica",
    videoId: demoVideoId,
  },
  {
    id: "GO-0833",
    area: "Ginecologia e Obstetrícia",
    statement:
      "Mulher de 27 anos relata atraso menstrual, dor pélvica unilateral e sangramento vaginal discreto. Está hipotensa e com dor à descompressão brusca. Qual hipótese exige ação imediata?",
    options: [
      { id: "A", text: "Dismenorreia primária sem sinais de gravidade." },
      { id: "B", text: "Gestação ectópica rota." },
      { id: "C", text: "Vaginose bacteriana não complicada." },
      { id: "D", text: "Síndrome pré-menstrual." },
    ],
    correctOptionId: "B",
    hint: "Atraso menstrual, dor unilateral e instabilidade hemodinâmica indicam emergência.",
    statistics: { A: 5, B: 88, C: 4, D: 3 },
    explanationTitle: "Gestação ectópica rota",
    videoId: demoVideoId,
  },
  {
    id: "CIR-0944",
    area: "Cirurgia",
    statement:
      "Paciente politraumatizado chega com via aérea pérvia, murmúrio vesicular reduzido à esquerda, hipotensão e desvio de traqueia. Qual intervenção não deve ser adiada?",
    options: [
      { id: "A", text: "Tomografia de tórax antes de qualquer procedimento." },
      { id: "B", text: "Descompressão imediata por suspeita de pneumotórax hipertensivo." },
      { id: "C", text: "Radiografia eletiva no dia seguinte." },
      { id: "D", text: "Alta com analgésico oral." },
    ],
    correctOptionId: "B",
    hint: "Instabilidade, desvio traqueal e redução do murmúrio sugerem diagnóstico clínico que não espera imagem.",
    statistics: { A: 10, B: 82, C: 4, D: 4 },
    explanationTitle: "Pneumotórax hipertensivo",
    videoId: demoVideoId,
  },
  {
    id: "MP-1010",
    area: "Medicina Preventiva",
    statement:
      "Em estudo de coorte, pesquisadores acompanham expostos e não expostos a um fator de risco para observar a incidência de uma doença. Qual medida de associação é mais apropriada?",
    options: [
      { id: "A", text: "Razão de prevalências apenas." },
      { id: "B", text: "Risco relativo." },
      { id: "C", text: "Sensibilidade do teste." },
      { id: "D", text: "Valor preditivo negativo." },
    ],
    correctOptionId: "B",
    hint: "Coortes acompanham incidência em grupos expostos e não expostos.",
    statistics: { A: 14, B: 72, C: 8, D: 6 },
    explanationTitle: "Risco relativo em coortes",
    videoId: demoVideoId,
  },
];
