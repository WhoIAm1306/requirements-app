<template>
  <div class="page">
    <div class="page-shell">
      <!--
        Шапка административной страницы пользователей.
      -->
      <div class="page-header">
        <div>
          <h2 class="page-title">Справочник пользователей</h2>
          <div class="meta">Только для суперпользователя</div>
        </div>

        <div class="header-actions">
          <el-button @click="router.push('/requirements')">Назад</el-button>
          <el-button type="primary" @click="openCreate">Добавить пользователя</el-button>
        </div>
      </div>

      <!--
        Таблица пользователей.
        Кнопка смены пароля полностью удалена по требованиям ИБ.
      -->
      <el-card class="table-card" shadow="never">
        <el-table :data="items" v-loading="loading" stripe border empty-text="Нет пользователей">
          <el-table-column prop="fullName" label="ФИО" min-width="260" />
          <el-table-column prop="email" label="Почта" min-width="220" />
          <el-table-column prop="organization" label="Организация" width="150" />
          <el-table-column label="Права" width="220">
            <template #default="{ row }">
              <span v-if="row.isSuperuser">Суперпользователь</span>
              <span v-else-if="row.accessLevel === 'edit'">Чтение и редактирование</span>
              <span v-else>Только чтение</span>
            </template>
          </el-table-column>
          <el-table-column label="Статус" width="120">
            <template #default="{ row }">
              <el-tag :type="row.isActive ? 'success' : 'info'">
                {{ row.isActive ? 'Активен' : 'Отключён' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="createdAt" label="Создан" width="170" />

          <el-table-column label="Действия" width="240" fixed="right">
            <template #default="{ row }">
              <div class="row-actions">
                <el-button size="small" @click="openEdit(row)">Редактировать</el-button>
                <el-button
                  v-if="!row.isSuperuser && row.id !== authStore.profile?.id"
                  size="small"
                  type="danger"
                  plain
                  @click="handleDeleteUser(row)"
                >
                  Удалить
                </el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </el-card>

      <AdminUserDialog
        v-model="dialogVisible"
        v-model:loading="dialogLoading"
        :mode="dialogMode"
        :initial-user="selectedUser"
        @saved="onUserSaved"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { deleteAdminUser, fetchAdminUsers } from '@/api/adminUsers'
import { fetchMe } from '@/api/auth'
import AdminUserDialog from '@/components/AdminUserDialog.vue'
import { useAuthStore } from '@/stores/auth'
import type { AdminUser } from '@/types'

/**
 * Router нужен для возврата на страницу реестра.
 */
const router = useRouter()
const authStore = useAuthStore()

/**
 * Список пользователей.
 */
const items = ref<AdminUser[]>([])

/**
 * Состояния таблицы и модального окна.
 */
const loading = ref(false)
const dialogLoading = ref(false)
const dialogVisible = ref(false)
const dialogMode = ref<'create' | 'edit'>('create')
const selectedUser = ref<AdminUser | null>(null)

/**
 * Загрузка списка пользователей.
 */
async function loadData() {
  try {
    loading.value = true
    items.value = await fetchAdminUsers()
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || 'Ошибка загрузки пользователей')
  } finally {
    loading.value = false
  }
}

async function onUserSaved() {
  const editedId = selectedUser.value?.id
  await loadData()
  if (editedId != null && authStore.profile?.id === editedId) {
    try {
      authStore.setProfile(await fetchMe())
    } catch {
      /* сессия может быть недоступна — игнорируем */
    }
  }
}

/**
 * Открываем режим создания пользователя.
 */
function openCreate() {
  dialogMode.value = 'create'
  selectedUser.value = null
  dialogVisible.value = true
}

/**
 * Открываем режим редактирования пользователя.
 */
function openEdit(user: AdminUser) {
  dialogMode.value = 'edit'
  selectedUser.value = user
  dialogVisible.value = true
}

async function handleDeleteUser(user: AdminUser) {
  try {
    await ElMessageBox.confirm(
      `Удалить пользователя «${user.fullName}» (${user.email})? Вход под этой учётной записью станет невозможен.`,
      'Удаление пользователя',
      { type: 'warning', confirmButtonText: 'Удалить', cancelButtonText: 'Отмена' },
    )
  } catch {
    return
  }
  try {
    await deleteAdminUser(user.id)
    ElMessage.success('Пользователь удалён')
    await loadData()
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || 'Ошибка удаления')
  }
}

/**
 * На старте страницы загружаем пользователей.
 */
onMounted(() => {
  loadData()
})
</script>

<style scoped>
.page {
  min-height: 100vh;
  background:
    radial-gradient(circle at top left, #f4f8ff 0%, #f7f9fc 35%, #f3f5f8 100%);
  padding: 16px;
}

.page-shell {
  width: 100%;
  display: grid;
  gap: 16px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.page-title {
  margin: 0;
  font-size: 30px;
  line-height: 1.1;
  font-weight: 700;
  color: #1f2937;
}

.meta {
  color: #667085;
  font-size: 14px;
  margin-top: 6px;
}

.header-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.table-card {
  border-radius: 20px;
}

.row-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
</style>