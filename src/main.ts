import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { createCore } from '@y2kfund/core'

async function bootstrap() {
  const supabaseUrl = import.meta.env.VITE_SUPA_URL
  const supabaseAnon = import.meta.env.VITE_SUPA_ANON

  const core = await createCore({
    supabaseUrl,
    supabaseAnon,
    query: {
      staleTime: 60_000,
      gcTime: 86_400_000,
      refetchOnWindowFocus: false
    }
  })

  createApp(App)
    .use(router)
    .use(core)
    .mount('#app')
}
bootstrap()