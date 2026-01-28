import formidable from "formidable";
import xlsx from "xlsx";

export const config = {
  api: { bodyParser: false },
};

const CRITERIA = {
  1: { keywords: ["сотрудничества", "сотворчества"], weight: 1.4 },
  2: { keywords: ["самостоятельности", "инициативности"], weight: 1.3 },
  3: { keywords: ["креативности"], weight: 1.0 },
  4: { keywords: ["планирование"], weight: 0.9 },
  5: { keywords: ["уверенности"], weight: 0.8 },
};

const TEAM_PATTERN = /команды\s+([A-ZА-Я0-9]+)/i;

// ===================== ВСПОМОГАТЕЛЬНЫЕ =====================

function extractTeamCode(sheet) {
  const range = xlsx.utils.decode_range(sheet["!ref"]);
  for (let r = range.s.r; r <= range.e.r; r++) {
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = sheet[xlsx.utils.encode_cell({ r, c })];
      if (cell?.v) {
        const m = String(cell.v).match(TEAM_PATTERN);
        if (m) return m[1];
      }
    }
  }
  return null;
}

function findCriteriaColumns(data) {
  const found = {};
  data.forEach((row) => {
    row.forEach((cell, idx) => {
      const text = String(cell).toLowerCase();
      Object.entries(CRITERIA).forEach(([k, { keywords }]) => {
        if (keywords.some((kw) => text.includes(kw))) {
          found[k] = idx;
        }
      });
    });
  });
  return found;
}

function filterExpertRows(data, critCols) {
  return data.filter((row) =>
    Object.values(critCols).every((idx) => !isNaN(parseFloat(row[idx])))
  ).slice(0, 2);
}

function assignPlace(idx) {
  if (idx <= 1) return "Гран-при";
  if (idx <= 4) return "1 место";
  if (idx <= 9) return "2 место";
  return "3 место";
}

// ===================== API =====================

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const form = formidable({ multiples: true });

  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(500).json({ error: err.message });

    const uploaded = Array.isArray(files.files)
      ? files.files
      : [files.files];

    try {
      const results = [];

      for (const file of uploaded) {
        const buffer = await file.toBuffer();
        const workbook = xlsx.read(buffer, { type: "buffer" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];

        const teamCode = extractTeamCode(sheet);
        if (!teamCode) throw new Error("Шифр команды не найден");

        const data = xlsx.utils.sheet_to_json(sheet, {
          header: 1,
          defval: "",
        });

        const critCols = findCriteriaColumns(data);
        if (Object.keys(critCols).length !== 5)
          throw new Error("Не найдены все критерии");

        const expertRows = filterExpertRows(data, critCols);
        if (expertRows.length < 2)
          throw new Error("Недостаточно экспертных строк");

        const row = { Команда: teamCode, Итог: 0 };

        for (let k = 1; k <= 5; k++) {
          const sum = expertRows.reduce(
            (acc, r) => acc + parseFloat(r[critCols[k]]),
            0
          );
          const weighted = sum * CRITERIA[k].weight;
          row[`К${k}`] = Number(weighted.toFixed(1));
          row.Итог += weighted;
        }

        row.Итог = Number(row.Итог.toFixed(1));
        row.К1_К2 = Number((row.К1 + row.К2).toFixed(1));

        results.push(row);
      }

      results.sort(
        (a, b) => b.Итог - a.Итог || b.К1_К2 - a.К1_К2
      );

      results.forEach((r, i) => (r.Место = assignPlace(i)));

      res.status(200).json({ results });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });
}
