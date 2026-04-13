// SPA: Pinia, Vue Router, Element Plus (RU), корпоративные стили поверх темы EP.
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import ru from 'element-plus/es/locale/lang/ru'
import 'element-plus/dist/index.css'
import '@/styles/app-theme.css'

import App from './App.vue'
import router from './router'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(ElementPlus, { locale: ru })

app.mount('#app')