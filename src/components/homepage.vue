<script setup>
import { ref, onMounted, getCurrentInstance, reactive, nextTick } from "vue";
import "vant/lib/index.css";
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
import { useRouter } from "vue-router";
import welcome from "./animation/welcome.vue";
import half from "./animation/half.vue";
import review from "./animation/review.vue";
import Global from "./Global.vue";
import FingerprintJS from "@fingerprintjs/fingerprintjs";
import successSound from "../assets/sound/success.mp3";
import turnfailSound from "../assets/sound/turnfail.mp3";
import woohooSound from "../assets/sound/woohoo.mp3";

const instance = getCurrentInstance();
const axios = instance.appContext.config.globalProperties.$ajax;

const router = useRouter();

const synonymsOptions = ref([]);
const completeCount = ref(0);
const currentIndex = ref(0);
const selectedIndexes = ref({});
const selectedResults = ref({});
const selectedItems = ref([]);
const resultDataTempt = ref([]);
const synonymsSelected = ref([]);
const flagSingleOrMultiChoice = ref("Single Choice");
const checkboxRefs = ref([]);
const showUserInput = ref(false);
const valueUsername = ref("");
const showTabNav = ref(false);
const initialData = ref([]);
// 提交按钮
const mergedData = ref([]);

const mergeSynonymAndSelections = (synonymsSelectedChinese) => {
  return mergedData.value.map((item) => {
    const 用户选择 = synonymsSelectedChinese[item.序号 - 1]?.中文 || [];
    return {
      ...item,
      用户选择,
    };
  });
};
const mergeAnswerAndSynonym = () => {
  let newList = [];
  for (let i = 0; i < synonymsOptions.value.length; i++) {
    let obj = {};
    obj["序号"] = synonymsOptions.value[i].序号;
    obj["中文"] = synonymsOptions.value[i].中文;
    obj["英文"] = synonymsOptions.value[i].英文;
    obj["is_spell"] = synonymsOptions.value[i].is_spell;
    obj["答案"] = synonymsOptions.value[i].答案;
    obj["正确答案"] = synonymsOptions.value[i].正确答案;
    obj["type"] = synonymsOptions.value[i].type;
    newList.push(obj);
  }
  // console.log("newList: ", newList);
  return newList;
};
const convertSelections = (synonymsSelected, synonymsOptions) => {
  // console.log('synonymsOptions: ', synonymsOptions)
  // console.log('synonymsSelected: ', synonymsSelected)
  const resultMap = new Map();

  // 初始化：每个序号都设为 ["无"]
  synonymsOptions.forEach((option) => {
    resultMap.set(String(option.序号), ["无"]);
  });

  // 处理选择
  synonymsSelected.forEach((selection) => {
    const [dictNumber, chineseIndex] = selection.split("-").map(Number);
    const dictNumberStr = String(dictNumber);
    const dictEntry = synonymsOptions.find(
      (item) => String(item.序号) === dictNumberStr
    );
    if (dictEntry) {
      const chineseWord = dictEntry.中文[chineseIndex - 1];
      const currentList = resultMap.get(dictNumberStr);
      if (currentList[0] === "无") {
        resultMap.set(dictNumberStr, [chineseWord]);
      } else {
        currentList.push(chineseWord);
      }
    }
  });

  // 输出数组格式并排序
  return Array.from(resultMap, ([序号, 中文]) => ({ 序号, 中文 })).sort(
    (a, b) => Number(a.序号) - Number(b.序号)
  );
};

