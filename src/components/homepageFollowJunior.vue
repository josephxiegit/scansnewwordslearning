<script setup>
import { ref, onMounted, onUnmounted, getCurrentInstance, computed } from "vue";
import "vant/lib/index.css";

import gsap from "gsap";

defineProps({
  msg: String,
});
import {
  showFailToast,
  showLoadingToast,
  showConfirmDialog,
  showDialog,
  closeToast,
  showSuccessToast,
  FloatingPanel,
  Tabs,
  Tab,
  Grid,
  GridItem,
  List,
  Cell,
  CellGroup,
} from "vant";
import "vant/lib/index.css";
import FingerprintJS from "@fingerprintjs/fingerprintjs";
import welcomeFollowJunior from "./animation/welcomeFollowJunior.vue";

const instance = getCurrentInstance();
const axios = instance.appContext.config.globalProperties.$ajax;

// 音频缓存和单词列表
const audioCache = new Map();
const wordsList = ref([]);
const originalWordsList = ref([]);
const isShuffled = ref(false);
const showWordsList = ref(false);
const currentEpisode = ref(0);
const currentPlayingWord = ref("");
const isContinuousReading = ref(false);
const continuousReadingRepeatCount = ref(2);
const continuousReadingProgress = ref(null);
const preloadingEpisode = ref(null);
const episodeDataCache = new Map();
let continuousReadingSession = 0;
let currentAudio = null;
let currentAudioUrl = "";
let currentAudioResolve = null;
let persistentAudio = null;

const showTabNav = ref(false);

// 保存原始标题
let originalTitle = "";
// 当前页面的单元信息
const currentUnit = ref("");

const maxEpisode = 40;

// 组件挂载时设置浏览器标题
onMounted(() => {
  originalTitle = document.title;
  document.title = "天津外研社教材跟读";
  wordsList.value = [];
});

// 组件卸载时恢复原始标题
onUnmounted(() => {
  if (originalTitle) {
    document.title = originalTitle;
  }
  stopContinuousReading(true);
});

// 返回主页方法
function goToHomepage() {
  window.location.reload();
}

// 上一页功能
function goToPreviousPage() {
  stopContinuousReading(true);
  resetContinuousReadingProgress();
  if (currentEpisode.value > 1) {
    const prevEpisode = currentEpisode.value - 1;
    handleEpisodeClick(prevEpisode);
  }
}

// 下一页功能
function goToNextPage() {
  stopContinuousReading(true);
  resetContinuousReadingProgress();
  if (currentEpisode.value < maxEpisode) {
    const nextEpisode = currentEpisode.value + 1;
    handleEpisodeClick(nextEpisode);
  }
}

// 选页相关状态
const panelheight = ref(559);
const activeTab = ref(0);
const episodesData = ref([
  [], // 1-10页
  [], // 11-20页
  [], // 21-30页
  [], // 31-40页
]);

// 记录最后一次点击的页码
const lastClickedEpisode = ref(null);

// 生成页码数据：40页分4组
const generateEpisodesData = () => {
  episodesData.value = [[], [], [], []];
  for (let i = 1; i <= 10; i++) episodesData.value[0].push(i);
  for (let i = 11; i <= 20; i++) episodesData.value[1].push(i);
  for (let i = 21; i <= 30; i++) episodesData.value[2].push(i);
  for (let i = 31; i <= 40; i++) episodesData.value[3].push(i);
};

// Base64转Blob函数
const base64ToBlob = (base64, mimeType) => {
  const byteString = atob(base64);
  const arrayBuffer = new ArrayBuffer(byteString.length);
  const uint8Array = new Uint8Array(arrayBuffer);
  for (let i = 0; i < byteString.length; i++) {
    uint8Array[i] = byteString.charCodeAt(i);
  }
  return new Blob([arrayBuffer], { type: mimeType });
};

const continuousReadingButtonText = computed(() => {
  if (isContinuousReading.value) return "暂停";
  return continuousReadingProgress.value ? "继续" : "连读";
});

const resetContinuousReadingProgress = () => {
  continuousReadingProgress.value = null;
};

const canAccessEpisode = (episode) => {
  if (isTrialMode.value && episode > 2) return false;
  return true;
};

// 按 nid 升序排序（保留Excel导入时的原始顺序）
const sortWords = (answers) => {
  return answers.sort((a, b) => a.nid - b.nid);
};

