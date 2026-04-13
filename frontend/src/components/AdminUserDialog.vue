<template>
  <el-dialog
    :model-value="modelValue"
    :title="mode === 'create' ? 'Добавить пользователя' : 'Редактировать пользователя'"
    width="720px"
    @close="emit('update:modelValue', false)"
  >
    <el-form label-position="top">
      <el-form-item label="ФИО">
        <el-input v-model="form.fullName" />
      </el-form-item>

      <el-form-item label="Организация">
        <el-select v-model="form.organization" style="width: 100%">
          <el-option label="ДИТ" value="ДИТ" />
          <el-option label="Система 112" value="112" />
          <el-option label="Система 101" value="101" />
          <el-option label="Танто-С" value="Танто-С" />
        </el-select>
      </el-form-item>

      <el-form-item label="Почта">
        <el-input v-model="form.email" />
      </el-form-item>

      <el-form-item v-if="mode === 'create'" label="Пароль">
        <el-input v-model="form.password" type="password" show-password />
      </el-form-item>

      <el-form-item label="Права пользователя">
        <el-select v-model="form.accessLevel" style="width: 100%">
          <el-option label="Только чтение" value="read" />
          <el-option label="Чтение и редактирование" value="edit" />
        </el-select>
      </el-form-item>

      <el-form-item
        v-if="form.accessLevel === 'read'"
        label="Дополнительные права к карточке требования"
      >
        <el-select
          v-model="selectedGrantKeys"
          multiple
          filterable
          collapse-tags
          collapse-tags-tooltip
          :max-collapse-tags="6"
          placeholder="Выберите атрибуты, которые пользователь сможет менять"
          style="width: 100%"
        >
          <el-option
            v-for="opt in REQUIREMENT_FIELD_GRANT_OPTIONS"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>
      </el-form-item>

      <el-form-item label="Активен">
        <el-switch v-model="form.isActive" />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="emit('update:modelValue', false)">Отмена</el-button>
      <el-button type="primary" :loading="loading" @click="submit">
        Сохранить
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { createAdminUser, updateAdminUser } from '@/api/adminUsers'
import { REQUIREMENT_FIELD_GRANT_OPTIONS } from '@/constants/requirementFieldGrants'
import type { AdminUser, AccessLevel, Organization, RequirementFieldGrants } from '@/types'

const props = defineProps<{
  modelValue: boolean
  mode: 'create' | 'edit'
  initialUser: AdminUser | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'saved'): void
}>()

const loading = defineModel<boolean>('loading', { default: false })

const form = reactive<{
  fullName: string
  organization: Organization | string
  email: string
  password: string
  accessLevel: AccessLevel
  isActive: boolean
}>({
  fullName: '',
  organization: 'ДИТ',
  email: '',
  password: '',
  accessLevel: 'read',
  isActive: true,
})

const selectedGrantKeys = ref<string[]>([])

function grantsKeysFromUser(u: AdminUser | null): string[] {
  if (!u?.requirementFieldGrants) return []
  return Object.entries(u.requirementFieldGrants)
    .filter(([, v]) => Boolean(v))
    .map(([k]) => k)
}

watch(
  () => [props.modelValue, props.mode, props.initialUser],
  ([opened]) => {
    if (!opened) return

    if (props.mode === 'edit' && props.initialUser) {
      form.fullName = props.initialUser.fullName
      form.organization = props.initialUser.organization
      form.email = props.initialUser.email
      form.password = ''
      form.accessLevel = props.initialUser.accessLevel
      form.isActive = props.initialUser.isActive
      selectedGrantKeys.value = grantsKeysFromUser(props.initialUser)
      return
    }

    form.fullName = ''
    form.organization = 'ДИТ'
    form.email = ''
    form.password = ''
    form.accessLevel = 'read'
    form.isActive = true
    selectedGrantKeys.value = []
  },
  { immediate: true },
)

function requirementGrantsForPayload(): RequirementFieldGrants {
  if (form.accessLevel === 'read') {
    const out: RequirementFieldGrants = {}
    const allowed = new Set(REQUIREMENT_FIELD_GRANT_OPTIONS.map((o) => o.value))
    for (const key of selectedGrantKeys.value) {
      if (allowed.has(key)) out[key] = true
    }
    return out
  }
  return {}
}

async function submit() {
  try {
    loading.value = true
    const requirementFieldGrants = requirementGrantsForPayload()

    if (props.mode === 'create') {
      await createAdminUser({
        fullName: form.fullName,
        organization: form.organization,
        email: form.email,
        password: form.password,
        accessLevel: form.accessLevel,
        isActive: form.isActive,
        requirementFieldGrants,
      })
      ElMessage.success('Пользователь создан')
    } else if (props.initialUser) {
      await updateAdminUser(props.initialUser.id, {
        fullName: form.fullName,
        organization: form.organization,
        email: form.email,
        accessLevel: form.accessLevel,
        isActive: form.isActive,
        requirementFieldGrants,
      })
      ElMessage.success('Пользователь обновлён')
    }

    emit('saved')
    emit('update:modelValue', false)
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || 'Ошибка сохранения пользователя')
  } finally {
    loading.value = false
  }
}
</script>
