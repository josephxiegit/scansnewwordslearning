<script setup>
import { ref, onMounted, getCurrentInstance, reactive, nextTick } from "vue";
import "vant/lib/index.css";

const instance = getCurrentInstance();
const axios = instance.appContext.config.globalProperties.$ajax;
defineProps({
  msg: String,
});
import {
  showFailToast,
  showToast,
  showLoadingToast,
  showConfirmDialog,
  showDialog,
  Divider,
  Toast,
  closeToast,
} from "vant";
import "vant/lib/index.css";
import PasswordDialog from "./PasswordDialog.vue";
import { useRouter } from "vue-router";

const selectedItems = ref([]);
const filterXlsmData = ref([]);
const showDialogPassWord = ref(false);
function formatDate_log(isoString) {
  const date = new Date(isoString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}年${month}月${day}日${hours}时${minutes}分`;
}
const deleteItem = (index) => {
  // console.log('index: ', index);
  showConfirmDialog({
    title: `${filterXlsmData.value[index]["title"]}`,
    message: `是否确认删除?`,
    theme: "round-button",
  }).then(async () => {
    const params = new URLSearchParams();
    params.append("method", "deleteAccountItem");
    params.append("nid", filterXlsmData.value[index]["nid"]);
    const toast1 = showLoadingToast({
      duration: 0,
      message: "删除中...",
    });
    const response = await axios.post("scans/", params);
    toast1.close();
    showToast("删除成功");
    console.log(response.data);
    queryData();
  });
};
const showAccountLog = ref(false);
const logItem = ref("");
const showDetail = (item) => {
  showAccountLog.value = true;
  logItem.value = item;
  console.log("logItem: ", logItem.value);
  // logItem.value['log'].forEach(item => {
  //   console.log("用户选择:",item['英文'], item["答案"]);
  // });
};

const isCorrectAnswer = (userChoices, answerString, correctAnswer) => {
  // 把 userChoices 统一为数组
  if (typeof userChoices === "string") {
    userChoices = [userChoices];
  } else if (!Array.isArray(userChoices)) {
    userChoices = [];
  }

  const answers = answerString.split("；").sort();
  const sortedUserChoices = [...userChoices].sort();

  if (sortedUserChoices.length !== answers.length) {
    return false;
  }

  return sortedUserChoices.every((choice, index) => choice === answers[index]);
};

async function queryData() {
  const params = new URLSearchParams();
  params.append("method", "queryItems");
  const toast1 = showLoadingToast({
    duration: 0,
    message: "加载中...",
  });
  const response = await axios.post("scans/", params);
  toast1.close();

  filterXlsmData.value = response.data;
  filterXlsmData.value.forEach((item, index) => {
    let dataString = item["log"].replace(/(\W)'|'(\W)/g, '$1"$2');
    dataString = dataString
      .replace(/([{,]\s*)'([^']+?)'(\s*[:])/g, '$1"$2"$3')
      .replace(/'/g, '"')
      .replace(/s" /g, "s' ")
      .replace(/"s /g, "'s ")
      .replace(/"t /g, "'t ")
      .replace(/"m /g, "'m ")
      .replace(/can"t/g, "can't")
      .replace(/mustn"t/g, "mustn't")
      .replace(/needn"t/g, "needn't")
      .replace(/o"clock/g, "o'clock")
      .replace(/won"t/g, "won't")
      .replace(/it"s/gi, "it's")
      .replace(/we"re/gi, "we're'")
      .replace(/You"re/gi, "you're'")
      .replace(/they"re/gi, "they're'");

    dataString = dataString
      .replace(/\bFalse\b/g, "false")
      .replace(/\bTrue\b/g, "true");
    filterXlsmData.value[index]["log"] = JSON.parse(dataString);

    let trueCount = 0;
    item["log"].forEach((item2, index2) => {
      const correctAnswer = item2.正确答案 || ["无"];
      const userSelection = item2.用户选择 ?? ["无"];

      const correctAnswerList = correctAnswer
        .split("；")
        .map((answer) => answer.trim());
      correctAnswerList.sort();
      userSelection.sort();
      item2.flag =
        correctAnswerList.length === userSelection.length &&
        correctAnswerList.join(",") === userSelection.join(",")
          ? "true"
          : "false";
      if (item2.flag == "true") {
        trueCount++;
      }
    });
    filterXlsmData.value[index].trueCount = trueCount;
  });
  console.log("filterXlsmData: ", filterXlsmData.value);
}
const handlePassword = (pwd) => {
  // console.log("用户输入的密码是：", pwd);
  if (pwd == "ss654321") {
    localStorage.setItem("teacherPassword", pwd);
    showDialogPassWord.value = false;
  } else {
    showToast({ message: "密码错误，即将返回首页", type: "fail" });
    setTimeout(() => {
      window.location.href = "/homepage"; // 替换为你想跳转的地址
    }, 1500); // 给点时间让用户看到 toast
  }
};
onMounted(() => {
  let localTeacherPassword = window.localStorage.getItem("teacherPassword");
  // console.log("localTeacherPassword: ", localTeacherPassword);
  if (!localTeacherPassword || localTeacherPassword !== "ss654321") {
    showDialogPassWord.value = true;
  } else {
    localStorage.setItem("teacherPassword", "ss654321");
    showDialogPassWord.value = false;
  }
  queryData();
});
</script>

<template>
  <div class="parent-container">
    <div class="nav-bar-container">
      <van-nav-bar title="答题日志"> </van-nav-bar>
    </div>

    <PasswordDialog
      v-model:show="showDialogPassWord"
      @submit="handlePassword"
    />
    <!-- 导航 -->
    <router-view />
    <van-tabbar route>
      <van-tabbar-item icon="home-o" replace to="/homepage"
        >主页</van-tabbar-item
      >
      <van-tabbar-item icon="coupon-o" replace :to="{ path: '/xlsms' }"
        >xlsm</van-tabbar-item
      >
      <van-tabbar-item
        icon="todo-list-o"
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
      <van-tabbar-item icon="link-o" replace :to="{ path: '/machineCode' }"
        >机器码</van-tabbar-item
      >
    </van-tabbar>

    <!-- 数据列表 -->
    <van-cell-group style="margin-bottom: 80px">
      <van-swipe-cell
        v-for="(item, index) in filterXlsmData"
        :key="index"
        stop-propagation
        style="border-bottom: 1px solid #ebedf0"
      >
        <template #right>
          <van-button
            square
            type="danger"
            text="删除"
            style="height: 100%"
            @click="deleteItem(index)"
          />
        </template>
        <van-cell
          :label="formatDate_log(item.create_time)"
          style="padding-top: 0.5rem; padding-bottom: 0.5rem"
          @click="showDetail(item)"
        >
          <template #title>
            <div style="width: 120%;">{{ item.title }}</div>
          </template>
          <template #value>
            <div
              style="
                display: flex;
                flex-direction: column;
                justify-content: flex-end;
                font-size: smaller
              "
            >
              <div>{{ item.username }}</div>
              <div>{{ item.trueCount }} / {{ item.log.length }}</div>
            </div>
          </template>
        </van-cell>
      </van-swipe-cell>
    </van-cell-group>
    <!-- 日志详情 -->
    <van-popup
      v-model:show="showAccountLog"
      position="bottom"
      :style="{ height: '100%' }"
      closeable
      :lock-scroll="false"
    >
      <van-cell-group inset>
        <div style="margin-left: 0.5rem; font-weight: 700; margin-right: 2rem">
          <p style="font-size: 20px; color: black; margin-top: 1rem">Log日志</p>
        </div>

        <div
          style="
            font-size: 14px;
            color: gray;
            margin-left: 0.5rem;
            margin-top: -1rem;
          "
        >
          <div>{{ logItem.title }} | {{ logItem.username }}</div>
        </div>
        <div v-for="(item, index) in logItem['log']" :key="index">
          <van-cell :label="`答案：${item.正确答案 || item.答案}`">
            <template #title>
              <div style="font-size: larger; font-weight: 700">
                {{ item.英文 }}
                <van-tag v-if="item.is_spell" type="danger" mark>拼</van-tag>
              </div>
              <div
                style="margin-top: 0.5rem"
                :style="{
                  color: isCorrectAnswer(
                    item.用户选择,
                    item.答案,
                    item.正确答案
                  )
                    ? 'gray'
                    : 'red',
                }"
              >
                用户选择：{{
                  Array.isArray(item["用户选择"])
                    ? item["用户选择"].join("；")
                    : item["用户选择"] || "无"
                }}
              </div>
            </template>
          </van-cell>
        </div>
      </van-cell-group>
    </van-popup>
  </div>
</template>



<style scope>
html {
  touch-action: manipulation; /* 禁用双击缩放 */
}
.my-swipe {
  margin-top: 30px;
}

.selected-cell {
  font-weight: bold;
  color: #1a89fa !important;
  background-color: #c0c6cc !important;
}

.card {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  padding: 10px 20px;
  margin: 10px auto;
  width: calc(90% - 40px);
}

.bold-title2 div {
  font-weight: 900;
  font-size: 22px;
  color: #1a89fa;
}

.border-cell {
  border-top: 4px solid #eee;
}

.custom-cell-group:not(:last-child) {
  margin-bottom: 10px;
}

.chinese-cell {
  border-bottom: 0.5px solid #eee;
}

.chinese-cell:last-of-type {
  border-bottom: none; /* 移除最后一个中文选项的分割线 */
}

.nav-bar-container {
  position: sticky;
  top: 0;
  z-index: 100;
}
.nav-bar-right {
  display: flex;
  align-items: center;
}
.nav-button {
  margin-left: 10px;
  padding: 5px 5px;
  margin-top: 4px;
  color: #208bfa;
  cursor: pointer;
  user-select: none;
}

.my-swipe-container {
  margin-top: 10px;
  margin-left: auto;
  margin-right: auto;
  display: flex;
  justify-content: center;
}

.flying-tag {
  animation: fly-up 0.5s ease-out;
  display: flex;
  justify-content: space-between;
}

.small-font {
  font-size: 12px; /* 调整为你需要的大小 */
}

.gray-background {
  background-color: gray; /* 背景颜色 */
}

.not-clickable {
  pointer-events: none; /* 禁止点击 */
  background-color: transparent; /* 背景保持透明 */
}
/* 购物车 */
.animated-item {
  position: fixed;
  width: 20px;
  height: 20px;
  background: red; /* 绿色小球 */
  border-radius: 50%;
  z-index: 999; /* 确保在其他元素之上 */
}
/* 动画 */
/* 初始样式 */
.fail-img {
  width: 5rem;
  height: auto;
  margin-bottom: -1.5rem;
}

/* 进入动画 */
.slide-fade-enter-active {
  animation: slideIn 0.5s ease-out forwards;
}

/* 离开动画（渐隐消失） */
.slide-fade-leave-active {
  animation: fadeOut 0.5s ease-in forwards;
}

/* 滑入动画 */
@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

/* 渐隐动画 */
@keyframes fadeOut {
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
}
</style>

