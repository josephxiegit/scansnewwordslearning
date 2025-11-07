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
import PasswordDialog from "./PasswordDialog.vue";
import "vant/lib/index.css";
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
const updateData = (item) => {
  showConfirmDialog({
    title: `${item}`,
    message: `是否确认添加试题?`,
    theme: "round-button",
  }).then(async () => {
    const params = new URLSearchParams();
    params.append("method", "xlsmToSqlite");
    params.append("item", item);
    const toast1 = showLoadingToast({
      duration: 0,
      message: "加载中...",
    });
    const response = await axios.post("scans/", params);
    toast1.close();
    console.log(response.data);
  });
};
const deleteItem = (index) => {
  showConfirmDialog({
    title: `${filterXlsmData.value[index]}`,
    message: `是否确认删除?`,
    theme: "round-button",
  }).then(async () => {
    const params = new URLSearchParams();
    params.append("method", "deleteXlsm");
    params.append("item", filterXlsmData.value[index]);
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
async function queryData() {
  const params = new URLSearchParams();
  params.append("method", "queryXlsms");
  const toast1 = showLoadingToast({
    duration: 0,
    message: "加载中...",
  });
  const response = await axios.post("scans/", params);
  toast1.close();

  filterXlsmData.value = response.data;
  console.log("filterXlsmData: ", filterXlsmData.value);
}
const handlePassword = (pwd) => {
  // console.log("用户输入的密码是：", pwd);
  if (pwd == "ss654321") {
    localStorage.setItem("teacherPassword", pwd);
    showDialogPassWord.value = false;
  } else {
    showToast({ message: '密码错误，即将返回首页', type: 'fail' })
    setTimeout(() => {
      window.location.href = '/homepage' // 替换为你想跳转的地址
    }, 1500) // 给点时间让用户看到 toast
  }
};
// 多选修改分组
const cellValue = ref(true);
const isMultiSelectMode = ref(false);
const toggleMultiSelectMode = () => {
  cellValue.value = !cellValue.value;
  isMultiSelectMode.value = !isMultiSelectMode.value;
  if (!isMultiSelectMode.value) {
    // 清除所有选择
    selectedItems.value = [];
  }
};
const selectItem = (index) => {
  // 选中checkbox
  const selectedIndex = selectedItems.value.indexOf(index);
  if (selectedIndex !== -1) {
    selectedItems.value.splice(selectedIndex, 1);
  } else {
    selectedItems.value.push(index);
  }
};
const updateMultiData = async () => {
  showConfirmDialog({
    title: "提交数据",
    message: `是否确认提交${selectedItems.value.length}条？`,
    theme: "round-button",
  }).then(async () => {
    // console.log('selectedItems', selectedItems.value);
    const titles = selectedItems.value.map(index => filterXlsmData.value[index]);
    // console.log('titles: ', titles)
    const params = new URLSearchParams();
    params.append("method", "xlsmToSqlite_multi");
    params.append("item", JSON.stringify(titles));
    const toast1 = showLoadingToast({
      duration: 0,
      message: "提交中...",
    });
    const response = await axios.post("scans/", params);
    toast1.close();
    isMultiSelectMode.value = false;

  })

}

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
      <van-nav-bar 
        title="xlsm列表"
        :left-text="isMultiSelectMode ? '关闭' : '多选'"
        :right-text="isMultiSelectMode ? '提交' : ''"
        @click-left="toggleMultiSelectMode()"
        @click-right="updateMultiData()"
        
        > </van-nav-bar>
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
      <van-tabbar-item
        icon="link-o"
        replace
        :to="{ path: '/machineCode' }"
        >机器码</van-tabbar-item
      >
    </van-tabbar>

    <!-- 数据列表 -->
    <van-cell-group v-model="selectedItems" style="margin-bottom: 80px">
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
          :title="item"
          style="padding-top: 0.5rem; padding-bottom: 0.5rem"
          @click="isMultiSelectMode ? selectItem(index) : updateData(item)"
        >
        <template #right-icon>
            <van-checkbox
              v-if="isMultiSelectMode"
              :checked="selectedItems.includes(index)"
              @click.stop="selectItem(index)"
            />
          </template>
        </van-cell>
      </van-swipe-cell>
    </van-cell-group>
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