const loadEpisodeData = async (episode, showAudioFailureDialog = true) => {
  const cacheKey = `junior-${episode}`;
  if (episodeDataCache.has(cacheKey)) {
    return episodeDataCache.get(cacheKey);
  }

  const answers = sortWords(await queryData(episode));
  const answerSheetProList = answers.map((item) => ({
    word: item.word,
    showChinese: false,
    audio: null,
  }));

  let params = new URLSearchParams();
  params.append("method", "getAudioList");
  params.append("word_list", JSON.stringify(answerSheetProList));

  const response = await axios.post("scans/", params);

  if (response.data.success && response.data.audio_data) {
    Object.entries(response.data.audio_data).forEach(([word, obj]) => {
      try {
        const blob = base64ToBlob(obj.data, "audio/mpeg");
        audioCache.set(word, blob);
      } catch (err) {
        console.warn(`音频转换失败: ${word}`, err);
      }
    });

    if (
      showAudioFailureDialog &&
      response.data.failed_words &&
      response.data.failed_words.length > 0
    ) {
      const failedList = response.data.failed_words.join("，");
      showConfirmDialog({
        theme: "round-button",
        title: "音频加载失败",
        message: `以下单词的音频未能加载：\n${failedList}`,
        confirmButtonText: "知道了",
      }).catch(() => {});
    }
  }

  const unit = answers.length > 0 ? (answers[0].unit || "") : "";
  currentUnit.value = unit;

  const episodeData = {
    words: answers,
    originalWords: [...answers],
    unit: unit,
  };
  episodeDataCache.set(cacheKey, episodeData);
  return episodeData;
};

const applyEpisodeData = (episode, episodeData) => {
  lastClickedEpisode.value = episode;
  currentEpisode.value = episode;
  wordsList.value = episodeData.words;
  originalWordsList.value = [...episodeData.originalWords];
  isShuffled.value = false;
  currentUnit.value = episodeData.unit || "";
  showWordsList.value = true;
};

const preloadNextEpisode = (episode) => {
  const nextEpisode = episode + 1;
  if (
    nextEpisode > maxEpisode ||
    preloadingEpisode.value === nextEpisode ||
    !canAccessEpisode(nextEpisode)
  ) {
    return;
  }
  preloadingEpisode.value = nextEpisode;
  loadEpisodeData(nextEpisode, false)
    .catch((error) => {
      console.warn(`预加载第${nextEpisode}页失败:`, error);
    })
    .finally(() => {
      if (preloadingEpisode.value === nextEpisode) {
        preloadingEpisode.value = null;
      }
    });
};

const getPersistentAudio = () => {
  if (!persistentAudio) {
    persistentAudio = new Audio();
    persistentAudio.preload = "auto";
  }
  return persistentAudio;
};

const cleanupCurrentAudio = () => {
  const audio = currentAudio;
  const audioUrl = currentAudioUrl;
  const resolveAudio = currentAudioResolve;

  currentAudio = null;
  currentAudioUrl = "";
  currentAudioResolve = null;

  if (audio) {
    audio.onended = null;
    audio.onerror = null;
    audio.pause();
    audio.src = "";
    try { audio.currentTime = 0; } catch (e) {}
  }

  if (audioUrl && audioUrl.startsWith("blob:")) {
    setTimeout(() => {
      try { URL.revokeObjectURL(audioUrl); } catch (e) {}
    }, 100);
  }

  if (resolveAudio) resolveAudio("cancelled");
};

const clearPlayingWordLater = (word) => {
  setTimeout(() => {
    if (currentPlayingWord.value === word) {
      currentPlayingWord.value = "";
    }
  }, 300);
};

const playAudioElement = (word, audioUrl, isBlobUrl = false) => {
  cleanupCurrentAudio();

  const audio = getPersistentAudio();
  currentAudio = audio;
  currentAudioUrl = audioUrl;

  return new Promise((resolve) => {
    let settled = false;
    const finish = (success = true) => {
      if (settled) return;
      settled = true;

      audio.onended = null;
      audio.onerror = null;

      if (currentAudio === audio) currentAudio = null;
      if (currentAudioResolve === finish) currentAudioResolve = null;
      if (isBlobUrl && audioUrl && currentAudioUrl === audioUrl) {
        setTimeout(() => {
          try { URL.revokeObjectURL(audioUrl); } catch (e) {}
        }, 100);
        currentAudioUrl = "";
      }
      clearPlayingWordLater(word);
      resolve(success);
    };

    currentAudioResolve = finish;
    audio.onended = () => finish(true);
    audio.onerror = () => {
      console.warn(`音频播放错误: ${word}`);
      finish(false);
    };

    audio.src = audioUrl;
    audio.load();

    audio.play().catch((err) => {
      console.warn(`播放音频失败: ${word}`, err);
      finish(false);
    });
  });
};

