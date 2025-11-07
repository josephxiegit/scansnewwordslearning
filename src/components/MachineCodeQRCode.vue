<script setup>
import { onMounted, ref } from "vue";
import {
  showFailToast,
  showToast,
  showLoadingToast,
  showConfirmDialog,
  showDialog,
  Divider,
  Toast,
  closeToast,
  showSuccessToast,
} from "vant";
import "vant/lib/index.css";

// 复制函数
const copyToClipboard = () => {
  if (machineCode.value) {
    navigator.clipboard.writeText(machineCode.value).then(() => {
      showSuccessToast("机器码已复制");
    });
  }
};

const machineCode = ref("");
const UrltoDomain = ref("http://www.tianjinwords.top:8085/homepage/?param=1748931148");
// const UrltoDomain = ref("http://localhost:5173/homepage?param=1748931148");
onMounted(() => {
  const query = new URLSearchParams(window.location.search);
  machineCode.value = query.get("param") || "";
  console.log("machineCode: ", machineCode.value);
});
</script>

<template>
  <div>
    <!-- 添加标题 -->
    <div class="code-title">本书机器码</div>

    <div class="code-container" v-if="machineCode" @click="copyToClipboard">
      <span
        v-for="(char, index) in machineCode.split('')"
        :key="index"
        class="char"
        :style="{ animationDelay: `${index * 0.15}s` }"
      >
        {{ char }}
      </span>
    </div>

    <!-- <div class="copy-button">
      <van-button type="primary" @click="copyToClipboard">长按复制</van-button>
    </div> -->

    <!-- 按钮和提示跳转链接 -->
    <div class="action-row">
      <a class="start-link" :href="UrltoDomain" target="_blank">
        手动复制后，点击开始背诵
      </a>
    </div>
  </div>
</template>

<style scoped>
.code-container {
  display: flex;
  justify-content: center;
  font-family: monospace;
  font-size: 2rem;
  perspective: 800px;
  margin: 2rem 2rem 2rem 2rem;
  cursor: pointer;
}
.copy-button {
  display: flex;
  justify-content: center;
  margin-top: 0.25rem;
}
.char {
  display: inline-block;
  margin: 0 2px;
  transform: rotateY(90deg) scale(0.5);
  opacity: 0;
  animation: flipIn 0.6s forwards ease-out;
}

@keyframes flipIn {
  0% {
    transform: rotateY(90deg) scale(0.5);
    opacity: 0;
  }
  50% {
    transform: rotateY(0deg) scale(1.2);
    opacity: 1;
  }
  100% {
    transform: rotateY(0deg) scale(1);
    opacity: 1;
  }
}
.code-title {
  text-align: center;
  font-weight: bold;
  font-size: 1.25rem;
  margin-top: 1.5rem;
  margin-bottom: 1rem;
}

.action-row {
  display: flex;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.start-link {
  color: #1989fa;
  font-size: 0.95rem;
  text-decoration: underline;
  cursor: pointer;
}
.start-link:hover {
  color: #0a71d0;
}
</style>
