<template>
  <div class="login-page">
    <el-card class="login-card" shadow="hover">
      <template #header>
        <div class="login-title">Вход</div>
      </template>

      <div class="form-block">
        <div class="label">Почта</div>
        <el-input v-model="form.email" placeholder="Введите почту" clearable />
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
import { useAuthStore } from '@/stores/auth'

// Router нужен для перехода после успешного логина.
const router = useRouter()

// Pinia-store авторизации.
const authStore = useAuthStore()

// Флаг кнопки "Войти".
const loading = ref(false)

// Форма логина.
const form = reactive({
  email: '',
  password: '',
})

// Выполняем логин через backend и сохраняем JWT.
async function handleLogin() {
  try {
    loading.value = true

    const data = await login({
      email: form.email,
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
  background:
    radial-gradient(circle at top left, #f4f8ff 0%, #f7f9fc 35%, #f3f5f8 100%);
  padding: 24px;
}

.login-card {
  width: 460px;
  border-radius: 18px;
}

.login-title {
  font-size: 24px;
  font-weight: 700;
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