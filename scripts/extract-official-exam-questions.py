from __future__ import annotations

import json
import re
import sys
import unicodedata
from dataclasses import dataclass
from pathlib import Path

from pypdf import PdfReader


SOURCE_DIR = Path(r"C:\Users\PC\Downloads\Telegram Desktop\Provas medicina")
ROOT_DIR = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT_DIR / "src" / "data" / "imports"
OUTPUT_JSON = OUTPUT_DIR / "official-exam-question-bank.json"
OUTPUT_REPORT = OUTPUT_DIR / "official-exam-import-report.json"


EXAMS = [
    ("ENAMED 2025", "ENAMED 2025.pdf", "ENAMED 2025 Gabarito.pdf"),
    ("ENARE 2024", "ENARE 2024.pdf", "ENARE 2024 Gabarito.pdf"),
    ("Revalida 23.1", "Revalida 23.1.pdf", "Revalida 23.1 Gabarito.pdf"),
    ("Revalida 23.2", "Revalida 23.2.pdf", "Revalida 23.2 Gabarito.pdf"),
    ("Revalida 24.1", "Revalida 24.1.pdf", "Revalida 24.1 Gabarito.pdf"),
    ("Revalida 24.2", "Revalida 24.2.pdf", "Revalida 24.2 Gabarito.pdf"),
    ("Revalida 25.1", "Revalida 25.1.pdf", "Revalida 25.1 Gabarito.pdf"),
    ("Revalida 25.2", "Revalida 25.2.pdf", "Revalida 25.2 Gabarito.pdf"),
]


@dataclass
class ParsedQuestion:
    number: int
    statement: str
    options: dict[str, str]
    has_image: bool


def strip_accents(value: str) -> str:
    return "".join(
        char for char in unicodedata.normalize("NFD", value) if unicodedata.category(char) != "Mn"
    )


def read_pdf_text(path: Path) -> str:
    reader = PdfReader(str(path))
    pages = []
    for page in reader.pages:
        pages.append(page.extract_text() or "")
    return clean_text("\n".join(pages))


def clean_text(text: str) -> str:
    text = text.replace("\uf0fc", "").replace("\uf058", "")
    text = text.replace("\u00a0", " ")
    text = text.replace("—", "-").replace("–", "-").replace("̶", "-")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def compact_text(text: str) -> str:
    lines = [line.strip() for line in text.splitlines()]
    lines = [line for line in lines if line and line.upper() != "ÁREA LIVRE"]
    text = " ".join(lines)
    return re.sub(r"\s+", " ", text).strip()


def slug(value: str) -> str:
    value = strip_accents(value.lower())
    value = re.sub(r"[^a-z0-9]+", "-", value).strip("-")
    return value


def looks_like_image_question(text: str) -> bool:
    normalized = strip_accents(text.lower())
    image_terms = [
        "eletrocardiograma",
        "imagem",
        "figura",
        "grafico",
        "radiografia",
        "tomografia",
        "ressonancia",
        "ultrassonografia",
        "foto",
        "lesao apresentada",
        "exame a seguir",
        "imagem a seguir",
    ]
    return any(term in normalized for term in image_terms)


def parse_answers(exam_name: str, text: str) -> dict[int, str]:
    normalized = strip_accents(text)
    if "ENARE" in exam_name:
        section_match = re.search(
            r"Acesso Direto\s*-\s*TIPO 1(?P<section>.*?)(?:Acesso Direto\s*-\s*TIPO 2|Ano Adicional|\Z)",
            normalized,
            flags=re.I | re.S,
        )
        section = section_match.group("section") if section_match else normalized
        return parse_number_answer_rows(section)

    return parse_number_answer_rows(normalized)


def parse_number_answer_rows(text: str) -> dict[int, str]:
    answers: dict[int, str] = {}
    for number, answer in re.findall(
        r"\b(\d{1,3})\s+(A|B|C|D|E|Anulada|[*-])\b", text, flags=re.I
    ):
        normalized_answer = answer.upper()
        answers[int(number)] = "-" if normalized_answer in {"ANULADA", "*", "-"} else normalized_answer

    lines = [line.strip() for line in text.splitlines() if line.strip()]
    for index, line in enumerate(lines):
        line_numbers = [int(value) for value in re.findall(r"\b\d{1,3}\b", line)]
        if not re.search(r"\b(?:Questao|Gabarito|1\s+2\s+3)\b", line, flags=re.I) and len(line_numbers) < 5:
            continue

        number_line = re.sub(r"(?i)\bQuestao\b", "", line)
        numbers = [int(value) for value in re.findall(r"\b\d{1,3}\b", number_line)]
        if not numbers and index + 1 < len(lines):
            numbers = [int(value) for value in re.findall(r"\b\d{1,3}\b", lines[index + 1])]

        answer_line = ""
        if re.search(r"(?i)\bGabarito\b", line):
            answer_line = re.sub(r"(?i)\bGabarito\b", "", line)
        elif index + 1 < len(lines) and re.search(r"(?i)\bGabarito\b", lines[index + 1]):
            answer_line = re.sub(r"(?i)\bGabarito\b", "", lines[index + 1])
        elif index + 1 < len(lines) and re.fullmatch(r"(?:[A-E*-]\s*)+", lines[index + 1]):
            answer_line = lines[index + 1]
        elif index + 2 < len(lines) and re.fullmatch(r"(?:[A-E*-]\s*)+", lines[index + 2]):
            answer_line = lines[index + 2]

        letters = re.findall(r"\b[A-E]\b|[*-]", answer_line)
        if numbers and len(letters) >= len(numbers):
            for number, letter in zip(numbers, letters):
                answers[number] = "-" if letter in {"*", "-"} else letter

    return answers


