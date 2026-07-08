<script setup>
import { computed, getCurrentInstance, nextTick, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { showDialog, showFailToast, showLoadingToast } from "vant";

const instance = getCurrentInstance();
const axios = instance.appContext.config.globalProperties.$ajax;
const router = useRouter();
const route = useRoute();

const records = ref([]);
const username = ref("");
const showMistakes = ref(false);
const activeRecord = ref(null);
const focusedPageIndex = ref(0);
const currentTitle = ref("");

const getStoredUser = () => {
  try {
    const rawUser = localStorage.getItem("scan_learning_user");
    return rawUser ? JSON.parse(rawUser) : null;
  } catch (error) {
    localStorage.removeItem("scan_learning_user");
    return null;
  }
};

const isJuniorTitle = (title) =>
  String(title || "").includes("天津外研社新教材初中");

const isCurrentJuniorTitle = computed(() => {
  if (isJuniorTitle(currentTitle.value)) return true;
  return records.value.some((item) => isJuniorTitle(item?.title));
});

const totalPages = computed(() => (isCurrentJuniorTitle.value ? 80 : 159));

const visibleRecords = computed(() =>
  records.value.filter((item) => Number(item?.page_index || 0) <= totalPages.value)
);

const practicedCount = computed(
  () => visibleRecords.value.filter((item) => item.accuracy_text).length
);

const isPerfectRecord = (item) =>
  item.accuracy_text && Number(item.correct_count) === Number(item.total_count);

const getPageLabel = (pageIndex) => {
  if (!pageIndex) return "";
  const page = Math.ceil(pageIndex / 2);
  const side = pageIndex % 2 === 1 ? 1 : 2;
  return `${page}-${side}`;
};

const getRecordPageLabel = (item) => {
  const rawTitle = String(item?.title || currentTitle.value || "");
  const pageLabel = item?.page_label || getPageLabel(Number(item?.page_index || 0));
  if (isJuniorTitle(rawTitle) || isCurrentJuniorTitle.value) {
    return pageLabel ? `初中词汇${pageLabel}` : "初中词汇";
  }
  return pageLabel;
};

const getTargetPageIndex = () => {
  const queryIndex = Number(route.query.pageIndex || 0);
  const stateIndex = Number(history.state?.pageIndex || 0);
  return queryIndex || stateIndex || 0;
};

const scrollToTargetRecord = async () => {
  const pageIndex = getTargetPageIndex();
  if (!pageIndex) return;
  await nextTick();
  const target = document.querySelector(`[data-page-index="${pageIndex}"]`);
  if (target) {
    const stickyHeaderHeight =
      document.querySelector(".records-sticky")?.offsetHeight || 104;
    const targetTop =
      target.getBoundingClientRect().top +
      window.pageYOffset -
      stickyHeaderHeight -
      90;
    window.scrollTo({
      top: Math.max(targetTop, 0),
      behavior: "smooth",
    });
    window.setTimeout(() => {
      focusedPageIndex.value = pageIndex;
      window.setTimeout(() => {
        if (focusedPageIndex.value === pageIndex) {
          focusedPageIndex.value = 0;
        }
      }, 5000);
    }, 850);
  }
};

const handleBack = () => {
  if (route.query.from === "homepage") {
    router.back();
    return;
  }
  router.replace("/homepage");
};

const queryPracticeRecords = async () => {
  const user = getStoredUser();
  if (!user?.username) {
    showFailToast("请先注册/登录");
    router.replace("/homepage");
    return;
  }

  username.value = user.username;
  currentTitle.value = route.query.title || history.state?.title || "";
  const toast = showLoadingToast({
    duration: 0,
    message: "加载中...",
  });

  const params = new URLSearchParams();
  params.append("method", "queryScanLearningPracticeGrid");
  params.append("username", user.username);
  params.append("title", currentTitle.value);

  try {
    const response = await axios.post("scans/", params);
    if (response.data?.status !== "ok") {
      showFailToast(response.data?.message || "加载失败");
      return;
    }
    records.value = response.data.data || [];
    scrollToTargetRecord();
  } catch (error) {
    showFailToast("加载失败");
  } finally {
    toast.close();
  }
};

const getUserAnswer = (item) => {
  const value = item?.用户选择;
  if (Array.isArray(value)) return value.join("；");
  return value || "无";
};

const getCorrectAnswer = (item) => item?.正确答案 || item?.答案 || "";

const openMistakes = (item) => {
  if (!item.accuracy_text) return;
  if (isPerfectRecord(item)) {
    showDialog({
      title: `${getRecordPageLabel(item)} 全对`,
      message: "太棒了，这一页全对！继续保持这个节奏。",
      theme: "round-button",
    });
    return;
  }
  activeRecord.value = item;
  showMistakes.value = true;
};

onMounted(() => {
  queryPracticeRecords();
});
</script>

<template>
  <div class="records-page">
    <div class="records-sticky">
      <van-nav-bar
        title="点击记录"
        left-arrow
        :left-text="username"
        @click-left="handleBack"
      />

      <div class="records-summary">
        <div>
          <div class="summary-number">{{ practicedCount }}/{{ totalPages }}</div>
          <div class="summary-label">已点击页码</div>
        </div>
        <van-button size="small" type="primary" plain @click="queryPracticeRecords">
          刷新
        </van-button>
      </div>
    </div>

    <div class="records-grid">
      <div
        v-for="item in visibleRecords"
        :key="item.page_index"
        class="record-cell"
        :class="{
          empty: !item.accuracy_text,
          perfect: isPerfectRecord(item),
          spotlight: focusedPageIndex === item.page_index,
        }"
        :data-page-index="item.page_index"
        @click="openMistakes(item)"
      >
        <div class="page-label">{{ getRecordPageLabel(item) }}</div>
        <div v-if="item.accuracy_text" class="accuracy-text">
          {{ item.accuracy_text }}
        </div>
      </div>
    </div>

    <van-popup
      v-model:show="showMistakes"
      position="bottom"
      round
      :style="{ height: '70%' }"
    >
      <div class="mistake-panel">
        <div class="mistake-header">
          <div>
            <div class="mistake-title">{{ getRecordPageLabel(activeRecord) }}</div>
            <div class="mistake-subtitle">
              最近一次正确率 {{ activeRecord?.accuracy_text || "" }}
            </div>
          </div>
          <van-button size="small" type="primary" plain @click="showMistakes = false">
            关闭
          </van-button>
        </div>

        <div v-if="activeRecord?.mistakes?.length" class="mistake-list">
          <div
            v-for="(mistake, index) in activeRecord.mistakes"
            :key="index"
            class="mistake-item"
          >
            <div class="mistake-word">{{ mistake.英文 }}</div>
            <div class="mistake-row">正确答案：{{ getCorrectAnswer(mistake) }}</div>
            <div class="mistake-row wrong">用户选择：{{ getUserAnswer(mistake) }}</div>
          </div>
        </div>
        <van-empty v-else description="最近一次全对，没有错词" />
      </div>
    </van-popup>
  </div>
