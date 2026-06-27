<template>
  <van-overlay
    :show="visible"
    :z-index="9999"
    :custom-style="{ backgroundColor: 'rgba(0, 0, 0, 0)' }"
  >
    <div class="welcome-container">
      <div class="welcome-card">
        <div class="header-text">
          <span class="title-text">天津外研社初中教材跟读</span>
        </div>
        <img :src="srcTheme" alt="welcome" />
        <button class="enter-button" @click="onEnter">确定</button>
        <div class="design-text">Designed by xie</div>
      </div>
    </div>
  </van-overlay>
</template>

<script setup>
import { ref, onMounted, defineExpose, defineEmits } from "vue";
import welcomeImg from "../../assets/welcomeFollow.png";

const emit = defineEmits(["confirm"]);
const srcTheme = ref("");
const visible = ref(true);

function onEnter() {
  visible.value = false;
  emit("confirm");
}

function show() {
  visible.value = true;
}

const methods = { show };

defineExpose({ ...methods, visible });

onMounted(() => {
  srcTheme.value = welcomeImg;
});
</script>

<style scoped>
.welcome-container {
  width: 100vw;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: white;
}

.welcome-card {
  display: flex;
  align-items: center;
  flex-direction: column;
  margin-top: -8vh;
}

.welcome-card img {
  width: 38vw;
  height: auto;
  display: block;
  margin: 0 auto 24px auto;
}

.header-text {
  margin-bottom: 16px;
  text-align: center;
}

.title-text {
  font-size: 28px;
  font-weight: bold;
  color: #000;
  font-family: 'SimSun', 'STSong', serif;
  letter-spacing: 2px;
}

.enter-button {
  padding: 12px 60px;
  font-size: 18px;
  font-weight: bold;
  border: none;
  border-radius: 12px;
  background-color: #1989fa;
  color: white;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-bottom: 16px;
}

.enter-button:hover {
  background-color: #0066cc;
  transform: scale(1.05);
}

.enter-button:active {
  transform: scale(0.97);
}

.design-text {
  font-family: 'Times New Roman', serif;
  font-size: 16px;
  color: #bbb;
}
</style>
