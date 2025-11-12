<template>
  <van-overlay
    :show="visible"
    :z-index="9999"
    :custom-style="{ backgroundColor: 'rgba(0, 0, 0, 0)' }"
    @click="hide"
  >
    <div class="encouragement-container">
      <div class="encouragement" style="margin-top: -10vh;">
        <!-- 添加标题 -->
        <div class="header-text">
          <span class="title-text" style="font-size: 30px;">天津高考3500精简版</span><br/>
          <span class="sub-title-text" style="font-size: 20px;">发音跟读</span><br/>
        </div>
        <img :src="srcTheme" alt="encouragement" />
        <div class="encouragement-text">选择版本</div>
        <button class="version-button full-version-button" @click="selectFullVersion">原版书</button>
        <button class="version-button mini-version-button" @click="selectMiniVersion">精简版</button>
        <div class="design-text">Designed by xie</div>
        <!-- <button class="close-button" @click="hide">跳过</button> -->
      </div>
    </div>
  </van-overlay>
</template>

<script setup>
import { ref, onMounted, defineExpose, inject } from "vue";
// 主题路径
import encouragementSrcGoatAndWolf from "../../assets/welcomeFollow.png";
const srcTheme = ref("");

const visible = ref(false);
const isEntering = ref(false);
const isExiting = ref(false);
const bookVersion = ref("mini"); // 默认值为精简版 mini，完整版为 full

function show() {
  visible.value = true;
  isExiting.value = false;

  // 八秒后消失
  // setTimeout(() => {
  //   hide();
  // }, 8000);
}

function hide() {
  // 立即开始退出动画
  isExiting.value = true;
  // 保存选择的版本到 localStorage
  localStorage.setItem("bookVersion", bookVersion.value);
  // 发送自定义事件到父组件
  const event = new CustomEvent('version-selected', { detail: { version: bookVersion.value } });
  window.dispatchEvent(event);
  visible.value = false;  // 立即隐藏内容
  isExiting.value = false;
}

// 选择原版书
function selectFullVersion() {
  bookVersion.value = "full";
  hide();
}

// 选择精简版
function selectMiniVersion() {
  bookVersion.value = "mini";
  hide();
}

const methods = { show, hide };

defineExpose({ ...methods, visible });

onMounted(() => {
  srcTheme.value = encouragementSrcGoatAndWolf;
  isEntering.value = false;
});
</script>

<style scoped>
@import url("https://fonts.googleapis.com/css2?family=Zhi+Mang+Xing&display=swap"); /* 引入艺术字体 */

.encouragement-container {
  width: 100vw;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: white; /* 保证遮罩层背景透明 */
}

.encouragement-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw; /* 覆盖整个视口宽度 */
  height: 100vh; /* 覆盖整个视口高度 */
  background-color: rgba(
    0,
    0,
    0,
    0
  ); /* 背景透明，如需淡遮罩可改成 rgba(0,0,0,0.5) */
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
  opacity: 1;
  transition: opacity 1s ease;
  pointer-events: auto; /* 阻止点击穿透 */
}

/* 渐隐动画 */
.encouragement-overlay.exit {
  opacity: 0;
}

@keyframes enter-animation {
  0% {
    transform: translateY(-100vh); /* 从屏幕顶部开始 */
  }
  100% {
    transform: translateY(0); /* 移动到最终位置 */
  }
}

@keyframes exit-animation {
  0% {
    transform: translateX(0); /* 从当前位置开始 */
  }
  100% {
    transform: translateX(100vw); /* 移动到屏幕右侧外 */
  }
}

.encouragement {
  display: flex;
  align-items: center;
  position: relative; /* 添加相对定位 */
  flex-direction: column; /* 让内容垂直排列 */
}

.encouragement img {
  width: 40vw; /* 40% of viewport width */
  height: auto;
  display: block; /* 避免图片下方空隙 */
  margin: 0 auto 20px auto; /* 居中 + 下边距 */
}

.encouragement-text {
  font-family: "Zhi Mang Xing", cursive;
  font-size: 20px; /* 调整文字大小 */
  color: black; /* 设置文字颜色 */
  margin-bottom: 20px; /* 调整文字与按钮之间的间距 */
}
.design-text {
  font-family: 'Times New Roman', serif;
  font-size: 20px; /* 调整文字大小 */
  color: gray; /* 设置文字颜色 */
  margin-bottom: 20px; /* 调整文字与按钮之间的间距 */
}

/* 版本选择按钮样式 */
.version-button {
  padding: 10px 20px;
  font-size: 16px;
  font-weight: bold;
  border: none;
  border-radius: 12px;
  margin: 5px;
  cursor: pointer;
  transition: all 0.3s ease;
  width: 150px;
}

.full-version-button {
  background-color: #1989fa;
  color: white;
  margin-bottom: 10px;
}

.full-version-button:hover {
  background-color: #0066cc;
  transform: scale(1.05);
}

.mini-version-button {
  background-color: #f7ba1e;
  color: white;
  margin-bottom: 20px;
}

.mini-version-button:hover {
  background-color: #e6a400;
  transform: scale(1.05);
}

/* 关闭按钮样式 */
.close-button {
  background-color: white;
  border: 2px solid #999;
  color: #999;
  padding: 5px 15px;
  text-align: center;
  text-decoration: none;
  display: inline-block;
  font-size: 14px;
  margin-top: 10px;
  cursor: pointer;
  border-radius: 12px;
}

.close-button:hover {
  background-color: #999;
  color: white;
}
.header-text {
  font-size: 36px;
  font-weight: bold;
  color: #000;
  margin-bottom: 12px;
  text-align: center;
  font-family: 'SimSun', serif;
}

.mini-text {
  font-size: 22px; /* 设置 mini 的字体稍微小一点 */
}

</style>
