<script setup>
import { watch, onMounted, ref, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { getCurrentInstance } from "vue";

const instance = getCurrentInstance();
const axios = instance.appContext.config.globalProperties.$ajax;
const route = useRoute();
const router = useRouter();
const transitionName = computed(() => {
  // 根据实际路由路径来决定过渡效果
  return route.path.startsWith('/teacher') ? 'slide-left' : 'slide-right';
});

</script>

<template>
  <router-view v-slot="{ Component }" :key="$route.fullPath">
    <transition :name="transitionName">
      <keep-alive>
        <div >
          <component :is="Component" />
        </div>
      </keep-alive>
    </transition>
  </router-view>
</template>


<style>

</style>