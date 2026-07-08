<script setup>
import { ref, onMounted, onUnmounted, getCurrentInstance, watch, computed } from "vue";
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
import welcomeFollow from "./animation/welcomeFollow.vue";
import FingerprintJS from "@fingerprintjs/fingerprintjs";

const instance = getCurrentInstance();
const axios = instance.appContext.config.globalProperties.$ajax;

// 音频缓存和单词列表
const audioCache = new Map();
const wordsList = ref([]);
const originalWordsList = ref([]); // 保存原始单词列表
const isShuffled = ref(false); // 标记是否为乱序状态
const showWordsList = ref(false);
const showChinese = ref(false);
const showWrongWordsBook = ref(false);
const wrongWordsList = ref([]);
const wrongWordsShowChinese = ref(false);
const wrongWordsLoading = ref(false);
const expandedWrongWordKeys = ref(new Set());
const currentEpisode = ref(0);
const currentPlayingWord = ref(""); // 当前播放的单词，用于高亮显示
const isContinuousReading = ref(false); // 连读状态
const continuousReadingRepeatCount = ref(2); // 连读时每个单词重复次数
const continuousReadingProgress = ref(null);
const preloadingEpisode = ref(null);
const episodeDataCache = new Map();
let continuousReadingSession = 0;
let currentAudio = null;
let currentAudioUrl = "";
let currentAudioResolve = null;
let persistentAudio = null; // 持久化音频元素，解决安卓微信X5内核Audio对象数量限制

const showTabNav = ref(false);

// 保存原始标题，用于组件卸载时恢复
let originalTitle = "";
// 书籍版本变量
const bookVersion = ref("mini"); // 默认值为精简版 mini，完整版为 full

// 动画
const animationVisible = ref(false);
const welcomeRef = ref(null);

// 组件挂载时设置浏览器标题
onMounted(() => {
  // 保存原始标题
  originalTitle = document.title;
  // 设置新标题
  document.title = "天津高考3500跟读发音";
  
  // 清空wordsList数组
  wordsList.value = [];

  // 检查本地存储是否有保存的书籍版本
  const storedBookVersion = localStorage.getItem("bookVersion");
  if (storedBookVersion) {
    bookVersion.value = storedBookVersion;
  }

  // 监听自定义事件，获取版本选择
  window.addEventListener("version-selected", handleVersionSelected);
  window.addEventListener("wrong-book-selected", handleWrongBookSelected);
});

// 组件卸载时恢复原始标题
onUnmounted(() => {
  if (originalTitle) {
    document.title = originalTitle;
  }

  stopContinuousReading(true);

  // 移除事件监听器
  window.removeEventListener("version-selected", handleVersionSelected);
  window.removeEventListener("wrong-book-selected", handleWrongBookSelected);
});

// 处理版本选择事件
function handleVersionSelected(event) {
  bookVersion.value = event.detail.version;
  // 这里可以根据选择的版本执行相应的逻辑
  console.log("Selected book version:", bookVersion.value);
}

function handleWrongBookSelected() {
  openWrongWordsBook();
}

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
  // 根据版本确定最大页码
  const maxEpisode = bookVersion.value === "full" ? 456 : 80;
  if (currentEpisode.value < maxEpisode) {
    const nextEpisode = currentEpisode.value + 1;
    handleEpisodeClick(nextEpisode);
  }
}

function showAnimationWelcome() {
  if (welcomeRef.value.visible) {
    welcomeRef.value.hide();
  } else {
    welcomeRef.value.show();
  }
  animationVisible.value = !animationVisible.value;
}

// 选页相关状态
const panelheight = ref(90);
const activeTab = ref(0);
const episodesData = ref([
  [], // 1-20页
  [], // 21-40页
  [], // 41-60页
  [], // 61-80页
]);

// 记录最后一次点击的页码
const lastClickedEpisode = ref(null);