</template>

<style scoped>
.records-page {
  min-height: 100vh;
  background: #f5f7fb;
}

.records-sticky {
  position: sticky;
  top: 0;
  z-index: 20;
  background: #fff;
  box-shadow: 0 4px 14px rgba(15, 23, 42, 0.08);
}

.records-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  background: #fff;
  border-bottom: 1px solid #e8edf3;
}

.summary-number {
  color: #1a89fa;
  font-size: 22px;
  font-weight: 800;
  line-height: 1.1;
}

.summary-label {
  margin-top: 4px;
  color: #6b7280;
  font-size: 12px;
}

.records-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 8px;
  padding: 12px 12px 28px;
}

.record-cell {
  position: relative;
  overflow: hidden;
  min-height: 58px;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  background: #fff;
  color: #145db2;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  cursor: pointer;
}

.record-cell::before,
.record-cell::after {
  content: "";
  position: absolute;
  pointer-events: none;
  opacity: 0;
}

.record-cell::before {
  inset: -28px;
  border-radius: 22px;
  border: 4px solid rgba(250, 204, 21, 1);
  box-shadow:
    0 0 0 28px rgba(250, 204, 21, 0.2),
    0 0 42px rgba(245, 158, 11, 0.95),
    0 0 68px rgba(251, 191, 36, 0.62);
}

.record-cell::after {
  top: -45%;
  bottom: -45%;
  left: -80%;
  width: 55%;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.78),
    transparent
  );
  transform: rotate(18deg);
}

.record-cell.spotlight {
  z-index: 12;
  animation: focus-pop 5s ease-in-out both;
}

.record-cell.spotlight::before {
  animation: focus-ring 5s ease-out both;
}

.record-cell.spotlight::after {
  animation: focus-shine 1.8s ease-out 0.45s both;
}

.record-cell.empty {
  border-color: #d1d5db;
  background: #e5e7eb;
  color: #8b949e;
  cursor: default;
}

.record-cell.perfect {
  border-color: #f59e0b;
  background:
    linear-gradient(145deg, #fff7cc 0%, #facc15 52%, #d97706 100%);
  color: #5f370e;
  box-shadow: 0 6px 14px rgba(217, 119, 6, 0.28);
}

.record-cell.perfect .page-label {
  color: #5f370e;
}

.record-cell.perfect .accuracy-text {
  color: #713f12;
  font-weight: 800;
}

.page-label {
  font-size: 14px;
  font-weight: 800;
  line-height: 1.2;
}

.accuracy-text {
  margin-top: 5px;
  font-size: 12px;
  line-height: 1.2;
}

@keyframes focus-pop {
  0% {
    transform: scale(1);
  }
  12% {
    transform: scale(1.42);
    box-shadow: 0 12px 34px rgba(245, 158, 11, 0.48);
  }
  26% {
    transform: scale(1.24);
  }
  44% {
    transform: scale(1.32);
  }
  68% {
    transform: scale(1.14);
  }
  84% {
    transform: scale(1.08);
  }
  100% {
    transform: scale(1);
  }
}

@keyframes focus-ring {
  0% {
    opacity: 0;
    transform: scale(2.4);
  }
  12% {
    opacity: 1;
    transform: scale(1.65);
  }
  38% {
    opacity: 1;
    transform: scale(1.12);
  }
  70% {
    opacity: 0.78;
    transform: scale(1);
  }
  100% {
    opacity: 0;
    transform: scale(0.78);
  }
}

@keyframes focus-shine {
  0% {
    opacity: 0;
    left: -80%;
  }
  22% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    left: 130%;
  }
}

.mistake-panel {
  height: 100%;
  padding: 16px;
  overflow-y: auto;
  box-sizing: border-box;
  background: #f8fafc;
}

.mistake-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.mistake-title {
  color: #111827;
  font-size: 20px;
  font-weight: 800;
}

.mistake-subtitle {
  margin-top: 4px;
  color: #6b7280;
  font-size: 13px;
}

.mistake-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.mistake-item {
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
}

.mistake-word {
  color: #145db2;
  font-size: 16px;
  font-weight: 800;
  word-break: break-word;
}

.mistake-row {
  margin-top: 8px;
  color: #374151;
  font-size: 14px;
  line-height: 1.4;
  word-break: break-word;
}

.mistake-row.wrong {
  color: #b91c1c;
}
</style>
