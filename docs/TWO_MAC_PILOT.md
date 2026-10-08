# Mac mini / MacBook 双机开发

本项目使用已有 Gitee 仓库 `https://gitee.com/joesphxie/scansnewwordslearning`。手机控制 Mac mini 开发时使用 `mini/<任务名>` 分支；MacBook 检查、测试并合并到 `main`。不要用 OneDrive 或 iCloud 同步 Git 工作目录，也不要从 Mac mini 直接部署线上。

完整说明和交接脚本在共享后端仓库的 [手机远程开发流程](https://gitee.com/joesphxie/StudentsRehearsals/blob/main/docs/MAC_MINI_PHONE_WORKFLOW.md)。Mac mini 首次克隆到 `~/Developer/scan-words-learning` 后，在 `~/Developer/StudentsRehearsals` 运行共享脚本。对本项目指定 `scan`，例如：

```sh
./ops/mac_two_mac.sh status scan
./ops/mac_two_mac.sh start fix-scan-flow scan
./ops/mac_two_mac.sh publish fix-scan-flow scan
./ops/mac_two_mac.sh review fix-scan-flow scan
./ops/mac_two_mac.sh merge fix-scan-flow scan
./ops/mac_two_mac.sh push-main scan
./ops/mac_two_mac.sh return scan
```

`status` 只查看状态；`start` 检查干净的 `main`、快进拉取并创建任务分支；任务完成后先运行测试、提交，再 `publish`。MacBook 用 `review` 查看远端差异，确认通过后运行 `merge`、测试，再 `push-main`。最后 Mac mini 用 `return` 回到最新 `main`。

Mac mini 首次克隆后运行 `npm ci` 安装依赖；日常开发前可运行 `npm run dev`，交付前运行 `node --test tests/*.test.mjs` 和 `npm run build`。`dist-2027/` 和 `output/` 是本地构建/检查产物，不纳入 Git。
