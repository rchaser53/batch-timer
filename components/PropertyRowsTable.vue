<template>
  <div>
    <p v-if="rowsError" class="error" style="margin: 0 0 8px;">{{ rowsError }}</p>
    <table class="table tableEdit">
      <thead>
        <tr>
          <th style="width: 220px;">キー</th>
          <th style="width: 140px;">型</th>
          <th>値</th>
          <th style="width: 90px;">操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in rows" :key="row.id">
          <td>
            <input v-model.trim="row.key" class="mono input" placeholder="例: Label" @change="onRowKeyChange(row)" />
          </td>
          <td>
            <select v-model="row.type" class="input" @change="onRowTypeChange(row)">
              <option value="string">string</option>
              <option value="number">number</option>
              <option value="boolean">boolean</option>
              <option value="null">null</option>
              <option value="object">object</option>
              <option value="array">array</option>
            </select>
          </td>
          <td>
            <template v-if="row.type === 'string'">
              <input v-model="row.value" class="mono input" placeholder="文字列" />
            </template>

            <template v-else-if="row.type === 'number'">
              <input v-model="row.value" class="mono input" placeholder="数値" inputmode="numeric" />
            </template>

            <template v-else-if="row.type === 'boolean'">
              <select v-model="row.value" class="input">
                <option :value="true">true</option>
                <option :value="false">false</option>
              </select>
            </template>

            <template v-else-if="row.type === 'null'">
              <div class="muted">null</div>
            </template>

            <template v-else-if="isStartCalendarIntervalRow(row)">
              <div class="sciWrap">
                <div v-if="row.type === 'array'" class="actions" style="margin-bottom: 6px;">
                  <button @click="addSciEntry(row)">エントリ追加</button>
                </div>

                <div v-for="(entry, idx) in getSciEntries(row)" :key="`sci_${row.id}_${idx}`" class="sciEntry">
                  <div v-if="row.type === 'array'" class="actions" style="margin: 0 0 6px; justify-content: flex-end;">
                    <button class="danger" @click="removeSciEntry(row, idx)">このエントリ削除</button>
                  </div>

                  <table class="table sciTable">
                    <thead>
                      <tr>
                        <th style="width: 120px;">プロパティ</th>
                        <th>値</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="spec in SCI_SPECS" :key="spec.key">
                        <td class="mono">{{ spec.key }}</td>
                        <td>
                          <div class="sciValue">
                            <input
                              class="mono input"
                              inputmode="numeric"
                              :placeholder="spec.placeholder"
                              :value="getSciText(row, idx, spec.key, entry)"
                              @input="(e) => onSciTextInput(row, idx, spec.key, e)"
                            />
                            <div class="muted sciHint">{{ spec.hint }}</div>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div class="muted" style="margin-top: 6px;">
                  空欄は未指定（*）扱い。Weekday は launchd 仕様で 1=日 ... 7=土。
                </div>
                <div v-if="row.error" class="error" style="margin-top: 4px;">{{ row.error }}</div>
              </div>
            </template>

            <template v-else>
              <textarea
                v-model="row.jsonText"
                rows="4"
                class="mono textarea"
                placeholder="JSONを入力"
                @input="onRowJsonTextInput(row)"
              />
              <div v-if="row.error" class="error" style="margin-top: 4px;">{{ row.error }}</div>
            </template>
          </td>
          <td>
            <button class="danger" @click="$emit('remove', row.id)">削除</button>
          </td>
        </tr>
      </tbody>
    </table>

    <div v-if="showHelp" class="muted" style="margin-top: 8px;">
      例: <span class="mono">Label</span>, <span class="mono">ProgramArguments</span>, <span class="mono">StartCalendarInterval</span>
    </div>
  </div>
</template>

<script setup>
import { ref, watchEffect } from 'vue';

const props = defineProps({
  rows: { type: Array, required: true },
  rowsError: { type: String, default: '' },
  showHelp: { type: Boolean, default: true },
});

defineEmits(['remove']);

const { normalizeRowValueForType, parseJsonTextForRow } = usePropertyRows();

const SCI_SPECS = [
  { key: 'Minute', min: 0, max: 59, placeholder: '例: 0', hint: '0-59 / 空欄=*' },
  { key: 'Hour', min: 0, max: 23, placeholder: '例: 20', hint: '0-23 / 空欄=*' },
  { key: 'Day', min: 1, max: 31, placeholder: '例: 1', hint: '1-31 / 空欄=*' },
  { key: 'Month', min: 1, max: 12, placeholder: '例: 2', hint: '1-12 / 空欄=*' },
  { key: 'Weekday', min: 1, max: 7, placeholder: '例: 2', hint: '1=日 ... 7=土 / 空欄=*' },
];

function isStartCalendarIntervalRow(row) {
  const key = String(row?.key || '').trim();
  return key === 'StartCalendarInterval' && (row?.type === 'object' || row?.type === 'array');
}