let originalChinese = "";
const toggleCheckChinese = (index, index2) => {
  if (isCheckboxDisabled.value) return;
  const key = `${index}-${index2}`;
  const checkboxRef = checkboxRefs.value[key];
  if (checkboxRef) {
    checkboxRef.toggle();
  }

  // 捕捉用户是否取消了选项
  const wasSelected = selectedIndexes.value[key]; // 之前的状态
  selectedIndexes.value[key] = !wasSelected; // 切换状态

  // 更新选择结果
  const selectedChineses = selectedResults.value[index] || [];
  const currentChinese = synonymsOptions.value[index].中文[index2];
  const is_spell_selectedItems = synonymsOptions.value[index].is_spell;
  if (selectedIndexes.value[key]) {
    // 如果选中，添加到累积数组中
    selectedChineses.push(currentChinese);
  } else {
    // 如果取消选中，从累积数组中移除
    const removeIndex = selectedChineses.indexOf(currentChinese);
    if (removeIndex !== -1) {
      selectedChineses.splice(removeIndex, 1);
    }
  }
  selectedResults.value[index] = selectedChineses; // 更新累积的选项结果
  // console.log("selectedChineses", selectedChineses);
  // 累积选中的选项转换为字符串
  let mergedChinese = selectedChineses.join("");

  // 与 answers.value[index].英文 比对长度
  // const answerEnglish = answers.value[index]?.英文;
  const answerEnglish = synonymsOptions.value[index]?.答案;
  // console.log("answerEnglish: ", answerEnglish);
  // 在相同位置添加空格

  let addedChinese = "";
  const containsSpace = answerEnglish.includes(" ");
  const containsChinese = /[\u4e00-\u9fa5]/.test(answerEnglish); // 使用正则表达式检查中文字符

  if (containsSpace && !containsChinese) {
    if (answerEnglish && mergedChinese.length <= answerEnglish.length) {
      let spacedChinese = "";
      let chineseIndex = 0;

      for (let i = 0; i < answerEnglish.length; i++) {
        if (answerEnglish[i] === " ") {
          spacedChinese += " "; // 在相同位置添加空格
        } else {
          spacedChinese += mergedChinese[chineseIndex] || ""; // 添加中文字符
          chineseIndex++;
        }
      }

      mergedChinese = spacedChinese.trim(); // 更新带空格的字符串
      // console.log("mergedChinese: ", mergedChinese);

      // 计算新增的部分

      let originalIndex = 0;

      // 比较 mergedChinese 和 originalChinese，找出新增的部分
      for (let i = 0; i < mergedChinese.length; i++) {
        // 如果 originalIndex 已经到达 originalChinese 的末尾，或者字符不相等，则记录新增部分
        if (
          originalIndex >= originalChinese.length ||
          mergedChinese[i] !== originalChinese[originalIndex]
        ) {
          // 如果是空格，则替换成两个空格
          if (mergedChinese[i] === " ") {
            addedChinese += "  "; // 替换空格为两个空格
          } else {
            addedChinese += mergedChinese[i]; // 记录新增的字符
          }
        } else {
          originalIndex++; // 如果字符相同，则移动 originalChinese 的指针
        }
      }

      // console.log("addedChinese: ", addedChinese); // 输出新增的部分
      // console.log("addedChinese: ", addedChinese.length); // 输出新增的部分
    }
    // 更新选中的项列表
    const existingItemIndex = selectedItems.value.findIndex(
      (item) => item.key === key
    );
    if (selectedIndexes.value[key]) {
      if (existingItemIndex !== -1) {
        // 如果选项已存在，更新其 label
        selectedItems.value[existingItemIndex].label = mergedChinese;
      } else {
        // 如果选项不存在，添加新的选项
        selectedItems.value.push({
          label: addedChinese, // 使用带空格的字符串作为 label
          key: key,
          is_spell: is_spell_selectedItems,
        });
      }
    } else {
      // 从选中的项列表中移除
      selectedItems.value = selectedItems.value.filter(
        (item) => item.key !== key
      );
    }
  } else {
    const existingItemIndex = selectedItems.value.findIndex(
      (item) => item.key === key
    );
    if (selectedIndexes.value[key]) {
      if (existingItemIndex !== -1) {
        // 如果选项已存在，更新其 label
        selectedItems.value[existingItemIndex].label = mergedChinese;
      } else {
        // 如果选项不存在，添加新的选项
        selectedItems.value.push({
          label: currentChinese, // 使用带空格的字符串作为 label
          key: key,
          is_spell: is_spell_selectedItems,
        });
      }
    } else {
      // 从选中的项列表中移除
      selectedItems.value = selectedItems.value.filter(
        (item) => item.key !== key
      );
    }
  }
  originalChinese = mergedChinese;
  mergedData.value = mergeAnswerAndSynonym();
  // 将用户选择转化为中文
  const synonymsSelectedChinese = convertSelections(
    synonymsSelected.value,
    synonymsOptions.value
  );
  // 将中文用户选择和选项答案合并
  // console.log("synonymsSelectedChinese", synonymsSelectedChinese);
  resultDataTempt.value = mergeSynonymAndSelections(synonymsSelectedChinese);

  completeCount.value = resultDataTempt.value.reduce((count, item) => {
    if (item.用户选择[0] !== "无") {
      return count + 1;
    }
    return count;
  }, 0);
};