// 生成页码数据
const generateEpisodesData = () => {
  // 清空现有数据
  episodesData.value = [];

  if (bookVersion.value === "full") {
    // 原版书模式：每页50个单词，共9页（最后一页456-500范围，但实际只有456个单词）
    const totalPages = 9; // 456个单词，每页50个，共9页
    for (let i = 0; i < totalPages; i++) {
      const group = [];
      const start = i * 50 + 1;
      const end = i === totalPages - 1 ? 456 : (i + 1) * 50;
      for (let j = start; j <= end; j++) {
        group.push(j);
      }
      episodesData.value.push(group);
    }
  } else {
    // 精简版模式：保留原有的分组方式
    episodesData.value = [[], [], [], []];
    for (let i = 1; i <= 20; i++) {
      episodesData.value[0].push(i);
    }
    for (let i = 21; i <= 40; i++) {
      episodesData.value[1].push(i);
    }
    for (let i = 41; i <= 60; i++) {
      episodesData.value[2].push(i);
    }
    for (let i = 61; i <= 80; i++) {
      episodesData.value[3].push(i);
    }
  }
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

const getMaxEpisode = () => (bookVersion.value === "full" ? 456 : 80);
const continuousReadingButtonText = computed(() => {
  if (isContinuousReading.value) {
    return "暂停";
  }
  return continuousReadingProgress.value ? "继续" : "连读";
});

const getChineseText = (item) => item?.chinese || item?.中文 || "";
const getWrongWordKey = (item) => String(item?.word || "").trim().toLowerCase();
const wrongWordKeys = computed(
  () => new Set(wrongWordsList.value.map((item) => getWrongWordKey(item)))
);

const getStoredScanLearningUser = () => {
  try {
    const rawUser = localStorage.getItem("scan_learning_user");
    return rawUser ? JSON.parse(rawUser) : null;
  } catch (error) {
    localStorage.removeItem("scan_learning_user");
    return null;
  }
};

const getFollowUserPayload = () => {
  const storedUser = getStoredScanLearningUser();
  return {
    username: storedUser?.username || "",
    clientId: localStorage.getItem("client_id") || "",
    bindCode: localStorage.getItem("bindCode") || "",
  };
};

const resetContinuousReadingProgress = () => {
  continuousReadingProgress.value = null;
};

const canAccessEpisode = (episode) => {
  if (isTrialMode.value && bookVersion.value === "full" && episode > 10) {
    return false;
  }

  if (isTrialMode.value && bookVersion.value === "mini" && episode > 2) {
    return false;
  }

  return true;
};

const sortWords = (answers) => {
  if (bookVersion.value === "mini") {
    return answers.sort((a, b) => a.number - b.number);
  }

  return answers.sort((a, b) => {
    const wordA = a.word.toLowerCase();
    const wordB = b.word.toLowerCase();
    // 依次比较前7个字母，从第1个到第7个逐步比较
    for (let i = 0; i < 7; i++) {
      const charA = wordA[i] || "";
      const charB = wordB[i] || "";
      if (charA !== charB) {
        return charA.localeCompare(charB);
      }
    }
    // 如果前7个字母完全相同，则按整体字典序比较
    return wordA.localeCompare(wordB);
  });
};

const loadEpisodeData = async (episode, showAudioFailureDialog = true) => {
  const cacheKey = `${bookVersion.value}-${episode}`;
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
    // 成功的音频存进缓存
    Object.entries(response.data.audio_data).forEach(([word, obj]) => {
      try {
        const blob = base64ToBlob(obj.data, "audio/mpeg");
        audioCache.set(word, blob);
      } catch (err) {
        console.warn(`音频转换失败: ${word}`, err);
      }
    });

    // 检查是否有失败的词
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
      }).catch(() => {
        // 用户点了取消
      });
    }
  }

  const episodeData = {
    words: answers,
    originalWords: [...answers],
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
  showWordsList.value = true;
};