def split_question_blocks(text: str) -> list[tuple[int, str]]:
    question_matches = list(
        re.finditer(r"(?im)^\s*QUEST[AÃ]O\s+(\d{1,3})\b", text)
    )
    if question_matches:
        blocks = []
        for index, match in enumerate(question_matches):
            number = int(match.group(1))
            end = question_matches[index + 1].start() if index + 1 < len(question_matches) else len(text)
            blocks.append((number, text[match.end() : end]))
        return blocks

    number_matches = list(re.finditer(r"(?m)^\s*(\d{1,3})\s*$", text))
    blocks = []
    for index, match in enumerate(number_matches):
        number = int(match.group(1))
        if number < 1 or number > 120:
            continue
        end = number_matches[index + 1].start() if index + 1 < len(number_matches) else len(text)
        block = text[match.end() : end]
        if re.search(r"(?m)^\s*\(?A\)?\s+", block) and re.search(r"(?m)^\s*\(?D\)?\s+", block):
            blocks.append((number, block))
    return blocks


OPTION_RE = re.compile(r"(?m)^\s*(?:\(([A-E])\)|([A-E]))\s+")


def parse_question_block(number: int, block: str) -> ParsedQuestion | None:
    matches = list(OPTION_RE.finditer(block))
    if not matches:
        return None

    candidates: list[list[re.Match[str]]] = []
    for start_index, match in enumerate(matches):
        if (match.group(1) or match.group(2)) != "A":
            continue
        sequence = [match]
        expected = "B"
        for next_match in matches[start_index + 1 :]:
            letter = next_match.group(1) or next_match.group(2)
            if letter == expected:
                sequence.append(next_match)
                expected = chr(ord(expected) + 1)
                if expected == "F":
                    break
        if len(sequence) >= 4:
            candidates.append(sequence)

    if not candidates:
        return None

    option_matches = candidates[-1]
    statement = compact_text(block[: option_matches[0].start()])
    options: dict[str, str] = {}
    for index, match in enumerate(option_matches):
        letter = match.group(1) or match.group(2)
        end = option_matches[index + 1].start() if index + 1 < len(option_matches) else len(block)
        options[letter] = compact_text(block[match.end() : end])

    if len(options) < 4 or not statement:
        return None

    return ParsedQuestion(
        number=number,
        statement=statement,
        options=options,
        has_image=looks_like_image_question(statement),
    )


def normalize_options(options: dict[str, str], correct: str) -> tuple[dict[str, str], str] | None:
    if correct in {"-", "*"}:
        return None

    if len(options) >= 5:
        if correct == "E":
            kept = {key: options[key] for key in ["A", "B", "C"] if key in options}
            kept["D"] = options["E"]
            return kept, "D"
        return {key: options[key] for key in ["A", "B", "C", "D"] if key in options}, correct

    kept = {key: options[key] for key in ["A", "B", "C", "D"] if key in options}
    if correct not in kept:
        return None
    return kept, correct


def build_question(exam_name: str, parsed: ParsedQuestion, correct: str) -> dict | None:
    normalized = normalize_options(parsed.options, correct)
    if normalized is None:
        return None
    options, corrected_answer = normalized
    if len(options) != 4:
        return None

    statistics = {letter: 10 for letter in ["A", "B", "C", "D"]}
    statistics[corrected_answer] = 70
    return {
        "id": f"oficial.{slug(exam_name)}.q{parsed.number:03d}",
        "area": "Provas oficiais",
        "Tema": exam_name,
        "source": exam_name,
        "sourceQuestionNumber": parsed.number,
        "statement": parsed.statement,
        "options": [{"id": letter, "text": options[letter]} for letter in ["A", "B", "C", "D"]],
        "correctOptionId": corrected_answer,
        "hint": "",
        "statistics": statistics,
        "explanationTitle": exam_name,
        "explanation": "",
        "metadata": {
            "hasImageMention": parsed.has_image,
            "originalOptionCount": len(parsed.options),
            "answerWasRelabeledFromE": correct == "E",
        },
    }


def main() -> int:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    all_questions = []
    report = []

    for exam_name, exam_file, answer_file in EXAMS:
        exam_path = SOURCE_DIR / exam_file
        answer_path = SOURCE_DIR / answer_file
        exam_text = read_pdf_text(exam_path)
        answer_text = read_pdf_text(answer_path)
        answers = parse_answers(exam_name, answer_text)
        blocks = split_question_blocks(exam_text)

        parsed_questions = []
        failures = []
        skipped_annulled = []
        seen_numbers = set()
        for number, block in blocks:
            if number in seen_numbers:
                continue
            seen_numbers.add(number)
            parsed = parse_question_block(number, block)
            if parsed is None:
                failures.append(number)
                continue
            correct = answers.get(number)
            if correct in {"-", "*"}:
                skipped_annulled.append(number)
                continue
            if not correct:
                failures.append(number)
                continue
            question = build_question(exam_name, parsed, correct)
            if question is None:
                failures.append(number)
                continue
            parsed_questions.append(question)

        all_questions.extend(parsed_questions)
        report.append(
            {
                "exam": exam_name,
                "examFile": str(exam_path),
                "answerFile": str(answer_path),
                "answerCount": len(answers),
                "questionBlocksFound": len(blocks),
                "questionsImported": len(parsed_questions),
                "questionsWithImageMention": sum(
                    1 for question in parsed_questions if question["metadata"]["hasImageMention"]
                ),
                "skippedAnnulled": skipped_annulled,
                "failedQuestionNumbers": failures,
            }
        )

    OUTPUT_JSON.write_text(json.dumps(all_questions, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    OUTPUT_REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {len(all_questions)} questions to {OUTPUT_JSON}")
    print(f"Wrote report to {OUTPUT_REPORT}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
