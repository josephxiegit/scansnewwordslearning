
import { createApp, reactive, provide, ref } from 'vue'
import App from './App.vue'
import { createRouter, createWebHistory } from 'vue-router';
import axiosPlugin from './plugins/axios';
import Homepage from './components/homepage.vue';
import HomepageFollow from './components/homepageFollow.vue';
import Complete from './components/complete.vue';
import StudentAccountData from './components/studentAccountData.vue';
import StudentAccountItems from './components/studentAccountItems.vue';
import Xlsms from './components/xlsms.vue';
import MachineCode from './components/machineCode.vue';
import MachineCodeQRCode from './components/MachineCodeQRCode.vue';

import 'vant/lib/index.css';
import Global from "./components/Global.vue";


// 定义你的路由配置
const routes = [
    {
        path: '/',
        redirect: '/homepage'
    },
    {
        path: '/homepage',
        name: 'homepage',
        component: Homepage,
    },
    {
        path: '/homepageFollow',
        name: 'homepageFollow',
        component: HomepageFollow,
    },
    {
        path: '/complete',
        name: 'complete',
        component: Complete,
    },
    {
        path: '/machineCode',
        name: 'machineCode',
        component: MachineCode,
    },
    {
        path: '/studentAccountData',
        name: 'studentAccountData',
        component: StudentAccountData,
    },
    {
        path: '/studentAccountItems',
        name: 'studentAccountItems',
        component: StudentAccountItems,
    },
    {
        path: '/MachineCodeQRCode',
        name: 'MachineCodeQRCode',
        component: MachineCodeQRCode,
    },
    {
        path: '/xlsms',
        name: 'xlsms',
        component: Xlsms,
    }
];
// 创建router实例
const router = createRouter({
    history: createWebHistory(),
    routes, // 使用路由配置
});

// 设置全局前置守卫
router.beforeEach((to, from, next) => {
    next()
});


import {
    Button, Checkbox, CheckboxGroup, NavBar, Cell, CellGroup, Overlay, Swipe, SwipeItem, Card, Progress, Step, Steps, Divider, ActionSheet,
    Loading, Dialog, Field, Notify, Toast, FloatingBubble, Badge, Circle, Grid, GridItem, Col, Row, ConfigProvider, BackTop, DropdownMenu, DropdownItem,
    Image as VanImage, Popup, Rate, Tabbar, TabbarItem, Picker, Tag, RollingText, RadioGroup, Radio, Space, Sidebar, SidebarItem, NoticeBar, Barrage,
    SwipeCell, Icon, Highlight, FloatingPanel, Sticky, Collapse, CollapseItem, Search, Tab, Tabs, List, Calendar, Switch, CountDown, Stepper, Popover
} from 'vant';
import 'vant/lib/index.css';



// 创建Vue应用实例
const app = createApp(App);

// 主题路径
app.config.globalProperties.$bonnieBearsSrc = Global.BONNIE_BEARS_SRC;

// 使用Vant组件
app.use(Button)
    .use(Checkbox)
    .use(NoticeBar)
    .use(Barrage)
    .use(Popover)
    .use(ActionSheet)
    .use(DropdownMenu)
    .use(DropdownItem)
    .use(BackTop)
    .use(Divider)
    .use(Sidebar)
    .use(SidebarItem)
    .use(Step)
    .use(Steps)
    .use(Stepper)
    .use(CountDown)
    .use(Switch)
    .use(ConfigProvider)
    .use(Progress)
    .use(Card)
    .use(Space)
    .use(Col)
    .use(Row)
    .use(Swipe)
    .use(SwipeItem)
    .use(Grid)
    .use(GridItem)
    .use(List)
    .use(RadioGroup)
    .use(Radio)
    .use(Tab)
    .use(Tabs)
    .use(Circle)
    .use(CheckboxGroup)
    .use(NavBar)
    .use(Cell)
    .use(CellGroup)
    .use(Overlay)
    .use(Loading)
    .use(Dialog)
    .use(Field)
    .use(Notify)
    .use(Toast)
    .use(FloatingBubble)
    .use(VanImage)
    .use(Popup)
    .use(Rate)
    .use(Tabbar)
    .use(TabbarItem)
    .use(Picker)
    .use(SwipeCell)
    .use(Icon)
    .use(FloatingPanel)
    .use(Sticky)
    .use(Highlight)
    .use(Collapse)
    .use(Search)
    .use(Tag)
    .use(Badge)
    .use(RollingText)
    .use(CollapseItem)
    .use(Calendar);
// 使用vue-router
app.use(router);
app.use(axiosPlugin);

// 挂载Vue应用实例
app.mount('#app');