function isSelected(index, index2) {
  return selectedIndexes.value[`${index}-${index2}`];
}
// 动画
const isButtonDisabled = ref(false);
const totalSlides = ref(25); // 假设总共有5个轮播图项
const swipeRef = ref(null);
const showFailGif = ref(false);
const triggerFailGif = () => {
  showFailGif.value = true;

  // 2秒后隐藏
  setTimeout(() => {
    showFailGif.value = false;
  }, 5500);
};

// 购物车
const mistakesList = ref([]);
const submitList = ref([]);
const cartIcon = ref(null); // 购物车图标的引用
const showAnimation = ref(false); // 控制动画显示
const animationStyle = reactive({
  left: "50vw", // 初始水平位置（屏幕中间）
  top: "50vh", // 初始垂直位置（屏幕中间）
  transform: "translate(-50%, -50%)", // 居中显示
});
const cartCount = ref(0); // 购物车数量

const startAnimation = () => {
  cartCount.value++; // 增加购物车数量
  showAnimation.value = true; // 显示动画元素

  // 获取起点和终点位置
  const startX = window.innerWidth / 2;
  const startY = window.innerHeight / 4;
  const cartRect = cartIcon.value.$el.getBoundingClientRect();
  const endX = cartRect.left + cartRect.width / 2;
  const endY = cartRect.top + cartRect.height / 2;

  // 定义动画参数
  const duration = 500; // 动画持续时间，1.5秒
  let startTime = null;
  const height = -150; // 抛物线最高点向上偏移（负值表示向上抛高）

  // 缓动函数
  const easeOutQuad = (t) => t * (2 - t); // ease-out for ascent
  const easeInQuad = (t) => t * t; // ease-in for descent

  // 动画函数
  const animate = (timestamp) => {
    if (!startTime) startTime = timestamp;
    const elapsed = timestamp - startTime;
    let t = elapsed / duration;
    if (t >= 1) {
      // 动画结束
      showAnimation.value = false;
      animationStyle.left = "50vw";
      animationStyle.top = "50vh";
      animationStyle.transform = "translate(-50%, -50%)";
      return;
    }

    // 调整 t 以实现非匀速动画
    if (t < 0.5) {
      t = easeOutQuad(t * 2) / 2; // 前半段缓动
    } else {
      t = 0.5 + easeInQuad((t - 0.5) * 2) / 2; // 后半段缓动
    }

    // 计算抛物线路径
    const x = startX + (endX - startX) * t;
    const y = startY + (endY - startY) * t + height * t * (1 - t); // 抛物线公式

    // 更新动画元素位置
    animationStyle.left = `${x}px`;
    animationStyle.top = `${y}px`;
    animationStyle.transform = "translate(-50%, -50%)";

    // 继续下一帧
    requestAnimationFrame(animate);
  };

  // 开始动画
  requestAnimationFrame(animate);
};

// 显示答案
const answerShow = ref(false);
const buttonText = ref("显示答案");
const buttonTextType = ref("success");
const isCheckboxDisabled = ref(false);
const textColor = ref("lightblue");

function getSingeOrMultiChoice(currentIndex) {
  if (synonymsOptions.value[currentIndex]["is_spell"]) {
    return "多选";
  }
  // 获取当前项的中文字段
  const chineseText = synonymsOptions.value[currentIndex]["答案"];
  // console.log("chineseText: ", chineseText);

  // 根据分号分割后的长度判断是单选还是多选
  const chineseTextArray = chineseText.split("；");
  const textLength = chineseTextArray.length;

  let answerType;
  if (textLength === 1) {
    answerType = "单选";
  } else {
    answerType = "多选";
  }
  return answerType;
}

const handleSwipeChange = (index) => {
  currentIndex.value = index;
};

