# dsh-skin-manager

DeepSeek Harness Web 皮肤管理器 bundle 插件:在设置页浏览已安装皮肤、查看预览与元数据、启用/停用/切换皮肤。

## 功能

- **皮肤列表**:扫描 profile 中已安装的皮肤 bundle(带 `skin.json` 或名称/描述含 skin),读取名称、作者、描述、标签、主色、预览图。
- **启用/停用**:写入 profile 的 `cordis.patch.yml`(最后覆盖层),给目标皮肤的 client 插件行加 `disabled: true` 停用、移除则启用。装配在 dsh web 启动时完成,切换后需**重启 dsh web** 生效。
- **即时预览**:对支持运行时开关的皮肤(如 liang 皮肤,走 localStorage),提供"立即应用"按钮,当前会话即时生效、无需重启。
- **设置入口**:设置 → 皮肤管理。

## 安装

```bash
# 在插件 checkout 目录
dsh plugin --profile web add ./dsh-skin-manager
# 重启 dsh web 生效
```

## 架构

- `lib/index.js` — host 半边:扫描皮肤 bundle、读取元数据、提供 HTTP API(`/plugins/dsh-skin-manager/api/skins`、`/api/toggle`、`/preview`),编辑 profile patch。
- `lib/client.js` — client 半边:注册 `settings.section`("皮肤管理"),渲染皮肤卡片,调用 host API 切换。

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

## 运行时开关适配

`lib/client.js` 的 `RUNTIME_SWITCHES` 表声明哪些皮肤支持即时切换(写 localStorage + dispatch storage 事件),键为 bundle 名:

```js
"dsh-client-liang-intensity-skin": {
  key: "dsh-liang-intensity-skin.enabled",
  on: "1", off: "0"
}
```
