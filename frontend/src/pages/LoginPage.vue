<template>
  <div class="login-page">
    <el-card class="login-card">
      <template #header>
        <div class="login-title">Вход в систему</div>
      </template>

      <div class="form-block">
        <div class="label">Организация</div>
        <el-radio-group v-model="form.organization" size="large">
          <el-radio-button label="ДИТ" value="ДИТ" />
          <el-radio-button label="112" value="112" />
          <el-radio-button label="101" value="101" />
          <el-radio-button label="Танто-С" value="Танто-С" />
        </el-radio-group>
      </div>

      <div class="form-block">
        <div class="label">ФИО</div>
        <el-autocomplete
          v-model="form.fullName"
          :fetch-suggestions="querySearchAuthors"
          placeholder="Введите ФИО"
          clearable
          style="width: 100%"
        />
      </div>

      <div class="form-block">
        <div class="label">Пароль</div>
        <el-input v-model="form.password" type="password" placeholder="Введите пароль" show-password />
      </div>

      <el-button type="primary" :loading="loading" class="submit-btn" @click="handleLogin">
        Войти
      </el-button>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { login } from '@/api/auth'
import { fetchAuthorSuggestions } from '@/api/dictionaries'
import { useAuthStore } from '@/stores/auth'
import type { Organization } from '@/types'

const router = useRouter()
const authStore = useAuthStore()
const loading = ref(false)

const form = reactive<{
  organization: Organization
  fullName: string
  password: string
}>({
  organization: 'ДИТ',
  fullName: '',
  password: '',
})

async function querySearchAuthors(queryString: string, cb: (arg: Array<{ value: string }>) => void) {
  try {
    const data = await fetchAuthorSuggestions(queryString)
    cb(data.map((item) => ({ value: item })))
  } catch {
    cb([])
  }
}

async function handleLogin() {
  try {
    loading.value = true
    const data = await login({
      organization: form.organization,
      fullName: form.fullName,
      password: form.password,
    })

    authStore.setAuth(data)
    ElMessage.success('Вход выполнен')
    router.push('/requirements')
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || 'Ошибка входа')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f7fa;
}

.login-card {
  width: 460px;
}

.login-title {
  font-size: 24px;
  font-weight: 600;
}

.form-block {
  margin-bottom: 18px;
}

.label {
  margin-bottom: 8px;
  font-weight: 500;
}

.submit-btn {
  width: 100%;
}
</style>