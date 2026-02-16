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
            <input v-model.trim="row.key" class="mono input" placeholder="例: Label" />
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
const props = defineProps({
  rows: { type: Array, required: true },
  rowsError: { type: String, default: '' },
  showHelp: { type: Boolean, default: true },
});

defineEmits(['remove']);

const { normalizeRowValueForType, parseJsonTextForRow } = usePropertyRows();

function onRowTypeChange(row) {
  normalizeRowValueForType(row);
}

function onRowJsonTextInput(row) {
  parseJsonTextForRow(row);
}
</script>
