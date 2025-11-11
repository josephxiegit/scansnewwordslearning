<script setup>

import { ref, onMounted, onUnmounted, getCurrentInstance, nextTick } from "vue";
import "vant/lib/index.css";

import gsap from 'gsap';

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
const currentEpisode = ref(0);
const currentPlayingWord = ref(''); // 当前播放的单词，用于高亮显示

const showTabNav = ref(false);

// 保存原始标题，用于组件卸载时恢复
let originalTitle = '';

// 动画
const animationVisible = ref(false);
const welcomeRef = ref(null);

// 组件挂载时设置浏览器标题
onMounted(() => {
  // 保存原始标题
  originalTitle = document.title;
  // 设置新标题
  document.title = '天津高考3500跟读发音';
});

// 组件卸载时恢复原始标题
onUnmounted(() => {
  if (originalTitle) {
    document.title = originalTitle;
  }
});

function showAnimationWelcome() {
  if (welcomeRef.value.visible) {
    welcomeRef.value.hide();
  } else {
    welcomeRef.value.show();
  }
  animationVisible.value = !animationVisible.value;
}

// 选页相关状态
const panelheight = ref(105);
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

// 播放单词音频
const playWordAudio = (word) => {
  // 设置当前播放的单词，用于高亮显示
  currentPlayingWord.value = word;
  
  const audioBlob = audioCache.get(word);
  if (audioBlob) {
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    
    audio.play().catch(err => {
      console.warn(`播放音频失败: ${word}`, err);
      // 降级方案：使用网络发音
      const fallbackUrl = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(word)}&type=1`;
      const fallbackAudio = new Audio(fallbackUrl);
      fallbackAudio.play().catch(fallbackErr => {
      console.error(`网络发音也失败: ${word}`, fallbackErr);
      showFailToast("发音失败，请稍后重试");
      currentPlayingWord.value = ''; // 播放失败时清除高亮
    });
    
    // 播放结束后清除高亮
    fallbackAudio.onended = () => {
      setTimeout(() => {
        currentPlayingWord.value = '';
      }, 300); // 延迟清除，让用户能看到高亮效果
    };
    });
    
    // 播放结束后释放URL对象并清除高亮
    audio.onended = () => {
      URL.revokeObjectURL(audioUrl);
      // 清除当前播放的单词标记
      setTimeout(() => {
        currentPlayingWord.value = '';
      }, 300); // 延迟清除，让用户能看到高亮效果
    };
  } else {
    // 如果缓存中没有，尝试使用网络发音
    const fallbackUrl = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(word)}&type=1`;
    const fallbackAudio = new Audio(fallbackUrl);
    fallbackAudio.play().catch(err => {
      console.error(`发音失败: ${word}`, err);
      showFailToast("发音失败，请稍后重试");
    });
  }
};

// 乱序动画函数
const animateShuffle = () => {
  // 选中所有单词单元格
  const cells = document.querySelectorAll('.word-cell');
  
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
const handleEpisodeClick = async (episode) => {
  // 检查试用模式下是否点击了超过2页的内容
  if (isTrialMode.value && episode > 2) {
    showDialog({
      title: "购买提示",
      message: "联系微信179254624购买",
      theme: "round-button",
    });
    return;
  }
  
  // 保存当前点击的页码
  lastClickedEpisode.value = episode;

  // 预加载语音
  const toast = showLoadingToast({
    duration: 0,
    forbidClick: true,
    message: "加载词汇音频...",
    loadingType: "spinner",
  });
  
  try {
    let answers = await queryData(episode);
    // 按 number 从小到大排序
    answers.sort((a, b) => a.number - b.number);
    // 存储当前单词列表
    wordsList.value = answers;
    originalWordsList.value = [...answers]; // 保存原始顺序
    isShuffled.value = false;
    currentEpisode.value = episode;
    
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
      if (response.data.failed_words && response.data.failed_words.length > 0) {
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
    // 加载完成后显示单词列表
    showWordsList.value = true;
    
  } catch (error) {
    console.error("音频加载失败:", error);
    showFailToast("加载失败，请稍后重试");
  } finally {
    // 关闭 loading
    toast.close();
  }

  // 关闭页码选择面板
  panelheight.value = 105;
};

// 试用模式处理函数
const startTrialMode = () => {
  showCodeInput.value = false;
  isTrialMode.value = true;
  localStorage.setItem("isTrialMode", "true");
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
  const response = await axios.post("scans/", params);
  console.log("response: ", response.data);
  return response.data;
}

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
        type: "跟读",
      });
      console.log("status: ", response.data.status);
      console.log("message: ", response.data.message);
      console.log(response.data);

      toast1.close();
      
      if (response.data.status === "ok") {
        localStorage.setItem("isTrialMode", "false");
        isTrialMode.value = false;
        handleEpisodeClick(1).finally(() => {
          panelheight.value = 559;
        });
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
      <van-nav-bar title="天津高考3500精简版发音跟读"></van-nav-bar>
    </div>

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

    <!-- 选页按钮 -->
    <div style="position: fixed; bottom: 150px; right: 20px; z-index: 99">
      <van-button
        type="primary"
        round
        size="normal"
        @click="panelheight = 559"
      >
        选页
      </van-button>
    </div>

    <!-- 浮动面板 -->
    <van-floating-panel v-model:height="panelheight" :close-on-click-overlay="true">
      <div class="floating-panel-content">
        <!-- 收起箭头，仅在面板展开时显示 -->
        <div v-if="panelheight > 105" class="close-panel-arrow" @click="panelheight = 105">
          <van-icon name="arrow-down" size="24" color="#1989fa" />
        </div>
        <van-tabs v-model:active="activeTab" animated>
          <van-tab
            v-for="(group, index) in episodesData"
            :title="`${group[0]}-${group[group.length - 1]}页`"
            :key="index"
          >
            <van-grid :column-num="5" :gutter="10" style="padding: 5px;" square>
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
                    'trial-disabled-item': isTrialMode && episode > 2 
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
    <div v-if="showWordsList" class="words-list-container" style="width: 100%; padding: 16px; box-sizing: border-box; overflow-x: hidden;">
      <div style="display: flex; align-items: center; justify-content: center; margin-bottom: 16px; position: relative;">
        <img src="../assets/sheep_1.gif" alt="单词图标" style="width: 40px; height: 40px; margin-right: auto;" />
        <h3 style="font-size: 18px; font-weight: bold; margin: 0; position: absolute; left: 50%; transform: translateX(-50%);">第{{ currentEpisode }}页 单词列表</h3>
        <van-button 
          size="small" 
          type="danger" 
          :plain="!isShuffled" 
          @click="toggleShuffle" 
          style="margin-left: auto; z-index: 10;"
        >
          {{ isShuffled ? '恢复' : '乱序' }}
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
            :title="`${item.number}. ${item.word}`"
            :label="item.中文 || ''"
            :value="'🔊'"
            @click="playWordAudio(item.word)"
            style="cursor: pointer;"
            :class="['word-cell', { 'word-active': currentPlayingWord === item.word }]"
          >
            <template #left-icon>
              <img src="../assets/speaker.png" style="width: 24px; height: 24px; margin-right: 8px;" alt="发音图标" />
            </template>
            <template #extra>
              <van-icon name="volume-o" size="20" color="#1989fa" />
            </template>
          </van-cell>
        </van-cell-group>
      </van-list>
    </div>
  </div>
</template>

<style scoped>
html, body {
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
  padding: 16px;
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

.word-cell {
  position: relative;
  box-sizing: border-box;
  height: 40px;
  width: 100%;
  cursor: pointer;
  transition: all 0s !important; /* 禁用所有过渡效果 */
  overflow: hidden; /* 防止内容溢出 */
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
}

.word-cell :deep(.van-cell__label) {
  font-size: 14px;
  color: #666;
  margin-top: 4px;
  white-space: nowrap;
}
</style>