// 播放单词音频
const playWordAudio = (word, fromContinuousReading = false) => {
  if (!fromContinuousReading) {
    stopContinuousReading(true);
    resetContinuousReadingProgress();
  }

  currentPlayingWord.value = word;

  const audioBlob = audioCache.get(word);
  if (audioBlob) {
    const audioUrl = URL.createObjectURL(audioBlob);
    return playAudioElement(word, audioUrl, true).then((success) => {
      if (success === "cancelled") return;
      if (!success) {
        const fallbackUrl = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(word)}&type=1`;
        return playAudioElement(word, fallbackUrl, false).then((fallbackSuccess) => {
          if (fallbackSuccess === "cancelled") return;
          if (!fallbackSuccess && !fromContinuousReading) {
            showFailToast("发音失败，请稍后重试");
          }
          if (currentPlayingWord.value === word) currentPlayingWord.value = "";
        });
      }
      if (currentPlayingWord.value === word) currentPlayingWord.value = "";
    });
  } else {
    const fallbackUrl = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(word)}&type=1`;
    return playAudioElement(word, fallbackUrl, false).then((success) => {
      if (success === "cancelled") return;
      if (!success && !fromContinuousReading) {
        showFailToast("发音失败，请稍后重试");
      }
      if (currentPlayingWord.value === word) currentPlayingWord.value = "";
    });
  }
};

const waitForContinuousReading = (ms, sessionId) =>
  new Promise((resolve) => {
    setTimeout(() => {
      resolve(isContinuousReading.value && continuousReadingSession === sessionId);
    }, ms);
  });

function stopContinuousReading(silent = false, keepProgress = false) {
  if (!isContinuousReading.value && !currentAudio) return;
  continuousReadingSession += 1;
  isContinuousReading.value = false;
  cleanupCurrentAudio();
  currentPlayingWord.value = "";
  if (!keepProgress) resetContinuousReadingProgress();
  if (!silent) showSuccessToast("已暂停连读");
}

const startContinuousReading = async () => {
  if (isContinuousReading.value) return;
  if (!currentEpisode.value) {
    showFailToast("请先选择页码");
    return;
  }

  isContinuousReading.value = true;
  const sessionId = ++continuousReadingSession;
  let episode = continuousReadingProgress.value?.episode || currentEpisode.value;
  let wordIndex = continuousReadingProgress.value?.wordIndex || 0;
  let repeatIndex = continuousReadingProgress.value?.repeatIndex || 0;

  try {
    while (
      isContinuousReading.value &&
      continuousReadingSession === sessionId &&
      episode <= maxEpisode
    ) {
      const loaded = await handleEpisodeClick(episode, true);
      if (!loaded) break;

      preloadNextEpisode(episode);
      const pageWords = [...wordsList.value];
      let pageCompleted = true;
      for (let index = wordIndex; index < pageWords.length; index++) {
        const item = pageWords[index];
        if (!isContinuousReading.value || continuousReadingSession !== sessionId) {
          pageCompleted = false;
          break;
        }
        for (
          let repeat = index === wordIndex ? repeatIndex : 0;
          repeat < continuousReadingRepeatCount.value;
          repeat++
        ) {
          continuousReadingProgress.value = { episode, wordIndex: index, repeatIndex: repeat };
          await playWordAudio(item.word, true);
          if (!isContinuousReading.value || continuousReadingSession !== sessionId) {
            pageCompleted = false;
            break;
          }
          continuousReadingProgress.value = { episode, wordIndex: index, repeatIndex: repeat + 1 };
          const shouldContinue = await waitForContinuousReading(350, sessionId);
          if (!shouldContinue) {
            pageCompleted = false;
            break;
          }
        }
        if (!isContinuousReading.value || continuousReadingSession !== sessionId) {
          pageCompleted = false;
          break;
        }
      }
      if (!pageCompleted) break;
      episode += 1;
      wordIndex = 0;
      repeatIndex = 0;
      continuousReadingProgress.value = { episode, wordIndex: 0, repeatIndex: 0 };
    }
  } catch (error) {
    console.error("连读失败:", error);
    showFailToast("连读中断，请稍后重试");
  } finally {
    if (continuousReadingSession === sessionId) {
      isContinuousReading.value = false;
      cleanupCurrentAudio();
      currentPlayingWord.value = "";
      resetContinuousReadingProgress();
    }
  }
};

// 乱序动画函数
const animateShuffle = () => {
  const cells = document.querySelectorAll(".word-cell");
  gsap.to(cells, {
    x: () => (Math.random() - 0.5) * 200,
    y: () => (Math.random() - 0.5) * 200,
    rotation: () => (Math.random() - 0.5) * 90,
    opacity: 0.2,
    duration: 0.4,
    stagger: 0.05,
    onComplete: () => {
      gsap.to(cells, {
        x: 0,
        y: 0,
        rotation: 0,
        opacity: 1,
        duration: 0.6,
        ease: "back.out(1.7)",
        stagger: 0.05,
      });
    },
  });
};

// 点击页码处理函数
const handleEpisodeClick = async (episode, fromContinuousReading = false) => {
  if (!fromContinuousReading) {
    stopContinuousReading(true);
    resetContinuousReadingProgress();
  }

  if (!canAccessEpisode(episode)) {
    showDialog({
      title: "购买提示",
      message: "联系微信179254624购买",
      theme: "round-button",
    });
    return false;
  }

  lastClickedEpisode.value = episode;
  currentEpisode.value = episode;

  const toast = showLoadingToast({
    duration: 0,
    forbidClick: true,
    message: "加载词汇音频...",
    loadingType: "spinner",
  });

  try {
    const episodeData = await loadEpisodeData(episode);
    applyEpisodeData(episode, episodeData);
  } catch (error) {
    console.error("音频加载失败:", error);
    showFailToast("加载失败，请稍后重试");
    return false;
  } finally {
    toast.close();
  }

  panelheight.value = 90;
  return true;
};

// 单词乱序功能
const toggleShuffle = async () => {
  let newOrder;
  if (isShuffled.value) {
    newOrder = [...originalWordsList.value];
  } else {
    newOrder = [...wordsList.value].sort(() => Math.random() - 0.5);
  }
  animateShuffle();
  setTimeout(() => {
    wordsList.value = newOrder;
    isShuffled.value = !isShuffled.value;
  }, 200);
};

// 初始化生成页码数据
generateEpisodesData();

// ========== 欢迎页 ==========
const showWelcome = ref(true);

function onWelcomeConfirm() {
  showWelcome.value = false;
  // 欢迎页关闭后，开始机器码验证流程
  startVerification();
}

// ========== 机器码验证 ==========
const showCodeInput = ref(false);
const bindCode = ref("");
const isTrialMode = ref(false);

async function queryData(page) {
  const params = new URLSearchParams();
  params.append("method", "queryFollowDataJunior");
  params.append("page", page);
  const response = await axios.post("scans/", params);
  return response.data;
}

// 试用模式
const startTrialMode = () => {
  showCodeInput.value = false;
  isTrialMode.value = true;
  localStorage.setItem("isTrialMode_junior", "true");
};

// 录入机器码
const newCode = async () => {
  if (!bindCode.value) {
    showFailToast("不能为空");
    return;
  }
  const toast1 = showLoadingToast({ duration: 0, message: "验证中..." });
  const clientId = getOrCreateClientId();
  const deviceFingerprint = await getStableFingerprint();
  const fingerprintHash = deviceFingerprint.visitorId;
  const components = Object.fromEntries(
    Object.entries(deviceFingerprint.components).map(([key, val]) => [key, val.value])
  );
  const response = await axios.post("scans/", {
    method: "newCode",
    clientId,
    fingerprintHash,
    components,
    bindCode: bindCode.value,
    type: "跟读-初中",
  });
  toast1.close();
  if (response.data.status === "ok") {
    showCodeInput.value = false;
    showSuccessToast("验证成功");
    localStorage.setItem("bindCode_junior", bindCode.value);
    localStorage.setItem("isTrialMode_junior", "false");
    isTrialMode.value = false;
  }
  if (response.data.status === false) {
    localStorage.removeItem("bindCode_junior");
    localStorage.removeItem("client_id_junior");
    showDialog({
      title: "机器码录入错误",
      message: "如有异议联系老师：\n微179254624，获新机器码",
      theme: "round-button",
    }).then(() => { window.location.reload(); });
  }
  if (response.data.status === "forbidden") {
    localStorage.removeItem("bindCode_junior");
    localStorage.removeItem("client_id_junior");
    showDialog({
      title: "机器码已作废",
      message: "如有异议联系老师：\n微179254624，获新机器码",
      theme: "round-button",
    }).then(() => { window.location.reload(); });
  }
};

function getUUID() {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
    throw new Error("crypto.randomUUID not supported");
  } catch (e) {
    return "uuid-" + Date.now() + "-" + Math.floor(Math.random() * 1000000);
  }
}

const getOrCreateClientId = () => {
  let clientId = localStorage.getItem("client_id_junior");
  if (!clientId) {
    clientId = getUUID();
    localStorage.setItem("client_id_junior", clientId);
  }
  return clientId;
};

const getStableFingerprint = async () => {
  const fp = await FingerprintJS.load();
  const result = await fp.get();
  return result;
};

// ========== 验证流程（欢迎页点击确定后触发） ==========
async function startVerification() {
  if (!localStorage.getItem("client_id_junior")) {
    showCodeInput.value = true;
    return;
  }

  const toast1 = showLoadingToast({ duration: 0, message: "验证中..." });

  const clientId = localStorage.getItem("client_id_junior");
  const bindCode = localStorage.getItem("bindCode_junior");
  const deviceFingerprint = await getStableFingerprint();
  const fingerprintHash = deviceFingerprint.visitorId;
  const components = Object.fromEntries(
    Object.entries(deviceFingerprint.components).map(([key, val]) => [key, val.value])
  );

  try {
    const response = await axios.post("scans/", {
      method: "checkCode",
      clientId,
      fingerprintHash,
      components,
      bindCode,
      type: "跟读-初中",
    });
    toast1.close();

    if (response.data.status === "ok") {
      localStorage.setItem("isTrialMode_junior", "false");
      isTrialMode.value = false;
    }

    if (response.data.status === "forbidden") {
      localStorage.removeItem("bindCode_junior");
      localStorage.removeItem("client_id_junior");
      showDialog({
        title: "机器码已被其他机器绑定",
        message: "如有异议联系老师：\n微179254624，获新机器码",
        theme: "round-button",
      }).then(() => { window.location.reload(); });
    }

    if (response.data.status === "false") {
      localStorage.removeItem("bindCode_junior");
      localStorage.removeItem("client_id_junior");
      showCodeInput.value = true;
      showFailToast("请再次录入");
    }
  } catch (err) {
    toast1.close();
    localStorage.removeItem("bindCode_junior");
    localStorage.removeItem("client_id_junior");
    showCodeInput.value = true;
    console.error("绑定异常:", err);
  }

  // 试用模式
  const trialMode = localStorage.getItem("isTrialMode_junior");
  if (trialMode === "true") {
    isTrialMode.value = true;
  }
}
</script>

<template>
  <div class="parent-container">
    <div class="nav-bar-container">
      <van-nav-bar
        left-text="主页"
        title="天津外研社教材跟读"
        @click-left="goToHomepage"
      ></van-nav-bar>
    </div>

    <!-- 欢迎页 -->
    <welcomeFollowJunior v-if="showWelcome" @confirm="onWelcomeConfirm" />

    <!-- 导航 -->
    <router-view />
    <van-tabbar route v-show="showTabNav">
      <van-tabbar-item icon="home-o" replace to="/homepage">主页</van-tabbar-item>
      <van-tabbar-item icon="coupon-o" replace :to="{ path: '/xlsms' }">xlsm</van-tabbar-item>
      <van-tabbar-item icon="shopping-cart-o" replace :to="{ path: '/studentAccountData' }">试题</van-tabbar-item>
      <van-tabbar-item icon="comment-o" replace :to="{ path: '/studentAccountItems' }">日志</van-tabbar-item>
    </van-tabbar>

    <!-- 输入机器码 -->
    <van-popup
      v-model:show="showCodeInput"
      position="bottom"
      :style="{ height: '85%' }"
      :close-on-click-overlay="false"
      round
    >
      <div style="font-size: 18px; font-weight: 700; margin: 1rem 2rem 1rem 1rem">
        录入机器码（初中）
      </div>
      <van-cell-group inset>
        <van-field
          v-model="bindCode"
          label="机器码"
          placeholder="录入初中跟读机器码"
        />
        <van-button
          @click="newCode"
          size="large"
          type="success"
          style="margin-top: 2rem"
        >
          完成
        </van-button>
        <van-button
          @click="startTrialMode"
          size="large"
          type="warning"
          style="margin-top: 1rem"
        >
          试用
        </van-button>
      </van-cell-group>
    </van-popup>

    <!-- 连读与选页控制区 -->
    <div class="floating-read-controls">
      <van-button
        type="primary"
        size="small"
        :disabled="!currentEpisode || currentEpisode <= 1"
        @click="goToPreviousPage"
      >
        上一页
      </van-button>
      <van-button
        :type="isContinuousReading ? 'warning' : 'success'"
        size="small"
        :disabled="!currentEpisode"
        @click="isContinuousReading ? stopContinuousReading(false, true) : startContinuousReading()"
      >
        {{ continuousReadingButtonText }}
      </van-button>
      <van-button
        type="primary"
        size="small"
        :disabled="!currentEpisode || currentEpisode >= maxEpisode"
        @click="goToNextPage"
      >
        下一页
      </van-button>
      <div class="continuous-repeat-control">
        <span>每词</span>
        <van-stepper
          v-model="continuousReadingRepeatCount"
          integer
          :min="1"
          :max="3"
          :disabled="isContinuousReading"
          button-size="22px"
          input-width="26px"
        />
        <span>遍</span>
      </div>
      <van-button type="success" round size="normal" @click="panelheight = 559">
        选页
      </van-button>
    </div>

    <!-- 浮动面板 -->
    <van-floating-panel
      v-model:height="panelheight"
      :close-on-click-overlay="true"
    >
      <div class="floating-panel-content">
        <div
          v-if="panelheight > 90"
          class="close-panel-arrow"
          @click="panelheight = 90"
        >
          <van-icon name="arrow-down" size="24" color="#1989fa" />
        </div>
        <van-tabs v-model:active="activeTab" animated>
          <van-tab
            v-for="(group, index) in episodesData"
            :title="`${group[0]}-${group[group.length - 1]}页`"
            :key="index"
          >
            <van-grid :column-num="5" :gutter="10" style="padding: 5px" square>
              <van-grid-item
                v-for="episode in group"
                :key="episode"
                class="episode-item-wrapper"
                :class="{ 'trial-disabled': isTrialMode && episode > 2 }"
                @click="handleEpisodeClick(episode)"
              >
                <div
                  class="episode-item"
                  :class="{
                    'episode-active': lastClickedEpisode === episode,
                    'trial-disabled-item': isTrialMode && episode > 2,
                  }"
                >
                  <span class="episode-number">{{ episode }}</span>
                </div>
              </van-grid-item>
            </van-grid>
          </van-tab>
        </van-tabs>
      </div>
    </van-floating-panel>

    <!-- 单词列表 -->
    <div
      v-if="showWordsList"
      class="words-list-container"
      :style="{ width: '100%', padding: '16px', boxSizing: 'border-box', overflowX: 'hidden' }"
    >
      <div style="display: flex; align-items: center; justify-content: center; margin-bottom: 16px; position: relative;">
        <div style="position: absolute; left: 16px; top: 50%; transform: translateY(-50%);">
          <img src="../assets/sheep_1.gif" alt="单词图标" style="width: 40px; height: 40px;" />
        </div>
        <h3 style="font-size: 18px; font-weight: bold; margin: 0; position: absolute; left: 50%; transform: translateX(-50%); white-space: nowrap;">
          第{{ currentEpisode }}页 单词列表
        </h3>
        <van-button
          size="small"
          type="danger"
          :plain="!isShuffled"
          @click="toggleShuffle"
          style="margin-left: auto; z-index: 10"
        >
          {{ isShuffled ? "恢复" : "乱序" }}
        </van-button>
      </div>

      <van-list
        :loading="false"
        :finished="true"
        :finished-text="'没有更多了'"
        style="max-height: 500px; overflow-y: auto; overflow-x: hidden; width: 100%; position: relative;"
      >
        <van-cell-group>
          <van-cell
            v-for="(item, index) in wordsList"
            :key="index"
            :title="`${item.nid || index + 1}. ${item.word}`"
            @click="playWordAudio(item.word)"
            style="cursor: pointer; margin-top: 10px;"
            :class="['word-cell', { 'word-active': currentPlayingWord === item.word }]"
          >
            <template #left-icon>
              <img src="../assets/speaker.png" style="width: 24px; height: 24px; margin-right: 8px" alt="发音图标" />
            </template>
            <template #extra>
              <span class="unit-label">{{ item.unit || '' }}</span>
              <van-icon
                name="volume-o"
                size="18"
                color="#1989fa"
                @click.stop="playWordAudio(item.word)"
                class="unit-speaker"
              />
            </template>
          </van-cell>
        </van-cell-group>
      </van-list>
    </div>
  </div>
