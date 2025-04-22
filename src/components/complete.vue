<script setup>
import { ref, onMounted, nextTick } from "vue";
import { useRouter } from "vue-router";

const timeDifference = ref("");
const accuracyRate = ref("");
const showClock = ref(false);
const showGreenCircle = ref(false);
const showBlueCircle = ref(true); // 控制蓝色圆环的显示
const showGreenText = ref(false); // 控制绿色圆环文字的显示
const showBlueText = ref(true); // 控制蓝色圆环文字的显示
const showClockText = ref(false); // 控制闹钟文字的显示
const parsedAccuracyRate = ref(0);
const currentRate = ref(0);
const currentRate2 = ref(0);
const showSpeechBubble = ref(false);
const valueUsername = ref("");

onMounted(() => {
  valueUsername.value = JSON.parse(localStorage.getItem("user_mini"));
  accuracyRate.value = history.state.accuracyRate;
  timeDifference.value = history.state.timeDifference;
  setTimeout(() => {
    showSpeechBubble.value = true;
  }, 1000);
  // 第一个圆环动画完成后
  setTimeout(() => {
    parsedAccuracyRate.value = parseFloat(accuracyRate.value.replace("%", ""));
    showGreenCircle.value = true; // 显示第二个圆环

    // 确保绿色圆环从 0 开始
    currentRate2.value = 0;

    // 使用 nextTick 确保文本显示与圆环动画同步
    nextTick(() => {
      showGreenText.value = true; // 显示绿色文字
    });

    // 第二个圆环的动画从 0 到目标值
    setTimeout(() => {
      currentRate2.value = parsedAccuracyRate.value;
    }, 0); // 动画稍微延迟一下启动，确保第一个圆环完成后再启动
  }, 1200); // 第一个圆环动画完成后 2.1 秒开始显示第二个圆环

  // 闹钟显示
  setTimeout(() => {
    showClock.value = true;
    // 使用 nextTick 确保闹钟文本与动画同步
    nextTick(() => {
      showClockText.value = true;
    });
  }, 2500); // 闹钟显示延迟 3.5 秒
});
</script>

<template>
  <div>
    <div style="margin: 3rem 0 0 3rem; display: flex">
      <img
        src="../assets/complete.png"
        class="slide-in"
        style="
          width: 8rem;
          height: auto;
          margin-left: 0rem;
          margin-bottom: -1.5rem;
        "
      />
      <div class="speech-bubble" v-show="showSpeechBubble">
        <div style="text-align: left">
          <div>泰酷啦</div>
          <div style="margin-top: 1em; font-size: smaller; margin-left: 0.4rem;">{{ valueUsername }}</div>
        </div>
      </div>
    </div>
    <div class="container">
      <!-- 左侧蓝色圆环 -->
      <div class="circle-container">
        <van-circle
          v-model:current-rate="currentRate"
          :rate="100"
          :speed="90"
          text="完成率"
          :stroke-width="60"
          v-show="showBlueCircle"
        />
        <div
          class="circle-text"
          v-show="showBlueText"
          :class="{ typing: showBlueText }"
        >
          100%
        </div>
        <!-- 蓝色圆环文字 -->
      </div>

      <!-- 中间绿色圆环 -->
      <div class="circle-container">
        <van-circle
          v-model:current-rate="currentRate2"
          :rate="parsedAccuracyRate"
          :speed="90"
          color="#4CAF50"
          :stroke-width="60"
          v-show="showGreenCircle"
          text="正确率"
        />
        <div
          class="circle-text"
          v-show="showGreenText"
          :class="{ typing: showGreenText }"
        >
          {{ accuracyRate }}
        </div>
        <!-- 绿色圆环文字 -->
      </div>

      <!-- 右侧跳动闹钟 -->
      <div class="circle-container">
        <div class="clock-icon" v-if="showClock">⏰</div>
        <div
          class="circle-text"
          v-show="showClockText"
          :class="{ typing: showClockText }"
        >
          {{ timeDifference }}
        </div>
        <!-- 闹钟文字 -->
      </div>
    </div>
    <div class="firework-container">
      <div class="firework"></div>
      <div class="firework"></div>
      <div class="firework"></div>
      <div class="firework"></div>
    </div>
  </div>
</template>

<style scoped>
.container {
  display: flex;
  justify-content: space-between; /* 确保左右图标之间有间距 */
  align-items: center; /* 垂直居中 */
  height: 50vh;
  width: 100%;
  padding: 0 20px; /* 给左右留出一些空白 */
  box-sizing: border-box; /* 包括内边距在内的宽度计算 */
}

.slide-in {
  animation: slideIn 1s ease-out forwards;
}

@keyframes slideIn {
  0% {
    transform: translateX(-100%); /* 起始位置在左侧 */
  }
  100% {
    transform: translateX(0); /* 最终位置在原始位置 */
  }
}

.speech-bubble {
  position: relative;
  background-color: white; /* 背景色 */
  color: green; /* 字体颜色 */
  padding: 10px 20px;
  font-size: 34px;
  border-radius: 10px; /* 圆角效果 */

  text-align: center;
  margin: 20px 20px 20px 30px;
  max-width: 300px; /* 限制气泡最大宽度 */
  line-height: 0.1;
  text-align: right;
}

.speech-bubble::before {
  content: "";
  position: absolute;
  left: -20px; /* 小圆形的位置 */
  bottom: 55px; /* 小圆形尾巴位置 */
  width: 10px; /* 小圆形的宽度 */
  height: 10px; /* 小圆形的高度 */
  background-color: white; /* 小圆形背景色 */
  border-radius: 50%; /* 创建圆形 */
  border: 2px solid green; /* 绿色边框 */
}

.speech-bubble::after {
  content: "";
  position: absolute;
  left: -10px; /* 大圆形的位置，稍微向右上 */
  top: 20px; /* 大圆形尾巴位置 */
  width: 20px; /* 大圆形的宽度 */
  height: 20px; /* 大圆形的高度 */
  background-color: white; /* 大圆形背景色 */
  border-radius: 50%; /* 创建圆形 */
  border: 2px solid green; /* 绿色边框 */
}

.circle-container {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  margin: 0 10px;
  flex: 1; /* 确保圆环和闹钟会平分宽度 */
}

.circle-text {
  font-size: 12px; /* 调整文字大小 */
  color: #000; /* 设置文字为黑色 */
  margin-top: 10px; /* 给文字和图标之间添加一些间距 */
  text-align: center;
  overflow: hidden; /* 隐藏超出部分 */
  white-space: nowrap; /* 防止文字换行 */
  width: 0; /* 初始宽度为 0，打字机效果开始时，文字不可见 */
  animation: typing 2s steps(20) 1s forwards; /* 设置打字机效果 */
}

/* 打字机效果 */
@keyframes typing {
  to {
    width: 100%; /* 让文字从 0 宽度扩展到 100% */
  }
}

.clock-icon {
  font-size: 80px; /* 调整闹钟大小，和圆环一致 */
  animation: bounceClock 0.5s infinite alternate;
  animation-iteration-count: 4; /* 闹钟闪烁四次后停止 */
}

/* 动画：跳动的闹钟 */
@keyframes bounceClock {
  0% {
    transform: scale(1);
  }
  100% {
    transform: scale(1.2);
  }
}

/* 打字机效果的动画应用 */
.typing {
  width: 0;
  animation: typing 1.5s steps(15) 1s forwards; /* 打字机效果，文字逐个显示 */
}
</style>
