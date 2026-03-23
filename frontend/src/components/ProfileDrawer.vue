<template>
  <el-drawer
    :model-value="modelValue"
    title="Профиль пользователя"
    size="460px"
    @close="emit('update:modelValue', false)"
  >
    <div class="profile-block">
      <div class="profile-line">
        <div class="profile-label">ФИО</div>
        <div class="profile-value">{{ authStore.profile?.fullName }}</div>
      </div>

      <div class="profile-line">
        <div class="profile-label">Почта</div>
        <div class="profile-value">{{ authStore.profile?.email }}</div>
      </div>

      <div class="profile-line">
        <div class="profile-label">Организация</div>
        <div class="profile-value">{{ authStore.profile?.organization }}</div>
      </div>

      <div class="profile-line">
        <div class="profile-label">Права</div>
        <div class="profile-value">
          {{ authStore.profile?.isSuperuser ? 'Суперпользователь' : authStore.profile?.accessLevel === 'edit' ? 'Чтение и редактирование' : 'Только чтение' }}
        </div>
      </div>
    </div>

    <el-divider />

    <div class="password-title">Сменить пароль</div>

    <el-form label-position="top">
      <el-form-item label="Текущий пароль">
        <el-input v-model="form.currentPassword" type="password" show-password />
      </el-form-item>

      <el-form-item label="Новый пароль">
        <el-input v-model="form.newPassword" type="password" show-password />
      </el-form-item>

      <el-form-item label="Подтверждение нового пароля">
        <el-input v-model="form.confirmPassword" type="password" show-password />
      </el-form-item>
    </el-form>

    <el-button type="primary" :loading="loading" @click="handleChangePassword">
      Сменить пароль
    </el-button>
  </el-drawer>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { changePassword } from '@/api/auth'
import { useAuthStore } from '@/stores/auth'

// Drawer работает через v-model.
defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

// Берём профиль из store.
const authStore = useAuthStore()

// Флаг загрузки.
const loading = ref(false)

// Локальная форма смены пароля.
const form = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
})

// Обработчик смены пароля.
async function handleChangePassword() {
  if (!form.currentPassword || !form.newPassword || !form.confirmPassword) {
    ElMessage.warning('Заполните все поля')
    return
  }

  if (form.newPassword !== form.confirmPassword) {
    ElMessage.warning('Подтверждение нового пароля не совпадает')
    return
  }

  try {
    loading.value = true

    await changePassword({
      currentPassword: form.currentPassword,
      newPassword: form.newPassword,
    })

    form.currentPassword = ''
    form.newPassword = ''
    form.confirmPassword = ''

    ElMessage.success('Пароль успешно изменён')
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || 'Ошибка смены пароля')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.profile-block {
  display: grid;
  gap: 14px;
}

.profile-line {
  display: grid;
  gap: 4px;
}

.profile-label {
  color: #667085;
  font-size: 13px;
}

.profile-value {
  font-weight: 600;
  color: #1f2937;
  word-break: break-word;
}

.password-title {
  margin-bottom: 16px;
  font-size: 18px;
  font-weight: 700;
}
</style>