</template>

<style scoped>
html,
body {
  touch-action: manipulation;
  overflow-x: hidden !important;
  width: 100% !important;
  position: relative;
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

.nav-bar-container {
  position: sticky;
  top: 0;
  z-index: 100;
}

.floating-panel-content {
  height: 100%;
  overflow-y: auto;
  position: relative;
}

.close-panel-arrow {
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 10;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #fff;
  border-radius: 50%;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: all 0.3s;
}

.close-panel-arrow:active {
  transform: scale(0.95);
}

.episode-item-wrapper {
  padding: 8px;
  box-sizing: border-box;
}

.episode-item {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 40px;
  width: 100%;
  cursor: pointer;
}

.van-cell {
  position: relative;
  box-sizing: border-box;
  overflow: hidden;
  transition: all 0s !important;
}

.word-active {
  background-color: rgba(25, 137, 250, 0.1) !important;
  transition: background-color 0.1s ease !important;
}

.word-active :deep(*) {
  transform: none !important;
  font-weight: inherit !important;
  font-size: inherit !important;
}

.episode-item:active {
  background-color: #f0f0f0;
}

.episode-active {
  background-color: #e8f4ff;
  border: 2px solid #1989fa;
  width: 100%;
  height: 100%;
}

.episode-number {
  font-size: 16px;
  font-weight: 500;
  color: #333;
}

.episode-active .episode-number {
  color: #1989fa;
  font-weight: 700;
}

.trial-disabled-item {
  background-color: #f5f5f5;
  color: #999;
  opacity: 0.6;
}

.trial-disabled-item .episode-number {
  color: #999;
}

.trial-disabled {
  cursor: not-allowed;
}

.parent-container {
  width: 100%;
  height: 100vh;
  overflow-x: hidden;
  overflow-y: auto;
  position: relative;
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.words-list-container {
  padding: 30px;
  background-color: #fff;
  border-radius: 8px;
  margin: 16px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  overflow-x: hidden !important;
  width: calc(100% - 32px) !important;
  position: relative;
  box-sizing: border-box;
  max-width: calc(100% - 32px) !important;
}

.floating-read-controls {
  position: fixed;
  right: 16px;
  bottom: 118px;
  z-index: 99;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  flex-wrap: wrap;
  max-width: calc(100% - 32px);
  padding: 8px;
  background: rgba(255, 255, 255, 0.96);
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
}

.continuous-repeat-control {
  display: flex;
  align-items: center;
  gap: 4px;
  min-height: 36px;
  padding: 0 4px;
  color: #555;
  font-size: 13px;
  white-space: nowrap;
}

@media (max-width: 420px) {
  .floating-read-controls {
    right: 10px;
    bottom: 108px;
    gap: 6px;
    padding: 6px;
  }
}

.word-cell {
  position: relative;
  box-sizing: border-box;
  height: 40px;
  width: 100%;
  cursor: pointer;
  transition: all 0s !important;
  overflow: hidden;
  display: flex;
  align-items: center;
}

.word-cell:active {
  background-color: #f5f5f5;
}

.word-cell :deep(.van-cell__title) {
  font-size: 18px;
  font-weight: 500;
  color: #333;
  white-space: nowrap;
  flex: 1;
}

.word-cell :deep(.van-cell__extra) {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  margin-left: auto;
}

.unit-label {
  font-size: 13px;
  color: #888;
  margin-right: 6px;
  white-space: normal;
  word-break: keep-all;
  text-align: right;
  max-width: 140px;
}

.unit-speaker {
  flex-shrink: 0;
  cursor: pointer;
  transition: transform 0.15s;
}

.unit-speaker:active {
  transform: scale(1.2);
}
</style>
