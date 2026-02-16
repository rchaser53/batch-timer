function genId() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function usePropertyRows() {
  function makeBlankRow() {
    return {
      id: genId(),
      key: '',
      type: 'string',
      value: '',
      jsonText: '',
      error: '',
    };
  }

  function detectType(v) {
    if (v === null) return 'null';
    if (Array.isArray(v)) return 'array';
    const t = typeof v;
    if (t === 'string' || t === 'number' || t === 'boolean') return t;
    return 'object';
  }

  function objectToRows(obj) {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return [];
    return Object.keys(obj)
      .sort((a, b) => a.localeCompare(b))
      .map((key) => {
        const value = obj[key];
        const type = detectType(value);
        const row = {
          id: genId(),
          key,
          type,
          value: null,
          jsonText: '',
          error: '',
        };

        if (type === 'object' || type === 'array') {
          row.value = value;
          row.jsonText = JSON.stringify(value, null, 2);
        } else {
          row.value = type === 'number' ? String(value) : value;
        }
        return row;
      });
  }

  function normalizeRowValueForType(row) {
    row.error = '';
    if (row.type === 'string') {
      row.value = row.value ?? '';
    } else if (row.type === 'number') {
      row.value = row.value === undefined || row.value === null ? '' : String(row.value);
    } else if (row.type === 'boolean') {
      row.value = row.value === true;
    } else if (row.type === 'null') {
      row.value = null;
    } else if (row.type === 'object') {
      const base = row.value && typeof row.value === 'object' && !Array.isArray(row.value) ? row.value : {};
      row.value = base;
      row.jsonText = JSON.stringify(base, null, 2);
    } else if (row.type === 'array') {
      const base = Array.isArray(row.value) ? row.value : [];
      row.value = base;
      row.jsonText = JSON.stringify(base, null, 2);
    }
  }

  function parseJsonTextForRow(row) {
    row.error = '';
    try {
      const parsed = row.jsonText ? JSON.parse(row.jsonText) : row.type === 'array' ? [] : {};
      if (row.type === 'array' && !Array.isArray(parsed)) {
        row.error = 'array型なので、JSON配列（[]）を入力してください';
        return;
      }
      if (row.type === 'object' && (parsed === null || Array.isArray(parsed) || typeof parsed !== 'object')) {
        row.error = 'object型なので、JSONオブジェクト（{}）を入力してください';
        return;
      }
      row.value = parsed;
    } catch {
      row.error = 'JSONの形式が不正です';
    }
  }

  function isBlankRow(row) {
    const key = String(row?.key || '').trim();
    if (key) return false;

    if (row?.type === 'object' || row?.type === 'array') {
      return false;
    }
    if (row?.type === 'null') return true;
    if (row?.type === 'boolean') return true;

    const v = row?.value;
    return v === '' || v === null || v === undefined;
  }

  function buildObjectFromRowsRef(rowsRef, errorRef, { strict, skipBlankRows } = { strict: true, skipBlankRows: false }) {
    errorRef.value = '';
    let hasError = false;
    const obj = {};
    const seen = new Set();

    for (const row of rowsRef.value) {
      if (skipBlankRows && isBlankRow(row)) continue;

      row.error = row.error || '';
      const key = String(row.key || '').trim();
      if (!key) {
        row.error = row.error || 'キーが空です';
        hasError = true;
        continue;
      }
      if (seen.has(key)) {
        row.error = row.error || 'キーが重複しています';
        hasError = true;
        continue;
      }
      seen.add(key);

      if (row.type === 'string') {
        obj[key] = row.value ?? '';
      } else if (row.type === 'number') {
        const n = Number(row.value);
        if (Number.isNaN(n)) {
          row.error = row.error || 'number型なので数値を入力してください';
          hasError = true;
          continue;
        }
        obj[key] = n;
      } else if (row.type === 'boolean') {
        obj[key] = row.value === true;
      } else if (row.type === 'null') {
        obj[key] = null;
      } else if (row.type === 'object' || row.type === 'array') {
        if (row.error) {
          hasError = true;
          continue;
        }
        obj[key] = row.value;
      }
    }

    if (hasError && strict) {
      errorRef.value = '入力にエラーがあります（赤字の行を修正してください）';
      return { ok: false, errorMessage: errorRef.value, data: null };
    }

    return { ok: true, data: obj, errorMessage: '' };
  }

  return {
    makeBlankRow,
    objectToRows,
    normalizeRowValueForType,
    parseJsonTextForRow,
    buildObjectFromRowsRef,
  };
}
