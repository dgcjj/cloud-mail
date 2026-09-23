<template>
  <el-input-tag :model-value="modelValue" @update:model-value="update" @add-tag="addTag" @input="inputChange"
                tag-type="primary" size="default">
    <template #prefix>
      <div class="item-title">{{ label }}</div>
      <el-select
          ref="selectRef"
          class="recipient-select"
          popper-class="write-select"
          :show-arrow="false"
          :no-match-text="' '"
          :no-data-text="' '"
          @visible-change="status => selectStatus = status"
          @change="selectChange"
      >
        <el-option
            v-for="item in suggestList"
            :key="item"
            :label="item"
            :value="item"
            style="color: #999896;"
        />
      </el-select>
    </template>
    <template #suffix>
      <div style="display: flex;margin-right: 3px;">
        <Icon icon="fa7-solid:user-plus" width="20" height="20" class="add-contact" @click.stop="openContacts"/>
      </div>
    </template>
  </el-input-tag>
  <el-dialog top="10vh" v-model="showContacts" append-to-body width="min(420px, calc(100% - 40px))"
             @closed="contactsTabRef?.clearSelection()" :title="t('recentContacts')">
    <el-table ref="contactsTabRef" row-key="email" :data="contacts" style="height: 445px">
      <el-table-column type="selection" width="32"/>
      <el-table-column property="email" :label="t('emailAccount')">
        <template #default="props">
          <div class="email-row">{{ props.row.email }}</div>
        </template>
      </el-table-column>
      <el-table-column width="55" label="">
        <template #default>
          <div style="display: flex;">
            <Icon icon="mage:user" style="color: var(--el-text-color-primary)" width="22" height="22" color="#606266"/>
          </div>
        </template>
      </el-table-column>
    </el-table>
    <div class="contacts-bottom">
      <el-button type="primary" @click="chooseContact">{{ t('selectContacts') }}</el-button>
    </div>
  </el-dialog>
</template>

<script setup>
//抄送/密送输入框：和收件人一样支持最近联系人自动补全和联系人选择
//单独做成组件，尽量少改动上游的 write/index.vue
import {computed, nextTick, ref} from "vue";
import {Icon} from "@iconify/vue";
import {useI18n} from "vue-i18n";
import {isEmail} from "@/utils/verify-utils.js";
import {useWriterStore} from "@/store/writer.js";

const props = defineProps({
  modelValue: {
    type: Array,
    default: () => []
  },
  label: String
})

const emit = defineEmits(['update:modelValue'])

const {t} = useI18n()
const writerStore = useWriterStore()
const selectRef = ref()
const contactsTabRef = ref()
const showContacts = ref(false)
const suggestList = ref([])
let selectStatus = false

const contacts = computed(() => writerStore.sendRecipientRecord.map(item => ({email: item})))

function update(list) {
  emit('update:modelValue', list || [])
}

function toggleSelect() {
  selectRef.value?.toggleMenu()
}

//支持逗号分隔粘贴多个地址，并过滤非法邮箱
function addTag(val) {
  const list = props.modelValue.filter(item => item !== val)
  val.split(/[,，]/).map(item => item.trim()).filter(item => item).forEach(email => {
    if (isEmail(email) && !list.includes(email)) {
      list.push(email)
    }
  })
  update(list)
  if (selectStatus) toggleSelect()
}

function inputChange(value) {
  suggestList.value = writerStore.sendRecipientRecord
      .filter(item => value && !props.modelValue.includes(item) && item.startsWith(value))
      .slice(0, 10)
  if (!selectStatus && suggestList.value.length > 0) toggleSelect()
  if (selectStatus && suggestList.value.length === 0) toggleSelect()
}

function selectChange(value) {
  if (!props.modelValue.includes(value)) {
    update([...props.modelValue, value])
  }
}

function openContacts() {
  showContacts.value = true
  nextTick(() => {
    props.modelValue.forEach(item => {
      if (writerStore.sendRecipientRecord.includes(item)) {
        contactsTabRef.value.toggleRowSelection({email: item})
      }
    })
  })
}

function chooseContact() {
  const selected = contactsTabRef.value.getSelectionRows().map(item => item.email)
  //保留手动输入的地址和仍被选中的联系人，再追加新选中的联系人
  const list = props.modelValue.filter(item => selected.includes(item) || !writerStore.sendRecipientRecord.includes(item))
  selected.forEach(item => {
    if (!list.includes(item)) list.push(item)
  })
  update(list)
  showContacts.value = false
}
</script>

<style scoped lang="scss">
.recipient-select {
  position: absolute;
  width: 300px;
  left: 60px;
  z-index: 0;
  opacity: 0;
  pointer-events: none;
}

.add-contact {
  color: var(--regular-text-color);
  cursor: pointer;
}

.email-row {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.contacts-bottom {
  display: flex;
  justify-content: end;
  margin-top: 10px;
}

:deep(.el-input-tag__suffix) {
  padding-right: 4px;
}
</style>
