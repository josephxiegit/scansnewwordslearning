import axios from 'axios';
import global_ from '../components/Global.vue';

// 设置axios的默认基本URL
axios.defaults.baseURL = global_.BASE_URL;

// 创建一个插件来添加axios到Vue实例中
export default {
  install(app) {
    app.config.globalProperties.$ajax = axios; // Vue 3中使用app.config.globalProperties代替Vue.prototype
    app.config.globalProperties.$GLOBAL = global_; // 同样地，添加全局变量
  },
};