// 点击选项
const flagChoose = ref(true);
const countdown = ref(0);
const accuracyRate = ref("100%");
const goToNext = async () => {
  // 获取当前轮播图的索引
  const currentSlideIndex = currentIndex.value;
  // console.log("selectedIndexes:", selectedIndexes.value);
  // console.log("currentSlideIndex:", currentSlideIndex);
  // 检查当前轮播图中的选中项
  const currentSlideSelections = Object.keys(selectedIndexes.value).filter(
    (key) => key.startsWith(`${String(currentSlideIndex)}-`)
  );
  const hasSelection = currentSlideSelections.some(
    (key) => selectedIndexes.value[key]
  );

  if (!hasSelection) {
    showFailToast("不能为空哦");
    return;
  }

  if (!isButtonDisabled.value) {
    if (buttonText.value == "显示答案") {
      // 显示答案
      answerShow.value = true;
      buttonText.value = "下一个";
      buttonTextType.value = "warning";
      isCheckboxDisabled.value = true;

      submitList.value.push(resultDataTempt.value[currentSlideIndex]);
      // console.log('submitList.value: ', submitList.value);

      // 判断对错
      const userSelection =
        resultDataTempt.value[currentSlideIndex]["用户选择"];
      const correctAnswer = synonymsOptions.value[currentSlideIndex]["答案"];

      const correctArray = correctAnswer
        .split(/；|,/)
        .map((item) => item.trim())
        .sort();
      const userArray = userSelection
        .join(",")
        .split(/；|,/)
        .map((item) => item.trim())
        .sort();

      const areEqual =
        correctArray.length === userArray.length &&
        correctArray.every((item) => userArray.includes(item));
      if (areEqual) {
        // console.log("正确");
        flagChoose.value = true;
        textColor.value = "green";
        const audioSuccessPage = new Audio(successSound);
        audioSuccessPage.play().catch((err) => {
          console.warn("播放失败：", err);
        });
      } else {
        const audioFailPage = new Audio(turnfailSound);
        audioFailPage.play().catch((err) => {
          console.warn("播放失败：", err);
        });
        // mistakesList.value.push(resultDataTempt.value[currentSlideIndex]);
        mistakesList.value.push(
          JSON.parse(JSON.stringify(resultDataTempt.value[currentSlideIndex]))
        );

        console.log("mistakesList: ", mistakesList.value);

        startAnimation();
        triggerFailGif();
        flagChoose.value = false;
        textColor.value = "red";
        // 启用倒计时：按钮禁用8秒
        isButtonDisabled.value = true;
        countdown.value = 8;
        const timer = setInterval(() => {
          countdown.value -= 1;
          if (countdown.value <= 0) {
            clearInterval(timer);
            isButtonDisabled.value = false;
          }
        }, 1000);
      }
      if (currentIndex.value === totalSlides.value - 1) {
        buttonText.value = "任务完成";
        buttonTextType.value = "danger";
      }
    } else {
      // 进入下一个单词
      if (currentSlideIndex == 9) {
        showAnimationhalf();
      }
      // submitList.value.push(resultDataTempt.value[currentSlideIndex]);
      if (currentIndex.value < totalSlides.value - 1) {
        flagSingleOrMultiChoice.value = getSingeOrMultiChoice(
          currentIndex.value + 1
        );
        completeCount.value = (parseInt(completeCount.value) + 1).toString();
        swipeRef.value.next();
        buttonTextType.value = "success";
        isCheckboxDisabled.value = false;
        answerShow.value = false;
        buttonText.value = "显示答案";
        speakWord(
          synonymsOptions.value[currentIndex.value + 1].英文,
          synonymsOptions.value[currentIndex.value + 1].正确答案
        );
      } else {
        // 到达最后一个轮播图，执行提交函数
        endTime.value = new Date();
        calculateTimeDifference();

        if (cartCount.value == 0) {
          if (localStorage.getItem("user_mini")) {
            redirectPush();
          } else {
            showUserInput.value = true;
          }
        } else {
          if (!localStorage.getItem("dailyAnimation")) {
            localStorage.setItem("dailyAnimation", "true");
          }

          accuracyRate.value =
            (
              ((synonymsOptions.value.length - mistakesList.value.length) /
                synonymsOptions.value.length) *
              100
            ).toFixed(2) + "%";

          showAnimationReview();
          mistakesList.value.forEach((item) => {
            delete item["用户选择"];
          });
          synonymsOptions.value = mistakesList.value;
          function shuffleArray(array) {
            for (let i = array.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [array[i], array[j]] = [array[j], array[i]]; // 交换元素
            }
            return array;
          }
          synonymsOptions.value.forEach((item, index) => {
            item.序号 = index + 1;
            item.中文 = shuffleArray([...item.中文]); // 使用扩展运算符创建副本，避免直接修改原始数组
          });
          completeCount.value = 0;
          isCheckboxDisabled.value = false;
          selectedItems.value = [];
          speakWord(
            synonymsOptions.value[0].英文,
            synonymsOptions.value[0].正确答案
          );
          flagSingleOrMultiChoice.value = getSingeOrMultiChoice(0);
          answerShow.value = false;
          selectedIndexes.value = {};
          synonymsSelected.value = [];
          buttonText.value = "显示答案";
          buttonTextType.value = "success";
          currentIndex.value = 0;
          totalSlides.value = synonymsOptions.value.length;
          mistakesList.value = [];
          cartCount.value = 0;

          nextTick(() => {
            if (swipeRef.value) {
              swipeRef.value.swipeTo(0);
            }
          });
        }
      }
    }
  }
};

