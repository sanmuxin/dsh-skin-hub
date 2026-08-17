window.__ModuleLoader__.load({
	id: "dsh-skin-manager",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		var React = require("react");
		var react_jsx_runtime = require("react/jsx-runtime");

		//#region constants
		/** Dictionary namespace owned by this plugin. */
		var NS = "skin.manager";
		/** Host API prefix (same origin). */
		var API = "/plugins/dsh-skin-manager";
		/** Persisted active skin (runtime exclusivity), per browser. */
		var ACTIVE_KEY = "dsh-skin-manager.active";
		/** Runtime adapters: how each known skin turns on/off in the live page. */
		var ADAPTERS = {
			"dsh-client-liang-intensity-skin": {
				isActive: function () {
					return localStorage.getItem("dsh-liang-intensity-skin.enabled") !== "0";
				},
				activate: function () {
					localStorage.setItem("dsh-liang-intensity-skin.enabled", "1");
					window.dispatchEvent(new StorageEvent("storage", {
						key: "dsh-liang-intensity-skin.enabled",
						newValue: "1",
						storageArea: localStorage,
					}));
				},
				deactivate: function () {
					localStorage.setItem("dsh-liang-intensity-skin.enabled", "0");
					window.dispatchEvent(new StorageEvent("storage", {
						key: "dsh-liang-intensity-skin.enabled",
						newValue: "0",
						storageArea: localStorage,
					}));
				},
			},
			"@lengduan/dsh-client-ui-skin-815": {
				// 815 皮肤由 body[data-dsh-815] 属性驱动(整份主 CSS 以它为前缀,
				// 配色/背景/文字都在里面),外加 apply 时注入的带
				// data-skin-owner="815" 标记的 DOM 元素(侧栏《终战诏书》plaque、
				// 标题栏品牌、favicon、caption 等)。
				// 停用时移除属性并还原内联样式;注入元素由管理器注入的隐藏规则
				// 接管——body 无 data-dsh-815 时统一 display:none,激活时自动恢复。
				// widthSheet:815 插件注入的 style 里第一条是无条件全局规则
				// `html, body { --vj-sidebar-width: 280px; --vj-titlebar-height: 0px }`,
				// 会把标题栏压成 0 高导致文字重叠,而且与当前 Harness 布局冲突。
				// 管理器在 815 激活和停用两种状态下都禁用这张 sheet,让标题栏
				// 始终正常;815 的视觉样式不依赖它,只依赖 data-dsh-815 前缀的
				// 主 CSS,所以外观不受影响。
				WIDTH_SHEET_SELECTOR: '[data-skin-chrome="sidebar-width-rule"]',
				isActive: function () {
					return document.body.hasAttribute("data-dsh-815");
				},
				disableWidthSheet: function () {
					var sheet = document.querySelector(this.WIDTH_SHEET_SELECTOR);
					if (sheet !== null && sheet.sheet !== null) sheet.sheet.disabled = true;
				},
				activate: function () {
					var body = document.body;
					body.setAttribute("data-dsh-815", "");
					var preview = API + "/preview?bundle=" + encodeURIComponent("@lengduan/dsh-client-ui-skin-815");
					body.style.setProperty("background-image", "url(" + preview + ")");
					body.style.setProperty("background-position", "center 42%");
					body.style.setProperty("background-size", "cover");
					body.style.setProperty("background-attachment", "fixed");
					body.style.setProperty("background-repeat", "no-repeat");
					body.style.setProperty("background-color", "#080a06");
					this.disableWidthSheet();
				},
				deactivate: function () {
					var body = document.body;
					body.removeAttribute("data-dsh-815");
					var props = [
						"background-image", "background-position", "background-size",
						"background-attachment", "background-repeat", "background-color",
						"--vj-photo", "--vj-rescript",
					];
					for (var i = 0; i < props.length; i += 1) body.style.removeProperty(props[i]);
					this.disableWidthSheet();
				},
			},
		};
		/** True when the skin package has a runtime adapter. */
		function hasAdapter(item) {
			return Object.prototype.hasOwnProperty.call(ADAPTERS, item.package);
		}
		/** Live active state of a skin (runtime adapters first, else assembly). */
		function liveState(item) {
			var adapter = ADAPTERS[item.package];
			if (adapter !== void 0) return adapter.isActive();
			return item.enabled;
		}
		/** Mutually activate one skin and deactivate every other runtime skin. */
		function activateExclusive(targetPackage, list) {
			for (var i = 0; i < list.length; i += 1) {
				var item = list[i];
				var adapter = ADAPTERS[item.package];
				if (adapter === void 0) continue;
				if (item.package === targetPackage) adapter.activate();
				else adapter.deactivate();
			}
			localStorage.setItem(ACTIVE_KEY, targetPackage);
		}
		/** Deactivate every runtime skin (back to the stock look). */
		function deactivateAll(list) {
			for (var i = 0; i < list.length; i += 1) {
				var item = list[i];
				var adapter = ADAPTERS[item.package];
				if (adapter === void 0) continue;
				adapter.deactivate();
			}
			localStorage.removeItem(ACTIVE_KEY);
		}
		//#endregion

		//#region styles
		var css = `
.skin-manager-section{width:100%;max-width:760px;color:var(--dsw-alias-label-primary);flex-direction:column;gap:14px;display:flex}
.skin-manager-hint{color:var(--dsw-alias-label-tertiary);font-size:13px;line-height:20px;margin:0}
.skin-manager-grid{grid-template-columns:repeat(2,minmax(0,1fr));align-items:start;gap:12px;margin:0;padding:0;list-style:none;display:grid}
.skin-manager-card{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);border-radius:10px;min-width:0;overflow:hidden;flex-direction:column;display:flex}
.skin-manager-preview{background:var(--dsw-alias-bg-layer-1);aspect-ratio:16/9;flex:0 0 auto;overflow:hidden;display:flex}
.skin-manager-preview img{width:100%;height:100%;object-fit:cover;display:block}
.skin-manager-preview-placeholder{width:100%;height:100%;align-items:center;justify-content:center;color:var(--dsw-alias-label-tertiary);font-size:12px;display:flex}
.skin-manager-body{flex-direction:column;gap:8px;padding:12px 14px 14px;display:flex}
.skin-manager-title{justify-content:space-between;align-items:flex-start;gap:8px;display:flex}
.skin-manager-title h3{color:var(--dsw-alias-label-primary);margin:0;font-size:14px;font-weight:600;line-height:20px;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.skin-manager-badge{color:var(--dsw-alias-label-secondary);border:1px solid var(--dsw-alias-border-l2);border-radius:999px;flex:0 0 auto;padding:1px 8px;font-size:11px;line-height:16px;white-space:nowrap}
.skin-manager-badge[data-on=true]{border-color:var(--dsw-alias-state-business-primary);color:var(--dsw-alias-state-business-primary)}
.skin-manager-meta{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}
.skin-manager-desc{color:var(--dsw-alias-label-secondary);margin:0;font-size:13px;line-height:20px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.skin-manager-tags{flex-wrap:wrap;gap:4px;display:flex}
.skin-manager-tag{color:var(--dsw-alias-label-tertiary);border:1px solid var(--dsw-alias-border-l1);border-radius:4px;padding:1px 6px;font-size:11px;line-height:16px}
.skin-manager-actions{justify-content:flex-end;gap:8px;display:flex}
.skin-manager-btn{border:1px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-primary);font:inherit;font-size:13px;line-height:20px;cursor:pointer;background:transparent;border-radius:6px;padding:4px 12px}
.skin-manager-btn:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}
.skin-manager-btn[data-primary=true]{border-color:var(--dsw-alias-state-business-primary);color:var(--dsw-alias-state-business-primary)}
.skin-manager-btn:disabled{cursor:progress;opacity:.6}
.skin-manager-notice{color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px;padding:8px 10px;border:1px solid var(--dsw-alias-border-l1);border-radius:6px}
.skin-manager-error{color:var(--dsw-alias-state-error-primary);font-size:13px;line-height:20px;align-items:center;gap:10px;display:flex}
.skin-manager-error button{border:1px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-primary);font:inherit;cursor:pointer;background:transparent;border-radius:6px;padding:4px 10px}
@media (max-width:640px){.skin-manager-grid{grid-template-columns:1fr}}
/* 815 皮肤停用时,隐藏它注入的所有带 data-skin-owner 标记的元素
   (侧栏《终战诏书》plaque、标题栏品牌、favicon、caption 等)。
   815 激活时 body[data-dsh-815] 存在,规则失效,元素自动恢复。 */
body:not([data-dsh-815]) [data-skin-owner="815"]{display:none !important}
/* 815 皮肤停用时,隐藏它注入的所有带 data-skin-owner 标记的元素
   (侧栏《终战诏书》plaque、标题栏品牌、favicon、caption 等)。
   815 激活时 body[data-dsh-815] 存在,规则失效,元素自动恢复。 */
body:not([data-dsh-815]) [data-skin-owner="815"]{display:none !important}
/* liang 皮肤停用时隐藏其全屏 backdrop(双保险;liang 插件本身会移除) */
body:not([data-liang-skin="on"]) .liang-skin-backdrop{display:none !important}
`;
		//#endregion

		//#region dicts
		var zh = {
			nav: "皮肤管理",
			hint: "已安装的 DeepSeek Harness 皮肤。点「使用」立即互斥启用一个皮肤(其余即时关闭,无需重启);「设为默认」写入 profile,重启后作为默认生效;「恢复默认」关闭全部皮肤。",
			loading: "正在读取皮肤…",
			error: "皮肤列表暂时不可用。",
			retry: "重试",
			empty: "尚未安装皮肤 bundle。",
			active: "使用中",
			inactive: "未使用",
			use: "使用",
			useHint: "立即启用此皮肤并关闭其他皮肤(无需重启)",
			defaultBtn: "设为默认",
			defaultHint: "写入 profile 配置,重启 dsh web 后作为默认生效",
			reset: "恢复默认",
			resetHint: "关闭全部皮肤,回到原始界面(无需重启)",
			saved: "已更新默认配置,重启 dsh web 后生效",
			runtimeApplied: "已切换到该皮肤",
			resetApplied: "已恢复默认外观",
			version: "v",
		};
		var en = {
			nav: "Skins",
			hint: "Installed DeepSeek Harness skins. “Use” activates one skin and turns the others off immediately (no restart); “Set default” writes the profile patch (applies after restart); “Reset” turns all skins off.",
			loading: "Reading skins…",
			error: "Skin list is temporarily unavailable.",
			retry: "Retry",
			empty: "No skin bundles installed.",
			active: "Active",
			inactive: "Off",
			use: "Use",
			useHint: "activate this skin now and turn off the others (no restart)",
			defaultBtn: "Set default",
			defaultHint: "writes the profile patch; becomes default after restarting dsh web",
			reset: "Reset",
			resetHint: "turn all skins off and return to the stock look (no restart)",
			saved: "Default config updated — restart dsh web to apply",
			runtimeApplied: "Switched to this skin",
			resetApplied: "Restored default look",
			version: "v",
		};
		//#endregion

		//#region components
		/** Live bound dictionary; assigned in apply() and shared by components. */
		var t = zh;
		function SkinCard(props) {
			var skin = props.skin;
			var onUse = props.onUse;
			var onDefault = props.onDefault;
			var busy = props.busy;
			var hasRuntime = hasAdapter(skin);
			var active = liveState(skin);
			var title = skin.name + (skin.version ? " · " + t("version") + skin.version : "");
			var preview = skin.preview === null
				? React.createElement("div", { className: "skin-manager-preview-placeholder" }, skin.accent ?? skin.name)
				: React.createElement("img", { src: skin.preview, alt: skin.name, loading: "lazy" });
			return React.createElement("li", { className: "skin-manager-card", "data-plugin": "dsh-skin-manager" },
				React.createElement("div", { className: "skin-manager-preview" }, preview),
				React.createElement("div", { className: "skin-manager-body" },
					React.createElement("div", { className: "skin-manager-title" },
						React.createElement("h3", { title: title }, skin.name),
						React.createElement("span", { className: "skin-manager-badge", "data-on": active }, active ? t("active") : t("inactive")),
					),
					React.createElement("div", { className: "skin-manager-meta" },
						[skin.author, skin.package].filter(Boolean).join(" · "),
					),
					skin.description !== null && React.createElement("p", { className: "skin-manager-desc" }, skin.description),
					skin.tags.length > 0 && React.createElement("div", { className: "skin-manager-tags" },
						skin.tags.map(function (tag) {
							return React.createElement("span", { key: tag, className: "skin-manager-tag" }, tag);
						}),
					),
					React.createElement("div", { className: "skin-manager-actions" },
						hasRuntime && React.createElement("button", {
							type: "button",
							className: "skin-manager-btn",
							"data-primary": !active,
							disabled: busy,
							title: t("useHint"),
							onClick: function () { onUse(skin); },
						}, t("use")),
						React.createElement("button", {
							type: "button",
							className: "skin-manager-btn",
							disabled: busy,
							title: t("defaultHint"),
							onClick: function () { onDefault(skin); },
						}, t("defaultBtn")),
					),
				),
			);
		}

		function SkinManagerSection(props) {
			var state = React.useState({ status: "loading", skins: [], notice: null, busy: null, version: 0 });
			var status = state[0].status;
			var skins = state[0].skins;
			var notice = state[0].notice;
			var busy = state[0].busy;
			var version = state[0].version;
			var setState = state[1];
			var bump = function (patch) {
				setState(function (prev) { return { ...prev, ...patch, version: prev.version + 1 }; });
			};
			var load = function () {
				bump({ status: "loading", notice: null });
				fetch(API + "/api/skins", { headers: { Accept: "application/json" } })
					.then(function (res) {
						if (!res.ok) throw new Error("http " + res.status);
						return res.json();
					})
					.then(function (data) {
						bump({ status: "ready", skins: data.skins, notice: null });
					})
					.catch(function () {
						bump({ status: "error", skins: [], notice: null });
					});
			};
			React.useEffect(function () { load(); }, []);
			var use = function (skin) {
				try {
					activateExclusive(skin.package, skins);
					bump({ notice: t("runtimeApplied"), busy: null });
				} catch (error) {
					bump({ notice: String(error), busy: null });
				}
			};
			var setDefault = function (skin) {
				bump({ busy: skin.rowId });
				fetch(API + "/api/toggle", {
					method: "POST",
					headers: { "Content-Type": "application/json", Accept: "application/json" },
					body: JSON.stringify({ rowId: skin.rowId, enabled: true }),
				})
					.then(function (res) { return res.json(); })
					.then(function (data) {
						if (!data.ok) throw new Error(data.error ?? "failed");
						bump({ notice: t("saved"), busy: null });
					})
					.catch(function () {
						bump({ notice: t("error"), busy: null });
					});
			};
			var reset = function () {
				try {
					deactivateAll(skins);
					bump({ notice: t("resetApplied"), busy: null });
				} catch (error) {
					bump({ notice: String(error), busy: null });
				}
			};
			var content;
			if (status === "loading") content = React.createElement("p", { className: "skin-manager-hint" }, t("loading"));
			else if (status === "error") content = React.createElement("div", { className: "skin-manager-error" },
				React.createElement("span", null, t("error")),
				React.createElement("button", { type: "button", onClick: load }, t("retry")),
			);
			else if (skins.length === 0) content = React.createElement("p", { className: "skin-manager-hint" }, t("empty"));
			else content = React.createElement("ul", { className: "skin-manager-grid" },
				skins.map(function (skin) {
					return React.createElement(SkinCard, {
						key: skin.rowId,
						skin: skin,
						busy: busy === skin.rowId,
						onUse: use,
						onDefault: function (item) { setDefault(item); },
					});
				}),
			);
			return React.createElement("div", { className: "skin-manager-section" },
				React.createElement("p", { className: "skin-manager-hint" }, t("hint")),
				notice !== null && React.createElement("p", { className: "skin-manager-notice" }, notice),
				content,
				React.createElement("div", { className: "skin-manager-actions" },
					React.createElement("button", {
						type: "button",
						className: "skin-manager-btn",
						disabled: busy !== null || skins.length === 0,
						title: t("resetHint"),
						onClick: reset,
					}, t("reset")),
				),
			);
		}
		//#endregion

		//#region apply
		/** Services required by this client plugin. */
		var inject = ["slots", "locale"];

		/** Client plugin body: register the skins settings section. */
		function apply(ctx) {
			ctx.effect(function () {
				return ctx.locale.register(NS, { zh: zh, en: en });
			}, "dsh-skin-manager: dictionaries");
			t = ctx.locale.bind(NS);
			var style = document.createElement("style");
			style.dataset.plugin = "dsh-skin-manager";
			style.textContent = css;
			document.head.append(style);
			ctx.effect(function () {
				return function () { style.remove(); };
			}, "dsh-skin-manager: scoped styles");
			// On load, apply the persisted exclusive preference once the page
			// (and all skin plugins) has settled. Also, unconditionally disable
			// the 815 skin's widthSheet: its global `--vj-titlebar-height: 0px`
			// rule breaks the titlebar layout (text overlap) regardless of which
			// skin is active, and the 815 look does not depend on that sheet.
			window.setTimeout(function () {
				var adapter = ADAPTERS["@lengduan/dsh-client-ui-skin-815"];
				if (adapter !== void 0) adapter.disableWidthSheet();
				var saved = localStorage.getItem(ACTIVE_KEY);
				if (saved !== null && saved !== "" && Object.prototype.hasOwnProperty.call(ADAPTERS, saved)) {
					var list = [];
					for (var packageName in ADAPTERS) list.push({ package: packageName });
					activateExclusive(saved, list);
				}
			}, 600);
			ctx.slots.inject("settings.section", function () {
				return ctx.slots.register({
					name: "settings.section",
					id: "skins",
					order: 60,
					label: function () { return t("nav"); },
					locale: NS,
				}, SkinManagerSection);
			});
		}
		//#endregion

		exports.inject = inject;
		exports.apply = apply;
		return module.exports;
	}
});
