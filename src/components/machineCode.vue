<script setup>
import { ref, onMounted, getCurrentInstance, reactive } from "vue";
import "vant/lib/index.css";
import QRCode from "qrcode";

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
  showSuccessToast,
} from "vant";
import "vant/lib/index.css";
import PasswordDialog from "./PasswordDialog.vue";
import Global from "./Global.vue";
import { useRouter } from "vue-router";

const selectedItems = ref([]);
const filterXlsmData = ref([]);
const codePage = ref(1);
const codePageSize = 20;
const hasMoreCodes = ref(false);
const loadingMore = ref(false);
const showDialogPassWord = ref(false);
function formatDate_log(dateStr) {
  const date = new Date(dateStr);
  // 转为北京时间（UTC+8）
  // const offsetDate = new Date(date.getTime() + 8 * 60 * 60 * 1000);
  const offsetDate = new Date(date.getTime());

  const year = offsetDate.getFullYear();
  const month = String(offsetDate.getMonth() + 1).padStart(2, "0");
  const day = String(offsetDate.getDate()).padStart(2, "0");
  const hours = String(offsetDate.getHours()).padStart(2, "0");
  const minutes = String(offsetDate.getMinutes()).padStart(2, "0");
  const seconds = String(offsetDate.getSeconds()).padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

const deleteItem = (index) => {
  // console.log('index: ', index);
  showConfirmDialog({
    title: `${filterXlsmData.value[index]["code"]}`,
    message: `是否确认删除?`,
    theme: "round-button",
  }).then(async () => {
    const params = new URLSearchParams();
    params.append("method", "deleteCodeItem");
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
async function queryData(page = 1) {
  if (page === 1) {
    codePage.value = 1;
    hasMoreCodes.value = false;
    loadingMore.value = false;
  }
  const params = new URLSearchParams();
  params.append("method", "queryCode");
  params.append("page", page);
  params.append("pageSize", codePageSize);
  const toast1 =
    page === 1
      ? showLoadingToast({
          duration: 0,
          message: "加载中...",
        })
      : null;
  const response = await axios.post("scans/", params);
  toast1?.close();

  const pageData = response.data?.status === "ok" ? response.data.data || [] : [];
  filterXlsmData.value = page === 1 ? pageData : [...filterXlsmData.value, ...pageData];
  codePage.value = page;
  hasMoreCodes.value = Boolean(response.data?.hasMore);
  console.log("filterXlsmData: ", filterXlsmData.value);
}

const loadMoreCodes = async () => {
  if (!hasMoreCodes.value) {
    loadingMore.value = false;
    return;
  }
  await queryData(codePage.value + 1);
  loadingMore.value = false;
};
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

// 生成二维码
const qrUrl = ref("");
const qrDataUrl = ref("");
const codeValue = ref("");
const showMachineCode = ref(false);
const generateCode = (index) => {
  const codeText = filterXlsmData.value[index]["code"];
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(codeText).then(() => {
      showToast("已复制到剪贴板");
    }).catch(() => {
      fallbackCopy(codeText);
    });
  } else {
    fallbackCopy(codeText);
  }
};

// 备用复制方法（兼容旧浏览器）
const fallbackCopy = (text) => {
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    // 避免滚动条出现
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    if (successful) {
      showToast("已复制到剪贴板");
    } else {
      showToast("复制失败，请重试");
    }
  } catch (err) {
    showToast("复制失败，请重试");
  } finally {
    // 清理DOM元素
    const textArea = document.querySelector('textarea[style*="-999999px"]');
    if (textArea) {
      document.body.removeChild(textArea);
    }
  }
};
const saveImage = () => {
  if (!qrDataUrl.value) return;

  const link = document.createElement("a");
  link.href = qrDataUrl.value;
  link.download = codeValue.value + ".png"; // 保存的文件名
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// 生成新扫码书code
const showGenerateCode = ref(false);
const valueNewCode = ref("");
const scanCodeLevel = ref("高中");
function generateRandomCode(length = 12) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    const randIndex = Math.floor(Math.random() * chars.length);
    result += chars[randIndex];
  }
  valueNewCode.value = result;
  return result;
}
const submitNewCode = async () => {
  if (!valueNewCode.value) {
    showFailToast("不能为空");
    return;
  }
  showDialog({
    title: "生成新code",
    message: `是否确定生成${scanCodeLevel.value}扫码书机器码 ${valueNewCode.value}`,
    theme: "round-button",
  }).then(async () => {
    const toast1 = showLoadingToast({
      duration: 0,
      message: "提交中...",
    });
    const params = new URLSearchParams();
    params.append("method", "generateNewCode");
    params.append("valueCode", valueNewCode.value);
    params.append("level", scanCodeLevel.value);
    const response = await axios.post("scans/", params);
    // console.log("response: ", response);
    toast1.close();
    if (response.data.status == "ok") {
      showSuccessToast(response.data.message);
      showGenerateCode.value = false;
      valueNewCode.value = "";
      queryData();
    } else if (response.data.status == "error") {
      showFailToast(response.data.message);
    }
  });
};

// 生成新跟读code
const valueNewCodeFollow = ref("");
const followCodeLevel = ref("高中");
function generateRandomCodeFollow(length = 12) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    const randIndex = Math.floor(Math.random() * chars.length);
    result += chars[randIndex];
  }
  valueNewCodeFollow.value = result;
  return result;
}
const submitNewCodeFollow = async () => {
  if (!valueNewCodeFollow.value) {
    showFailToast("不能为空");
    return;
  }
  showDialog({
    title: "生成新跟读code",
    message: `是否确定生成${followCodeLevel.value}跟读机器码 ${valueNewCodeFollow.value}`,
    theme: "round-button",
  }).then(async () => {
    const toast1 = showLoadingToast({
      duration: 0,
      message: "提交中...",
    });
    const params = new URLSearchParams();
    params.append("method", "generateNewCodeFollow");
    params.append("valueCode", valueNewCodeFollow.value);
    params.append("level", followCodeLevel.value);
    const response = await axios.post("scans/", params);
    console.log("response: ", response);
    toast1.close();
    if (response.data.status == "ok") {
      showSuccessToast(response.data.message);
      showGenerateCode.value = false;
      valueNewCodeFollow.value = "";
      queryData();
    } else if (response.data.status == "error") {
      showFailToast(response.data.message);
    }
  });
};

