# dsh-skin-manager

DeepSeek Harness Web 皮肤管理器 bundle 插件:在设置页浏览已安装皮肤、互斥切换皮肤、设置默认皮肤、恢复默认外观。

## 功能

- **皮肤列表**:扫描 profile 中已安装的皮肤 bundle(带 `skin.json` 或名称/描述含 skin),读取名称、作者、描述、标签、主色、预览图。
- **「使用」——运行时互斥切换(即时生效,无需重启)**:
  - liang 皮肤:写它的 localStorage 开关 + dispatch storage 事件,皮肤插件即时响应;
  - 815 皮肤:切换 `body[data-dsh-815]` 属性 + 还原/恢复内联样式,并禁用/启用它注入的 widthSheet(其无条件全局规则 `--vj-titlebar-height: 0px` 会压扁标题栏导致文字重叠);
  - 隐藏规则:815 停用时,它注入的侧栏 plaque、标题栏品牌等带 `data-skin-owner="815"` 的元素统一隐藏,激活时自动恢复。
- **「设为默认」——装配层(重启生效)**:把该皮肤写入 profile 的 `cordis.patch.yml`,重启 dsh web 后作为默认。**非互斥**:其他皮肤保持可加载,避免运行时切不过去。
- **「恢复默认」**:关闭全部皮肤,回到原始界面。
- **持久偏好**:当前激活皮肤记在浏览器 `localStorage["dsh-skin-manager.active"]`,刷新/重开页面后自动恢复。

## 安装

```bash
# 在插件 checkout 目录
dsh plugin --profile web add ./dsh-skin-manager
# 重启 dsh web 生效
```

## 架构

- `lib/index.js` — host 半边:扫描皮肤 bundle、读取元数据、提供 HTTP API(`/plugins/dsh-skin-manager/api/skins`、`/api/toggle`、`/preview`)、编辑 profile patch。
- `lib/client.js` — client 半边:注册 `settings.section`("皮肤管理"),渲染皮肤卡片,维护运行时互斥(ADAPTERS),调用 host API 设置默认。

## 皮肤元数据约定

皮肤 bundle 可携带 `skin.json`(如 815 皮肤):

```json
{
  "id": "815",
  "name": "一九四五年八月十五日",
  "author": "lengduan",
  "tagline": "…",
  "description": "…",
  "tags": ["history"],
  "accent": "#c4a35a",
  "order": 15,
  "wiring": { "id": "ui-skin-815" }
}
```

无 `skin.json` 的皮肤(如 liang)自动以 bundle 名作为 id,行 id 从包内 `cordis.patch.yml` 的 insert 列表读取。

## 运行时适配器

`lib/client.js` 的 `ADAPTERS` 表声明每个已知皮肤的运行时启停方式(键为 bundle 名):

- `dsh-client-liang-intensity-skin`:写 `localStorage["dsh-liang-intensity-skin.enabled"]` + dispatch storage 事件。
- `@lengduan/dsh-client-ui-skin-815`:切换 `body[data-dsh-815]` + 内联背景样式 + widthSheet 禁用/启用。

未在表中的皮肤仍可列出、可设为默认(装配层),但没有运行时即时切换。
