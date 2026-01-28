// pages/api/calculate.js
import formidable from 'formidable';
import xlsx from 'xlsx';
import fs from 'fs';

export const config = {
  api: { bodyParser: false }
};

const CRITERIA = {
  1: { keywords: ["сотрудничества", "сотворчества"], weight: 1.4 },
  2: { keywords: ["самостоятельности", "инициативности"], weight: 1.3 },
  3: { keywords: ["креативности"], weight: 1.0 },
  4: { keywords: ["планирование"], weight: 0.9 },
  5: { keywords: ["уверенности"], weight: 0.8 }
};

const TEAM_PATTERN = /команды\s+([A-ZА-Я0-9]+)/i;

function extractTeamCode(sheet) {
  const range = xlsx.utils.decode_range(sheet['!ref']);
  for (let R = range.s.r; R <= range.e.r; R++) {
    for (let C = range.s.c; C <= range.e.c; C++) {
      const cell = sheet[xlsx.utils.encode_cell({ r: R, c: C })];
      if (cell?.v) {
        const match = String(cell.v).match(TEAM_PATTERN);
        if (match) return match[1];
      }
    }
  }
  return null;
}

function findCriteriaColumns(data) {
  const headers = data[0];
  const found = {};
  headers.forEach((h, idx) => {
    const lower = String(h).toLowerCase();
    Object.entries(CRITERIA).forEach(([k, { keywords }]) => {
      if (keywords.some(kw => lower.includes(kw))) found[k] = idx;
    });
  });
  return found;
}

function filterExpertRows(data, critCols) {
  return data.slice(1).filter(row => 
    Object.values(critCols).every(idx => 
      !isNaN(parseFloat(row[idx]))
    )
  ).slice(0, 2);
}

function assignPlace(idx, total) {
  if (idx < 2 && total >= 2) return "Гран-при";
  if (idx < 4 && total >= 4) return "1 место";
  if (idx < 6 && total >= 6) return "2 место";
  if (idx < 8 && total >= 8) return "3 место";
  return "Участник";
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const form = formidable({ multiples: true });
  
  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(500).json({ error: err.message });

    const fileArray = Array.isArray(files.files) ? files.files : [files.files];
    const results = [];

    try {
      for (const file of fileArray) {
        const buffer = fs.readFileSync(file.filepath);
        const workbook = xlsx.read(buffer);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        
        const teamCode = extractTeamCode(sheet);
        if (!teamCode) throw new Error(`Шифр не найден: ${file.originalFilename}`);

        const data = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: "" });
        const critCols = findCriteriaColumns(data);
        if (Object.keys(critCols).length !== 5) throw new Error(`Критериев ${Object.keys(critCols).length} вместо 5`);

        const expertRows = filterExpertRows(data, critCols);
        if (expertRows.length < 2) throw new Error(`Мало экспертов в ${file.originalFilename}`);

        const row = { Команда: teamCode, Итог: 0 };
        
        for (let k = 1; k <= 5; k++) {
          const sum = expertRows.reduce((acc, r) => acc + parseFloat(r[critCols[k]]), 0);
          const weighted = sum * CRITERIA[k].weight;
          row[`К${k}`] = parseFloat(weighted.toFixed(1));
          row.Итог += weighted;
        }
        
        row.Итог = parseFloat(row.Итог.toFixed(1));
        row.К1_К2 = parseFloat((row.К1 + row.К2).toFixed(1));
        results.push(row);
      }

      results.sort((a, b) => b.Итог - a.Итог || b.К1_К2 - a.К1_К2);
      results.forEach((r, i) => r.Место = assignPlace(i, results.length));

      res.status(200).json({ results });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
}