const preloadNextEpisode = (episode) => {
  const nextEpisode = episode + 1;
  const maxEpisode = getMaxEpisode();

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

// 获取持久化音频元素，整个组件生命周期只创建一个Audio实例
// 这是解决安卓微信X5内核音频问题的关键：复用Audio元素而非每次新建
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
    // 清除src释放资源，确保下次设置新src时状态干净
    audio.src = "";
    try {
      audio.currentTime = 0;
    } catch (e) {
      // X5内核可能不支持某些操作，忽略异常
    }
  }

  // 延迟撤销blob URL，避免安卓微信X5内核中的竞态条件
  if (audioUrl && audioUrl.startsWith("blob:")) {
    setTimeout(() => {
      try {
        URL.revokeObjectURL(audioUrl);
      } catch (e) {
        // 忽略撤销失败（可能已被撤销或无效URL）
      }
    }, 100);
  }

  if (resolveAudio) {
    resolveAudio("cancelled");
  }
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

  // 使用持久化Audio元素，通过更换src来播放不同单词
  // 这是解决安卓微信X5内核问题的关键：复用而非新建Audio对象
  const audio = getPersistentAudio();
  currentAudio = audio;
  currentAudioUrl = audioUrl;

  return new Promise((resolve) => {
    let settled = false;
    const finish = (success = true) => {
      if (settled) {
        return;
      }
      settled = true;

      audio.onended = null;
      audio.onerror = null;

      if (currentAudio === audio) {
        currentAudio = null;
      }
      if (currentAudioResolve === finish) {
        currentAudioResolve = null;
      }
      // 延迟撤销blob URL，确保X5内核完成资源加载后再清理
      if (isBlobUrl && audioUrl && currentAudioUrl === audioUrl) {
        setTimeout(() => {
          try {
            URL.revokeObjectURL(audioUrl);
          } catch (e) {
            // 忽略撤销失败
          }
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

    // 设置src并加载，而非创建新Audio对象
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

  // 设置当前播放的单词，用于高亮显示
  currentPlayingWord.value = word;

  const audioBlob = audioCache.get(word);
  if (audioBlob) {
    const audioUrl = URL.createObjectURL(audioBlob);

    return playAudioElement(word, audioUrl, true).then((success) => {
      if (success === "cancelled") {
        return;
      }

      if (!success) {
        const fallbackUrl = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(
          word
        )}&type=1`;
        return playAudioElement(word, fallbackUrl, false).then((fallbackSuccess) => {
          if (fallbackSuccess === "cancelled") {
            return;
          }

          if (!fallbackSuccess && !fromContinuousReading) {
            showFailToast("发音失败，请稍后重试");
          }
          if (currentPlayingWord.value === word) {
            currentPlayingWord.value = "";
          }
        });
      }
      if (currentPlayingWord.value === word) {
        currentPlayingWord.value = "";
      }
    });
  } else {
    // 如果缓存中没有，尝试使用网络发音
    const fallbackUrl = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(
      word
    )}&type=1`;
    return playAudioElement(word, fallbackUrl, false).then((success) => {
      if (success === "cancelled") {
        return;
      }

      if (!success && !fromContinuousReading) {
        showFailToast("发音失败，请稍后重试");
      }
      if (currentPlayingWord.value === word) {
        currentPlayingWord.value = "";
      }
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
  if (!isContinuousReading.value && !currentAudio) {
    return;
  }

  continuousReadingSession += 1;
  isContinuousReading.value = false;
  cleanupCurrentAudio();
  currentPlayingWord.value = "";

  if (!keepProgress) {
    resetContinuousReadingProgress();
  }

  if (!silent) {
    showSuccessToast("已暂停连读");
  }
}

const startContinuousReading = async () => {
  if (isContinuousReading.value) {
    return;
  }

  if (!currentEpisode.value) {
    showFailToast("请先选择页码");
    return;
  }

  isContinuousReading.value = true;
  const sessionId = ++continuousReadingSession;
  const maxEpisode = getMaxEpisode();
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
      if (!loaded) {
        break;
      }

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
          continuousReadingProgress.value = {
            episode,
            wordIndex: index,
            repeatIndex: repeat,
          };

          await playWordAudio(item.word, true);
          if (!isContinuousReading.value || continuousReadingSession !== sessionId) {
            pageCompleted = false;
            break;
          }

          continuousReadingProgress.value = {
            episode,
            wordIndex: index,
            repeatIndex: repeat + 1,
          };

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

      if (!pageCompleted) {
        break;
      }

      episode += 1;
      wordIndex = 0;
      repeatIndex = 0;
      continuousReadingProgress.value = {
        episode,
        wordIndex: 0,
        repeatIndex: 0,
      };
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
  // 选中所有单词单元格
  const cells = document.querySelectorAll(".word-cell");

  // 先让所有元素随机飞散
  gsap.to(cells, {
    x: () => (Math.random() - 0.5) * 200, // -100~100 随机偏移
    y: () => (Math.random() - 0.5) * 200,
    rotation: () => (Math.random() - 0.5) * 90,
    opacity: 0.2,
    duration: 0.4,
    stagger: 0.05,
    onComplete: () => {
      // 飞散结束后恢复正常位置
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
// 试用模式下的页码点击处理函数
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

  // 保存当前点击的页码
  lastClickedEpisode.value = episode;
  // 更新当前页码状态
  currentEpisode.value = episode;

  // 预加载语音
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
    // 关闭 loading
    toast.close();
  }

  // 关闭页码选择面板
  panelheight.value = 90;
  return true;
};

// 试用模式处理函数
const startTrialMode = () => {
  showCodeInput.value = false;
  isTrialMode.value = true;
  localStorage.setItem("isTrialMode", "true");
  // 设置试用模式为原版书模式
  bookVersion.value = "full";
  localStorage.setItem("bookVersion", "full");
  handleEpisodeClick(1).finally(() => {
    panelheight.value = 559;
  });
};

// 单词乱序功能
const toggleShuffle = async () => {
  // 先改变顺序（但不立即渲染）
  let newOrder;
  if (isShuffled.value) {
    // 恢复原始顺序
    newOrder = [...originalWordsList.value];
  } else {
    // 打乱顺序但保持number不变
    newOrder = [...wordsList.value].sort(() => Math.random() - 0.5);
  }

  // 等待 DOM 更新完成
  // await nextTick();

  // 执行飞散动画
  animateShuffle();

  setTimeout(() => {
    wordsList.value = newOrder;
    isShuffled.value = !isShuffled.value;
  }, 200);
};

// 初始化生成页码数据
generateEpisodesData();

// 监听bookVersion变化，重新生成页码数据
watch(
  () => bookVersion.value,
  () => {
    stopContinuousReading(true);
    resetContinuousReadingProgress();
    episodeDataCache.clear();
    generateEpisodesData();
  }
);

// 设备信息
const showCodeInput = ref(false);
const bindCode = ref("");
const isTrialMode = ref(false); // 试用模式标志
const newCode = async () => {
  console.log("NEWCODE");
  if (!bindCode.value) {
    showFailToast("不能为空");
    return;
  } else {
    const toast1 = showLoadingToast({
      duration: 0,
      message: "验证中...",
    });
    const clientId = getOrCreateClientId();
    const deviceFingerprint = await getStableFingerprint();
    const fingerprintHash = deviceFingerprint.visitorId;
    const components = Object.fromEntries(
      Object.entries(deviceFingerprint.components).map(([key, val]) => [
        key,
        val.value,
      ])
    );
    const response = await axios.post("scans/", {
      method: "newCode",
      clientId,
      fingerprintHash,
      components,
      bindCode: bindCode.value,
      type: "跟读-高考",
    });
    console.log("status:", response.data.status);
    console.log("message: ", response.data.message);
    console.log("status: ", response.data.status);
    toast1.close();
    if (response.data.status === "ok") {
      showCodeInput.value = false;
      showSuccessToast("验证成功");

      localStorage.setItem("bindCode", bindCode.value);
      localStorage.setItem("isTrialMode", "false");
      isTrialMode.value = false;
      queryData(1);
      panelheight.value = 259;
    }
    if (response.data.status === false) {
      localStorage.removeItem("bindCode");
      localStorage.removeItem("client_id");
      showDialog({
        title: "机器码录入错误",
        message: "如有异议联系老师：\n微179254624，获新机器码",
        theme: "round-button",
      }).then(() => {
        window.location.reload();
      });
    }
    if (response.data.status === "forbidden") {
      localStorage.removeItem("bindCode");
      localStorage.removeItem("client_id");
      showDialog({
        title: "机器码已作废",
        message: "如有异议联系老师：\n微179254624，获新机器码",
        theme: "round-button",
      }).then(() => {
        window.location.reload();
      });
    }
  }
};

function getUUID() {
  try {
    if (
      typeof crypto !== "undefined" &&
      typeof crypto.randomUUID === "function"
    ) {
      return crypto.randomUUID();
    } else {
      throw new Error("crypto.randomUUID not supported");
    }
  } catch (e) {
    return "uuid-" + Date.now() + "-" + Math.floor(Math.random() * 1000000);
  }
}

const getOrCreateClientId = () => {
  let clientId = localStorage.getItem("client_id");
  if (!clientId) {
    clientId = getUUID();
    localStorage.setItem("client_id", clientId);
  }
  return clientId;
};

const getStableFingerprint = async () => {
  const fp = await FingerprintJS.load();
  const result = await fp.get();
  return result;
};

async function queryData(page) {
  const params = new URLSearchParams();
  params.append("method", "queryFollowData");
  params.append("page", page);
  params.append("book_version", bookVersion.value);

  const response = await axios.post("scans/", params);
  console.log("response: ", response.data);
  return response.data;
}

const queryWrongWords = async () => {
  const userPayload = getFollowUserPayload();
  if (!userPayload.username && !userPayload.clientId && !userPayload.bindCode) {
    showFailToast("请先录入机器码");
    return;
  }

  wrongWordsLoading.value = true;
  const params = new URLSearchParams();
  params.append("method", "queryFollowWrongWords");
  params.append("username", userPayload.username);
  params.append("clientId", userPayload.clientId);
  params.append("bindCode", userPayload.bindCode);

  try {
    const response = await axios.post("scans/", params);
    if (response.data?.status !== "ok") {
      showFailToast(response.data?.message || "错词本加载失败");
      return;
    }
    wrongWordsList.value = response.data.data || [];
  } catch (error) {
    console.error("错词本加载失败:", error);
    showFailToast("错词本加载失败");
  } finally {
    wrongWordsLoading.value = false;
  }
};

const openWrongWordsBook = async () => {
  showWrongWordsBook.value = true;
  await queryWrongWords();
};

const addWrongWord = async (item) => {
  const userPayload = getFollowUserPayload();
  if (!userPayload.username && !userPayload.clientId && !userPayload.bindCode) {
    showFailToast("请先录入机器码");
    return;
  }

  const params = new URLSearchParams();
  params.append("method", "addFollowWrongWord");
  params.append("username", userPayload.username);
  params.append("clientId", userPayload.clientId);
  params.append("bindCode", userPayload.bindCode);
  params.append("word", item.word);
  params.append("chinese", getChineseText(item));
  params.append("book_version", bookVersion.value);
  params.append("book_page", item.book_page || currentEpisode.value || "");
  params.append("original_page", item.original_page || "");
  params.append("number", item.number || "");

  try {
    const response = await axios.post("scans/", params);
    if (response.data?.status !== "ok") {
      showFailToast(response.data?.message || "加入失败");
      return;
    }
    showSuccessToast(response.data?.created ? "已加入错词本" : "错词本已有该词");
    if (!wrongWordKeys.value.has(getWrongWordKey(item))) {
      wrongWordsList.value.unshift(response.data.data);
    }
  } catch (error) {
    console.error("加入错词本失败:", error);
    showFailToast("加入失败");
  }
};

const removeWrongWord = async (item) => {
  const userPayload = getFollowUserPayload();
  const params = new URLSearchParams();
  params.append("method", "deleteFollowWrongWord");
  params.append("username", userPayload.username);
  params.append("clientId", userPayload.clientId);
  params.append("bindCode", userPayload.bindCode);
  params.append("word", item.word);

  try {
    const response = await axios.post("scans/", params);
    if (response.data?.status !== "ok") {
      showFailToast(response.data?.message || "移除失败");
      return;
    }
    wrongWordsList.value = wrongWordsList.value.filter(
      (wordItem) => getWrongWordKey(wordItem) !== getWrongWordKey(item)
    );
    const nextKeys = new Set(expandedWrongWordKeys.value);
    nextKeys.delete(getWrongWordKey(item));
    expandedWrongWordKeys.value = nextKeys;
    showSuccessToast("已移除");
  } catch (error) {
    console.error("移除错词失败:", error);
    showFailToast("移除失败");
  }
};

const toggleWrongWord = (item) => {
  if (wrongWordKeys.value.has(getWrongWordKey(item))) {
    removeWrongWord(item);
    return;
  }

  addWrongWord(item);
};

const isWrongWordChineseVisible = (item) =>
  wrongWordsShowChinese.value || expandedWrongWordKeys.value.has(getWrongWordKey(item));

const toggleAllWrongWordsChinese = () => {
  wrongWordsShowChinese.value = !wrongWordsShowChinese.value;
  expandedWrongWordKeys.value = new Set();
};

const toggleSingleWrongWordChinese = (item) => {
  const wordKey = getWrongWordKey(item);
  const nextKeys = new Set(expandedWrongWordKeys.value);
  if (nextKeys.has(wordKey)) {
    nextKeys.delete(wordKey);
  } else {
    nextKeys.add(wordKey);
  }
  expandedWrongWordKeys.value = nextKeys;
};

onMounted(async () => {
  showAnimationWelcome();

  // 初始化数据
  if (!localStorage.getItem("client_id")) {
    console.log("没有client_id");
    showCodeInput.value = true;
    return;
  } else {
    console.log("有client_id");
    const toast1 = showLoadingToast({
      duration: 0,
      message: "验证中...",
    });

    const clientId = localStorage.getItem("client_id");
    const bindCode = localStorage.getItem("bindCode");
    const deviceFingerprint = await getStableFingerprint();
    const fingerprintHash = deviceFingerprint.visitorId;
    const components = Object.fromEntries(
      Object.entries(deviceFingerprint.components).map(([key, val]) => [
        key,
        val.value,
      ])
    );

    try {
      const response = await axios.post("scans/", {
        method: "checkCode",
        clientId,
        fingerprintHash,
        components,
        bindCode,
        type: "跟读-高考",
      });
      console.log("status: ", response.data.status);
      console.log("message: ", response.data.message);
      console.log(response.data);

      toast1.close();

      if (response.data.status === "ok") {
        localStorage.setItem("isTrialMode", "false");
        isTrialMode.value = false;
        queryWrongWords();
        // handleEpisodeClick(1).finally(() => {
        //   panelheight.value = 559;
        // });
        panelheight.value = 559;
      }

      if (response.data.status === "forbidden") {
        localStorage.removeItem("bindCode");
        localStorage.removeItem("client_id");
        showDialog({
          title: "机器码已被其他机器绑定",
          message: "如有异议联系老师：\n微179254624，获新机器码",
          theme: "round-button",
        }).then(() => {
          window.location.reload();
        });
      }

      if (response.data.status === "false") {
        localStorage.removeItem("bindCode");
        localStorage.removeItem("client_id");
        showCodeInput.value = true;
        showFailToast("请再次录入");
      }
    } catch (err) {
      toast1.close();
      localStorage.removeItem("bindCode");
      localStorage.removeItem("client_id");
      showCodeInput.value = true;
      console.error("绑定异常:", err);
    }

    // 检查是否有试用模式标志
    const trialMode = localStorage.getItem("isTrialMode");
    if (trialMode === "true") {
      isTrialMode.value = true;
      handleEpisodeClick(1).finally(() => {
        panelheight.value = 559;
      });
    }
  }
});
</script>

<template>
  <div class="parent-container">
    <div class="nav-bar-container">
      <van-nav-bar
        left-text="主页"
        :title="
          bookVersion === 'full'
            ? '2026年天津3500原版发音跟读'
            : '2026年天津3500精简版发音跟读'
        "
        @click-left="goToHomepage"
      ></van-nav-bar>
    </div>

    <!-- 导航 -->
    <router-view />
    <van-tabbar route v-show="showTabNav">
      <van-tabbar-item icon="home-o" replace to="/homepage"
        >主页</van-tabbar-item
      >
      <van-tabbar-item icon="coupon-o" replace :to="{ path: '/xlsms' }"
        >xlsm</van-tabbar-item
      >
      <van-tabbar-item
        icon="shopping-cart-o"
        replace
        :to="{ path: '/studentAccountData' }"
        >试题</van-tabbar-item
      >
      <van-tabbar-item
        icon="comment-o"
        replace
        :to="{ path: '/studentAccountItems' }"
        >日志</van-tabbar-item
      >
    </van-tabbar>

    <!-- 输入机器码 -->
    <van-popup
      v-model:show="showCodeInput"
      position="bottom"
      :style="{ height: '85%' }"
      :close-on-click-overlay="false"
      round
    >
      <div
        style="font-size: 18px; font-weight: 700; margin: 1rem 2rem 1rem 1rem"
      >
        录入机器码
      </div>
      <van-cell-group inset>
        <van-field
          v-model="bindCode"
          label="机器码"
          placeholder="录入书本上机器码"
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

    <!-- 动画 -->
    <welcomeFollow ref="welcomeRef" />

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
        :disabled="!currentEpisode || currentEpisode >= getMaxEpisode()"
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
      <van-button
        :type="showChinese ? 'warning' : 'default'"
        round
        size="normal"
        @click="showChinese = !showChinese"
      >
        {{ showChinese ? "隐藏中文" : "显示中文" }}
      </van-button>
      <van-button type="primary" round size="normal" @click="openWrongWordsBook">
        错词本
      </van-button>
    </div>

    <van-popup
      v-model:show="showWrongWordsBook"
      position="right"
      :style="{ width: '100%', height: '100%' }"
    >
      <div class="wrong-book-page">
        <div class="wrong-book-header">
          <van-button size="small" plain type="primary" @click="showWrongWordsBook = false">
            返回
          </van-button>
          <h3>错词本</h3>
          <van-button
            size="small"
            :type="wrongWordsShowChinese ? 'warning' : 'default'"
            @click="toggleAllWrongWordsChinese"
          >
            {{ wrongWordsShowChinese ? "隐藏中文" : "显示中文" }}
          </van-button>
        </div>

        <van-list
          :loading="wrongWordsLoading"
          :finished="true"
          :finished-text="wrongWordsList.length ? '没有更多了' : ''"
          class="wrong-book-list"
        >
          <van-cell-group v-if="wrongWordsList.length">
            <van-cell
              v-for="item in wrongWordsList"
              :key="getWrongWordKey(item)"
              :title="item.word"
              :label="isWrongWordChineseVisible(item) ? getChineseText(item) : ''"
              class="word-cell"
              @click="playWordAudio(item.word)"
            >
              <template #left-icon>
                <img
                  src="../assets/speaker.png"
                  style="width: 24px; height: 24px; margin-right: 8px"
                  alt="发音图标"
                />
              </template>
              <template #extra>
                <div class="word-extra-actions">
                  <van-button
                    v-if="!wrongWordsShowChinese"
                    size="mini"
                    type="primary"
                    plain
                    @click.stop="toggleSingleWrongWordChinese(item)"
                  >
                    {{ expandedWrongWordKeys.has(getWrongWordKey(item)) ? "隐藏" : "中文" }}
                  </van-button>
                  <van-button size="mini" type="danger" @click.stop="removeWrongWord(item)">
                    移除
                  </van-button>
                  <van-icon name="volume-o" size="20" color="#1989fa" />
                </div>
              </template>
            </van-cell>
          </van-cell-group>
          <div v-else-if="!wrongWordsLoading" class="wrong-book-empty">
            暂无错词
          </div>
        </van-list>
      </div>
    </van-popup>

    <!-- 浮动面板 -->
    <van-floating-panel
      v-model:height="panelheight"
      :close-on-click-overlay="true"
    >
      <div class="floating-panel-content">
        <!-- 收起箭头，仅在面板展开时显示 -->
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
            :title="
              bookVersion === 'full'
                ? `${group[0]}-${group[group.length - 1]}`
                : `${group[0]}-${group[group.length - 1]}页`
            "
            :key="index"
          >
            <van-grid :column-num="5" :gutter="10" style="padding: 5px" square>
              <van-grid-item
                v-for="episode in group"
                :key="episode"
                class="episode-item-wrapper"
                :class="{ 
                  'trial-disabled': isTrialMode && (
                    (bookVersion === 'full' && episode > 10) || 
                    (bookVersion === 'mini' && episode > 2)
                  )
                }"
                @click="handleEpisodeClick(episode)"
              >
                <div
                  class="episode-item"
                  :class="{
                    'episode-active': lastClickedEpisode === episode,
                    'trial-disabled-item': isTrialMode && (
                      (bookVersion === 'full' && episode > 10) || 
                      (bookVersion === 'mini' && episode > 2)
                    ),
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
      :style="{
        width: '100%',
        padding: bookVersion === 'full' ? '30px' : '16px',
        boxSizing: 'border-box',
        overflowX: 'hidden'
      }"
    >
      <div
        style="
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 16px;
          position: relative;
        "
      >
        <div v-if="bookVersion === 'full'" style="position: absolute; left: 16px; top: 50%; transform: translateY(-50%);">
          <img
            src="../assets/sheep_2.gif"
            alt="单词图标"
            style="width: 60px; height: 60px;margin-bottom: 0;"
          />
        </div>
        <div v-if="bookVersion === 'mini'" style="position: absolute; left: 16px; top: 50%; transform: translateY(-50%);">
          <img
            src="../assets/sheep_1.gif"
            alt="单词图标"
            style="width: 40px; height: 40px;"
          />
        </div>

        <h3
          style="
            font-size: 18px;
            font-weight: bold;
            margin: 0;
            position: absolute;
            left: 50%;
            transform: translateX(-50%);
            white-space: nowrap;
          "
        >
          {{
            bookVersion === 'full'
              ? `第${currentEpisode}页 单词列表`
              : `第${currentEpisode}页 单词列表`
          }}
        </h3>
        <van-button
          v-if="bookVersion !== 'full'"
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
        style="
          max-height: 500px;
          overflow-y: auto;
          overflow-x: hidden;
          width: 100%;
          position: relative;
        "
      >
        <van-cell-group>
          <van-cell
            v-for="(item, index) in wordsList"
            :key="index"
            :title="
              bookVersion === 'full'
                ? item.word
                : `${item.number}. ${item.word}`
            "
            :label="showChinese ? getChineseText(item) : ''"
            value=""
            @click="playWordAudio(item.word)"
            style="cursor: pointer; margin-top: 10px;"
            :class="[
              'word-cell',
              { 'word-active': currentPlayingWord === item.word },
            ]"
          >
            <template #left-icon>
              <img
                src="../assets/speaker.png"
                style="width: 24px; height: 24px; margin-right: 8px"
                alt="发音图标"
              />
            </template>
            <template #extra>
              <div class="word-extra-actions">
                <van-button
                  size="mini"
                  :type="wrongWordKeys.has(getWrongWordKey(item)) ? 'success' : 'default'"
                  @click.stop="toggleWrongWord(item)"
                >
                  {{ wrongWordKeys.has(getWrongWordKey(item)) ? "已加" : "错词" }}
                </van-button>
                <van-icon name="volume-o" size="20" color="#1989fa" />
              </div>
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

/* 浮动面板样式 */
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

/* 确保单词选中时不会发生位移 */
.van-cell {
  position: relative;
  box-sizing: border-box;
  overflow: hidden;
  transition: all 0s !important; /* 禁用所有过渡效果 */
}

/* 单词播放时的高亮样式 */
.word-active {
  background-color: rgba(25, 137, 250, 0.1) !important; /* 浅蓝色背景 */
  transition: background-color 0.1s ease !important; /* 只保留背景色过渡 */
}

/* 确保高亮时所有内部元素保持原样 */
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

/* 试用模式下禁用的页码样式 */
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

/* 单词列表样式 */
.words-list-container {
  padding: 30px;
  background-color: #fff;
  border-radius: 8px;
  margin: 16px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  overflow-x: hidden !important; /* 防止左右滑动 */
  width: calc(100% - 32px) !important; /* 考虑margin的宽度 */
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

.wrong-book-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #fff;
  overflow: hidden;
}

.wrong-book-header {
  position: sticky;
  top: 0;
  z-index: 2;
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: #fff;
  border-bottom: 1px solid #ebedf0;
}

.wrong-book-header h3 {
  margin: 0;
  font-size: 18px;
  text-align: center;
}

.wrong-book-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px 16px 20px;
}

.wrong-book-empty {
  padding: 48px 16px;
  color: #969799;
  font-size: 15px;
  text-align: center;
}

.word-extra-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: 8px;
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
  min-height: 40px;
  width: 100%;
  cursor: pointer;
  transition: all 0s !important; /* 禁用所有过渡效果 */
  overflow: visible;
  display: flex;
  align-items: center;
}

.word-cell:active {
  background-color: #f5f5f5;
}

/* 确保单词选中时文字不会有任何变化 */
.word-cell :deep(.van-cell__title),
.word-cell :deep(.van-cell__label),
.word-cell :deep(.van-cell__value),
/* .word-active :deep(.van-cell__title),
.word-active :deep(.van-cell__label),
.word-active :deep(.van-cell__value) {
  transform: none !important;
  font-weight: inherit !important;
  line-height: inherit !important;
  position: static !important;
} */

.word-cell :deep(.van-cell__title) {
  font-size: 18px;
  font-weight: 500;
  color: #333;
  white-space: nowrap;
  min-width: 0;
  padding-right: 8px;
}

.word-cell :deep(.van-cell__label) {
  font-size: 14px;
  color: #666;
  margin-top: 4px;
  line-height: 1.5;
  white-space: normal;
  overflow-wrap: anywhere;
  word-break: break-word;
}
</style>