// 修改code
const revisedBinCode = (item) => {
  console.log("item: ", item);
  showConfirmDialog({
    title: `${item["code"]}`,
    message: `是否确认重制?`,
    theme: "round-button",
  }).then(async () => {
    const toast1 = showLoadingToast({
      duration: 0,
      message: "重置中...",
    });
    const params = new URLSearchParams();
    params.append("method", "resetCode");
    params.append("bindCode", item["code"]);
    const response = await axios.post("scans/", params);
    toast1.close();
    console.log(response.data);
    await queryData();
    showSuccessToast("重置成功");
  });
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
      <van-nav-bar
        title="机器码"
        @click-left="showGenerateCode = true"
        left-text="新生成"
      >
      </van-nav-bar>
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
    <van-list
      v-model:loading="loadingMore"
      :finished="!hasMoreCodes"
      finished-text="已全部加载"
      :immediate-check="false"
      @load="loadMoreCodes"
      style="margin-bottom: 80px"
    >
      <van-cell-group>
        <van-swipe-cell
          v-for="(item, index) in filterXlsmData"
          :key="item.nid || index"
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
            <van-button
              square
              type="success"
              text="重置"
              style="height: 100%"
              @click="revisedBinCode(item)"
            />
          </template>
          <van-cell
            :title="item.code"
            style="padding-top: 0.5rem; padding-bottom: 0.5rem"
            @click="generateCode(index)"
          >
            <pre>{{ item.is_used }}</pre>
            <template #label>
              <span
                class="custom-label"
                :class="{ 'custom-label-long': String(item.type || '').length > 5 }"
              >{{ `${formatDate_log(item.created_at)}  ${item.type}` }}</span>
            </template>
          </van-cell>
        </van-swipe-cell>
      </van-cell-group>
    </van-list>

    <!-- 生成新code -->
    <van-popup
      closeable
      v-model:show="showGenerateCode"
      position="bottom"
      :style="{ height: '85%' }"
      round
    >
      <div style="font-size: 18px; font-weight: 700; margin: 1rem">
        生成扫码书code
      </div>
      <van-cell-group inset>
        <van-radio-group v-model="scanCodeLevel" direction="horizontal" style="padding: 0.75rem 0">
          <van-radio name="高中">高中</van-radio>
          <van-radio name="初中">初中</van-radio>
        </van-radio-group>
        <van-cell
          title="Code"
          :value="valueNewCode || '点击生成按钮'"
          is-link
          clickable
          @click="generateRandomCode(12)"
        />
        <van-button
          @click="submitNewCode"
          size="large"
          type="warning"
          style="margin-top: 0.5rem"
        >
          提交
        </van-button>
      </van-cell-group>
      <van-divider :style="{ borderColor: '#1989fa', padding: '0 16px' }">
        扫码书 / 跟读
      </van-divider>
      <div style="font-size: 18px; font-weight: 700; margin: 1rem 1rem 1rem">
        生成跟读code
      </div>
      <van-cell-group inset>
        <van-radio-group v-model="followCodeLevel" direction="horizontal" style="padding: 0.75rem 0">
          <van-radio name="高中">高中</van-radio>
          <van-radio name="初中">初中</van-radio>
        </van-radio-group>
        <van-cell
          title="Code"
          :value="valueNewCodeFollow || '点击生成按钮'"
          is-link
          clickable
          @click="generateRandomCodeFollow(12)"
        />
        <van-button
          @click="submitNewCodeFollow"
          size="large"
          type="primary"
          style="margin-top: 0.5rem"
        >
          提交
        </van-button>
      </van-cell-group>
    </van-popup>

    <van-dialog
      v-model:show="showMachineCode"
      :title="codeValue"
      show-cancel-button
      confirmButtonText="保存"
      @confirm="saveImage"
    >
      <a
        :href="qrDataUrl"
        download="machine-code.png"
        style="display: block; text-align: center"
      >
        <img
          :src="qrDataUrl"
          alt="机器码二维码"
          style="max-width: 100%; margin: 1rem auto; display: block"
        />
      </a>
      <div class="qr-url">
        <a :href="qrUrl" target="_blank" rel="noopener" class="qr-link">
          {{ qrUrl }}
        </a>
      </div>
    </van-dialog>
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

.van-cell__title {
  min-width: 0;
  flex: 1 1 auto;
  overflow: hidden;
  text-overflow: ellipsis;
}

.van-cell__title,
.custom-label {
  white-space: nowrap;
}

.van-cell__value {
  flex: 0 0 auto;
}

.custom-label-long {
  min-width: 220px;
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

.qr-url {
  text-align: center;
  margin-top: 1rem;
  color: #1989fa;
  word-break: break-all;
  cursor: pointer;
  font-size: 0.9rem;
  transition: color 0.2s;
  margin: 1rem auto 0 auto;
  padding: 0 1rem;
}
.qr-url:hover {
  color: #0a71d0;
  text-decoration: underline;
}

.custom-label {
  min-width: 200px;
  display: inline-block; /* 确保 span 元素可以应用宽度 */
}
</style>
