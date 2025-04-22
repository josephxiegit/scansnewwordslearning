<template>
  <van-dialog
    v-model:show="showInner"
    title="输入密码"
    show-cancel-button
    @confirm="onConfirm"
    @cancel="onCancel"
  >
    <van-field
      v-model="password"
      type="password"
      placeholder="请输入密码"
      clearable
    />
  </van-dialog>
</template>

<script setup>
import { ref, watch } from 'vue'

// 接收父组件传入的 v-model:show
const props = defineProps({
  show: Boolean
})

// 定义事件：用于更新 v-model 和提交密码
const emit = defineEmits(['update:show', 'submit'])

// 内部状态
const showInner = ref(props.show)
const password = ref('')

// 同步外部 v-model:show 和内部状态
watch(() => props.show, (val) => {
  showInner.value = val
})
watch(showInner, (val) => {
  emit('update:show', val)
})

// 用户点击“确认”
const onConfirm = () => {
  emit('submit', password.value)
  password.value = ''
}

// 用户点击“取消”
const onCancel = () => {
  password.value = ''
}
</script>

<style scoped>
/* 可根据需要自定义样式 */
</style>