function normalizeSciValue(row) {
  if (row.type === 'object') {
    const v = row.value;
    if (!v || typeof v !== 'object' || Array.isArray(v)) row.value = {};
    return;
  }
  if (row.type === 'array') {
    const v = row.value;
    if (Array.isArray(v)) return;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      row.value = [v];
      return;
    }
    row.value = [];
  }
}

// StartCalendarInterval 行は表示前に必ず正規化する（レンダー中に state を触らないため）
watchEffect(() => {
  const rows = props.rows || [];
  for (const row of rows) {
    if (!isStartCalendarIntervalRow(row)) continue;
    normalizeSciValue(row);
    syncRowJsonText(row);
    ensureSciText(row);
  }
});

function syncRowJsonText(row) {
  if (row.type !== 'object' && row.type !== 'array') return;
  if (row.error) return;
  try {
    row.jsonText = JSON.stringify(row.value ?? (row.type === 'array' ? [] : {}), null, 2);
  } catch {
    // ignore
  }
}

// row.id -> entryIndex -> { Minute: '...', ... }
const sciText = ref({});

function ensureSciText(row) {
  if (!isStartCalendarIntervalRow(row)) return;
  const entries = getSciEntries(row);
  const id = row.id;
  const map = sciText.value;
  if (!map[id] || !Array.isArray(map[id])) map[id] = [];

  for (let i = 0; i < entries.length; i++) {
    if (!map[id][i] || typeof map[id][i] !== 'object') map[id][i] = {};
    const e = entries[i] || {};
    for (const spec of SCI_SPECS) {
      if (map[id][i][spec.key] !== undefined) continue;
      const n = e?.[spec.key];
      map[id][i][spec.key] = typeof n === 'number' && !Number.isNaN(n) ? String(n) : '';
    }
  }

  map[id].length = entries.length;
}

function getSciEntries(row) {
  if (!isStartCalendarIntervalRow(row)) return [];
  if (row.type === 'array') return Array.isArray(row.value) ? row.value : [];
  return row.value && typeof row.value === 'object' && !Array.isArray(row.value) ? [row.value] : [];
}

function getSciText(row, idx, key, entry) {
  const v = sciText.value?.[row.id]?.[idx]?.[key];
  if (v !== undefined) return String(v ?? '');
  const n = entry?.[key];
  if (typeof n === 'number' && !Number.isNaN(n)) return String(n);
  return '';
}

function addSciEntry(row) {
  if (row.type !== 'array') return;
  normalizeSciValue(row);
  row.value.push({});
  ensureSciText(row);
  syncRowJsonText(row);
}

function removeSciEntry(row, idx) {
  if (row.type !== 'array') return;
  normalizeSciValue(row);
  row.value.splice(idx, 1);
  const arr = sciText.value?.[row.id];
  if (Array.isArray(arr)) arr.splice(idx, 1);
  syncRowJsonText(row);
}

function onSciTextInput(row, idx, key, event) {
  ensureSciText(row);
  const text = event?.target && typeof event.target.value === 'string' ? event.target.value : '';
  const map = sciText.value;
  if (!map[row.id] || !map[row.id][idx]) {
    ensureSciText(row);
  }
  if (!map[row.id][idx]) map[row.id][idx] = {};
  map[row.id][idx][key] = text;

  row.error = '';
  normalizeSciValue(row);
  const entries = getSciEntries(row);
  const entry = entries[idx];
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
    row.error = 'StartCalendarInterval の形式が不正です（object/array を確認してください）';
    return;
  }

  const trimmed = String(text ?? '').trim();
  if (!trimmed) {
    delete entry[key];
    syncRowJsonText(row);
    return;
  }

  if (!/^\d+$/.test(trimmed)) {
    row.error = `${key} は数値で入力してください`;
    return;
  }

  const n = Number(trimmed);
  const spec = SCI_SPECS.find((s) => s.key === key);
  if (spec && (n < spec.min || n > spec.max)) {
    row.error = `${key} は ${spec.min}-${spec.max} の範囲で入力してください`;
    return;
  }

  entry[key] = n;
  syncRowJsonText(row);
}

function onRowTypeChange(row) {
  normalizeRowValueForType(row);
  if (isStartCalendarIntervalRow(row)) {
    row.error = '';
    normalizeSciValue(row);
    syncRowJsonText(row);
  }
}

function onRowKeyChange(row) {
  // StartCalendarInterval から他キーに変えた場合に、JSON表示が古くならないよう同期しておく
  syncRowJsonText(row);
  if (isStartCalendarIntervalRow(row)) {
    row.error = '';
    normalizeSciValue(row);
    syncRowJsonText(row);
  }
}

function onRowJsonTextInput(row) {
  parseJsonTextForRow(row);
}
</script>

<style scoped>
.sciWrap { display: grid; gap: 6px; }
.sciEntry { border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px; background: #f8fafc; }
.sciTable th, .sciTable td { border-bottom: 1px solid #e2e8f0; padding: 6px 8px; }
.sciTable thead th { background: transparent; }
.sciValue { display: grid; gap: 4px; }
.sciHint { font-size: 12px; }
</style>
