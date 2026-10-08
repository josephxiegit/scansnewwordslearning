<script setup>
import { BOOK_EDITION, FIRST_LEARNING_PARAM, bookUrl } from '../bookEdition.js';
import { onMounted, ref } from "vue";
import axios from "axios";
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
  if (entryError.value) {
    showFailToast(entryError.value);
    return;
  }
  if (isResolving.value) {
    showToast("正在确认学习入口，请稍候");
    return;
  }
  if (machineCode.value) {
    navigator.clipboard
      .writeText(machineCode.value)
      .then(() => {
        showSuccessToast("机器码已复制");
        window.setTimeout(() => {
          window.location.assign(UrltoDomain.value);
        }, 600);
      })
      .catch(() => {
        showFailToast("复制失败，请点击下方开始背诵");
      });
  }
};

const machineCode = ref("");
const isResolving = ref(false);
const entryError = ref('');
const defaultLearningParam = FIRST_LEARNING_PARAM;
const UrltoDomain = ref(BOOK_EDITION === 2027 ? '' : bookUrl(`/homepage/?param=${defaultLearningParam}`));

const setLearningUrl = (learningParam) => {
  UrltoDomain.value = bookUrl(`/homepage/?param=${learningParam}`);
};

const resolveLearningEntry = async () => {
  if (!machineCode.value) return;

  isResolving.value = true;
  try {
    const response = await axios.post("scans/", {
      method: "resolveScanBookEntry",
      code: machineCode.value,
    });
    if (response.data?.status === "ok" && response.data.learningParam &&
        (BOOK_EDITION !== 2027 || response.data.edition === 2027)) {
      setLearningUrl(response.data.learningParam);
      return;
    }
  } catch (error) {
    console.error("机器码学习入口查询失败:", error);
  } finally {
    isResolving.value = false;
  }

  // 查询暂不可用或历史记录未找到时，保持旧版高中入口，避免影响已印刷的
  // 高中书二维码；初中机器码只在后台明确识别为初中后才会进入初中词汇。
  if (BOOK_EDITION === 2027) {
    entryError.value = '无法确认2027学习入口，请稍后重试或联系老师';
    UrltoDomain.value = '';
  } else {
    setLearningUrl(defaultLearningParam);
  }
};

onMounted(async () => {
  const query = new URLSearchParams(window.location.search);
  machineCode.value = (query.get("param") || "").trim().toUpperCase();
  console.log("machineCode: ", machineCode.value);
  await resolveLearningEntry();
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
      <a v-if="UrltoDomain" class="start-link" :href="UrltoDomain" :aria-busy="isResolving">
        {{ isResolving ? "正在确认学习入口..." : "未自动跳转时，点击开始背诵" }}
      </a>
      <span v-else>{{ entryError || '正在确认学习入口...' }}</span>
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