const speakWord = (english, answer) => {
  // 发音
  // try {
  //   let utterance;
  //   utterance = new SpeechSynthesisUtterance(english);
  //   if (!/[a-zA-Z]/.test(english)) {
  //     utterance.lang = "zh-CN";
  //   } else {
  //     utterance.lang = "en-US";
  //   }
  //   window.speechSynthesis.speak(utterance);
  // } catch (error) {
  //   console.error("Error speaking word:", error);
  // }
  const word = /[a-zA-Z]/.test(english) ? english : answer;
  const url = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(
    word
  )}&type=1`;
  const audio = new Audio(url);
  audio.play().catch(() => {
    let utterance;
    utterance = new SpeechSynthesisUtterance(english);
    if (!/[a-zA-Z]/.test(english)) {
      utterance.lang = "zh-CN";
    } else {
      utterance.lang = "en-US";
    }
    window.speechSynthesis.speak(utterance);
  });
};

const redirectPush = () => {
  updateAccountItem();
  router.push({
    path: "/complete",
    state: {
      accuracyRate: accuracyRate.value,
      timeDifference: timeDifference.value,
    },
  });
};

const updateAccountItem = async () => {
  const params = new URLSearchParams();
  // const valueName = localStorage.getItem("user_mini") || valueUsername.value;
  const rawName = localStorage.getItem("user_mini");
  const valueName = rawName ? JSON.parse(rawName) : valueUsername.value;

  params.append("log", JSON.stringify(submitList.value));
  params.append("method", "updateAccountItem");
  params.append("username", valueName);
  params.append("title", initialData.value.title);
  params.append("account_id", initialData.value.nid);

  const response = await axios.post("scans/", params);
};
const gotoComplete = () => {
  if (valueUsername.value.trim() == "") {
    showFailToast("录入昵称");
    return;
  } else {
    localStorage.setItem("user_mini", JSON.stringify(valueUsername.value));
    redirectPush();
  }
};

// 半程鼓励
const welcomeRef = ref(null);
const halfRef = ref(null);
const reviewRef = ref(null);
const animationVisible = ref(false);
const animationhalfVisible = ref(false);
const animationreviewVisible = ref(false);
function showAnimationWelcome() {
  if (welcomeRef.value.visible) {
    welcomeRef.value.hide();
  } else {
    welcomeRef.value.show();
  }
  animationVisible.value = !animationVisible.value;
}
function showAnimationhalf() {
  const audioFailPage = new Audio(woohooSound);
  audioFailPage.play().catch((err) => {
      console.warn("播放失败：", err);
  });
  if (halfRef.value.visible) {
    halfRef.value.hide();
  } else {
    halfRef.value.show();
  }
  animationhalfVisible.value = !animationhalfVisible.value;
}
function showAnimationReview() {
  if (reviewRef.value.visible) {
    reviewRef.value.hide();
  } else {
    reviewRef.value.show();
  }
  animationreviewVisible.value = !animationreviewVisible.value;
}

const startTime = ref(null);
const endTime = ref(null);
const timeDifference = ref("");
function calculateTimeDifference() {
  if (startTime.value && endTime.value) {
    const diffInSeconds = Math.floor((endTime.value - startTime.value) / 1000);
    const minutes = Math.floor(diffInSeconds / 60);
    const seconds = diffInSeconds % 60;
    timeDifference.value = `${minutes}分${seconds}秒`; // 格式化时间差
  }
}
// 设备信息
const showCodeInput = ref(false);
const bindCode = ref("");
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
    const clientId = getOrCreateClientId(); // 生成随机唯一标识
    const deviceFingerprint = await getStableFingerprint(); // 生成和机器绑定的唯一标识
    const fingerprintHash = deviceFingerprint.visitorId;
    const components = Object.fromEntries(
      Object.entries(deviceFingerprint.components).map(([key, val]) => [
        key,
        val.value,
      ])
    );
    // console.log("components: ", components);
    // console.log("Client ID:", clientId);
    // console.log("Device Fingerprint:", deviceFingerprint);
    // console.log("bindCode", bindCode.value);
    const response = await axios.post("scans/", {
      method: "newCode",
      clientId,
      fingerprintHash,
      components,
      bindCode: bindCode.value,
    });

    console.log("status:", response.data.status);
    console.log("message: ", response.data.message);
    toast1.close();
    if (response.data.status === "ok") {
      showCodeInput.value = false;
      showSuccessToast("验证成功");
      localStorage.setItem("bindCode", bindCode.value);
      initData();
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

// const checkCode = async () => {
//   if (!bindCode.value) {
//     showFailToast("不能为空");
//     return;
//   } else {
//     const toast1 = showLoadingToast({
//       duration: 0,
//       message: "验证中...",
//     });

//     const clientId = getOrCreateClientId(); // 生成随机唯一标识
//     const deviceFingerprint = await getStableFingerprint(); // 生成和机器绑定的唯一标识
//     const fingerprintHash = deviceFingerprint.visitorId;
//     const components = Object.fromEntries(
//       Object.entries(deviceFingerprint.components).map(([key, val]) => [
//         key,
//         val.value,
//       ])
//     );
//     console.log("components: ", components);

//     console.log("Client ID:", clientId);
//     console.log("Device Fingerprint:", deviceFingerprint);

//     try {
//       const response = await axios.post("scans/", {
//         method: "checkCode",
//         clientId,
//         fingerprintHash,
//         components,
//         bindCode: bindCode.value,
//       });
//       console.log("response: ", response.data);
//       // console.log(response.data.message);

//       toast1.close();

//       // 验证成功
//       if (response.data.status === "ok") {
//         showCodeInput.value = false;
//         showSuccessToast("验证成功");
//         localStorage.setItem("bindCode", bindCode.value);
//         initData();
//       }

//       // 验证失败
//       if (response.data.status === "forbidden") {
//         localStorage.removeItem("bindCode");
//         localStorage.removeItem("client_id");
//         showDialog({
//           title: "机器码已被其他机器绑定",
//           message: "如有异议联系老师：\n微179254624，获新机器码",
//           theme: "round-button",
//         }).then(() => {
//           window.location.reload();
//         });
//       }

//       // 验证异常
//       if (response.data.status === "false") {
//         localStorage.removeItem("bindCode");
//         localStorage.removeItem("client_id");
//         showCodeInput.value = true;
//         showFailToast("请再次录入");
//       }
//     } catch (err) {
//       toast1.close(); // 保证无论成功失败都关闭 loading

//       showDialog({
//         title: "其他异常",
//         message: "如有异议联系老师：\n微179254624，获新机器码",
//         theme: "round-button",
//       }).then(() => {
//         window.location.reload();
//       });

//       console.error("绑定异常:", err);
//     }
//   }
// };
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
    // fallback: 使用时间戳（可加点随机数避免重复）
    return "uuid-" + Date.now() + "-" + Math.floor(Math.random() * 1000000);
  }
}
const getOrCreateClientId = () => {
  let clientId = localStorage.getItem("client_id");
  if (!clientId) {
    // clientId = crypto.randomUUID();
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
function initData() {
  synonymsOptions.value = JSON.parse(initialData.value.synonyms);

  const answers = JSON.parse(initialData.value.answers);
  totalSlides.value = synonymsOptions.value.length;

  // 通用的 Fisher–Yates 洗牌算法
  function mergeAndShuffle(synonyms, answers) {
    // 1. 英文 -> 中文答案 的映射表
    const answerMap = {};
    answers.forEach((item) => {
      answerMap[item["英文"].trim()] = item["中文"];
    });

    // 2. 打乱整个 synonyms 数组
    const shuffled = shuffleArray([...synonyms]);

    // 3. 合并答案，并打乱每一项的“中文”字段，重新编号
    shuffled.forEach((item, index) => {
      const english = item["英文"].trim();
      const answer = answerMap[english] || "";

      item["答案"] = answer;
      item["正确答案"] = answer;
      item["中文"] = shuffleArray(item["中文"]);
      item["序号"] = (index + 1).toString();
    });

    // 4. 更新状态
    synonymsOptions.value = shuffled;
  }

  function shuffleArray(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  mergeAndShuffle(synonymsOptions.value, answers);
  // console.log("synonymsOptions", synonymsOptions.value);
  flagSingleOrMultiChoice.value = getSingeOrMultiChoice(0);
  speakWord(synonymsOptions.value[0].英文, synonymsOptions.value[0].正确答案);
}
onMounted(async () => {
  // let localTeacherPassword = window.localStorage.getItem("teacherPassword");
  // localTeacherPassword = atob(localTeacherPassword);
  // if (localTeacherPassword == "ss27834894") {
  //   showTabNav.value = true;
  // }

  // 测试机器码
  // http://localhost:5173/homepage?param=1748931148
  const toast1 = showLoadingToast({
    duration: 0,
    message: "加载中...",
  });
  showAnimationWelcome();
  startTime.value = new Date();

  // 初始化数据
  const query = new URLSearchParams(window.location.search);
  const param = query.get("param");
  console.log("param: ", param);
  let url = Global.BASE_URL + "/scans/?param=" + param;
  // let url = "http://localhost:5173/homepage?param=123";
  const params = new URLSearchParams();
  params.append("method", "queryData");

  const response = await axios.post(url, params, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  toast1.close();
  if (response.data == "未找到数据") {
    welcomeRef.value.hide();
    showFailToast("未找到数据");
    return;
  }
  initialData.value = response.data;
  console.log("initData: ", initialData.value);
  // synonymsOptions.value = JSON.parse(initialData.value.synonyms).slice(0, 3);
  // initialData.value.title = "天津卷高等学校招生3500词汇";
  // 普通高等学校招生全国统一考试（天津卷）英语常用词词汇手册
  if (initialData.value.title.includes("天津卷高等学校招生3500词汇")) {
    if (!localStorage.getItem("client_id")) {
      // 录入机器码
      showCodeInput.value = true;
      return;
    } else {
      // 自动验证保存的uuid
      const toast1 = showLoadingToast({
        duration: 0,
        message: "验证中...",
      });

      const clientId = localStorage.getItem("client_id"); // 获得保存的uuid
      const bindCode = localStorage.getItem("bindCode"); // 获得保存的bindCode
      const deviceFingerprint = await getStableFingerprint(); // 生成和机器绑定的唯一标识
      const fingerprintHash = deviceFingerprint.visitorId;
      const components = Object.fromEntries(
        Object.entries(deviceFingerprint.components).map(([key, val]) => [
          key,
          val.value,
        ])
      );
      // console.log("components: ", components);
      // console.log("Client ID:", clientId);
      // console.log("Device Fingerprint:", deviceFingerprint);

      try {
        const response = await axios.post("scans/", {
          method: "checkCode",
          clientId,
          fingerprintHash,
          components,
          bindCode,
          type: "扫码书",
        });
        console.log("status: ", response.data.status);
        console.log("message: ", response.data.message);
        // console.log(response.data.message);

        toast1.close();
        // 验证成功
        if (response.data.status === "ok") {
          initData();
        }

        // 验证失败
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

        // 验证异常
        if (response.data.status === "false") {
          localStorage.removeItem("bindCode");
          localStorage.removeItem("client_id");
          showCodeInput.value = true;
          showFailToast("请再次录入");
        }
      } catch (err) {
        toast1.close(); // 保证无论成功失败都关闭 loading
        localStorage.removeItem("bindCode");
        localStorage.removeItem("client_id");
        showCodeInput.value = true;
        console.error("绑定异常:", err);
      }
    }
  } else {
    // 无需验证设备
    initData();
  }
});
</script>

<template>
  <div class="parent-container">
    <div class="nav-bar-container">
      <van-nav-bar
        :title="initialData.title"
        :left-text="`${completeCount}/${synonymsOptions.length}`"
      >
      </van-nav-bar>
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

    <!-- 动画 -->
    <div style="display: flex; justify-content: space-around">
      <img
        src="../assets/encouragement.gif"
        style="
          width: 5rem;
          height: auto;
          margin-left: 0rem;
          margin-bottom: -1.5rem;
        "
      />
      <div
        style="
          width: 5rem;
          height: auto;
          margin-bottom: -1.5rem;
          position: relative;
        "
      >
        <transition name="slide-fade">
          <img
            v-if="showFailGif"
            src="../assets/fail1.gif"
            class="fail-img"
            style="position: absolute; top: 0; left: 0"
          />
        </transition>
      </div>
    </div>

    <!-- 单词主体 -->
    <van-row justify="center">
      <van-col span="24" style="margin-top: -20px">
        <van-swipe
          class="my-swipe"
          :show-indicators="false"
          :loop="false"
          @change="handleSwipeChange"
          ref="swipeRef"
          :touchable="false"
          style="height: 420px"
        >
          <van-swipe-item v-for="(item, index) in synonymsOptions" :key="index">
            <div class="card">
              <van-checkbox-group
                class="checkbox-container"
                v-model="synonymsSelected"
                ref="checkboxRefs"
              >
                <van-cell-group>
                  <div class="custom-cell-group">
                    <van-cell
                      clickable
                      class="bold-title2 border-cell"
                      @click="speakWord(item.英文, item.正确答案)"
                    >
                      <template #title>
                        <div
                          style="
                            display: flex;
                            justify-content: space-between;
                            align-items: center;
                          "
                        >
                          <div>{{ item.序号 + ". " + item.英文 }}</div>
                          <div style="font-size: 13px; color: red">
                            {{ flagSingleOrMultiChoice }}
                            <img
                              src="../assets/speaker.png"
                              style="
                                width: 12px;
                                height: auto;
                                margin-left: 0.2rem;
                                margin-top: 0rem;
                              "
                            />
                          </div>
                        </div>
                        <div
                          :style="{
                            marginTop: '0.6rem',
                            marginBottom: '0.1rem',
                            // minHeight: answerShow ? 'auto' : '15px',
                            minHeight: '25px',
                          }"
                        >
                          <div class="flying-tag" v-if="answerShow">
                            <div
                              v-if="flagChoose"
                              :style="{
                                fontSize: '15px',
                                color: textColor,
                              }"
                            >
                              恭喜！{{ item.正确答案 }}
                            </div>
                            <div
                              v-else
                              :style="{
                                fontSize: '15px',
                                color: textColor,
                              }"
                            >
                              写错了！{{ item.正确答案 }}
                            </div>
                          </div>
                        </div>

                        <div v-show="item.is_spell" class="selected-tags">
                          <div
                            v-for="(selected, index2) in selectedItems"
                            v-show="
                              selected.is_spell == true &&
                              selected.key.split('-')[0] == String(index)
                            "
                            :key="index2"
                            style="color: orange; font-size: smaller"
                            @click="removeSelected(index2)"
                            :style="{
                              padding: '0.2rem 0px 0.3rem 0px',
                              'white-space': 'pre',
                            }"
                          >
                            {{ selected.label }}
                          </div>
                        </div>
                      </template>
                    </van-cell>

                    <van-cell-group>
                      <van-cell
                        v-for="(chinese, index2) in item.中文"
                        :key="index2"
                        clickable
                        @click="toggleCheckChinese(index, index2)"
                        :class="
                          isSelected(index, index2) ? 'selected-cell' : ''
                        "
                        class="chinese-cell"
                      >
                        <template #title>
                          <div style="text-align: left">{{ chinese }}</div>
                        </template>
                        <template #right-icon>
                          <van-checkbox
                            :name="`${index + 1}-${index2 + 1}`"
                            @click.stop.prevent="
                              toggleCheckChinese(index, index2)
                            "
                            :ref="
                              (el) => (checkboxRefs[`${index}-${index2}`] = el)
                            "
                            :disabled="isCheckboxDisabled"
                          />
                        </template>
                      </van-cell>
                    </van-cell-group>
                  </div>
                </van-cell-group>
              </van-checkbox-group>
            </div>
          </van-swipe-item>
        </van-swipe>
      </van-col>
    </van-row>

    <!-- 购物车 -->
    <van-row>
      <van-col span="8" offset="16" style="margin-top: -20px">
        <van-badge :content="cartCount">
          <van-icon
            ref="cartIcon"
            name="cart-o"
            color="#1989fa"
            size="2.5rem"
          />
        </van-badge>
      </van-col>
    </van-row>

    <!-- 下一个按钮 -->
    <van-row class="my-swipe-container" style="position: relative">
      <van-col span="2"></van-col>
      <van-col span="14">
        <van-button
          :type="buttonTextType"
          @click="goToNext"
          size="large"
          :disabled="isButtonDisabled"
          >{{
            countdown > 0 ? `请等待 ${countdown} 秒` : buttonText
          }}</van-button
        >
      </van-col>
      <van-col span="2"></van-col>
    </van-row>

    <!-- 输入姓名 -->
    <van-popup
      closeable
      v-model:show="showUserInput"
      position="bottom"
      :style="{ height: '35%' }"
      round
    >
      <div style="font-size: 18px; font-weight: 700; margin: 1rem">
        录入昵称
      </div>
      <van-cell-group inset>
        <van-field
          v-model="valueUsername"
          label="姓名"
          placeholder="录入姓名"
        />
        <van-button @click="gotoComplete" size="large" type="success">
          完成
        </van-button>
      </van-cell-group>
    </van-popup>

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
      </van-cell-group>
    </van-popup>

    <!-- 半程动画 -->
    <div
      v-if="showAnimation"
      class="animated-item"
      :style="animationStyle"
    ></div>
    <welcome ref="welcomeRef" />
    <half ref="halfRef" />
    <review ref="reviewRef" />
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

