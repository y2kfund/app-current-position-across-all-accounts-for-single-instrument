import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'

import CurrentPositions from '../views/CurrentPositions.vue'
// Use the correct type for the routes array
const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    name: 'CurrentPositions',
    component: CurrentPositions
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router