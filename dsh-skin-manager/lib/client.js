window.__ModuleLoader__.load({
	id: "dsh-skin-manager",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		var React = require("react");

		//#region constants
		/** Dictionary namespace owned by this plugin. */
		var NS = "skin.manager";
		/** Host API prefix (same origin). */
		var API = "/plugins/dsh-skin-manager";
		/** Skins with a runtime localStorage switch (no restart needed). */
		var RUNTIME_SWITCHES = {
			"dsh-client-liang-intensity-skin": {
				key: "dsh-liang-intensity-skin.enabled",
				on: "1",
				off: "0",
			},
		};
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
`;
		//#endregion

		//#region dicts
		var zh = {
			nav: "皮肤管理",
			hint: "已安装的 DeepSeek Harness 皮肤。启用/停用会写入 profile 配置,重启 dsh web 后生效;支持即时开关的皮肤可立即预览。",
			loading: "正在读取皮肤…",
			error: "皮肤列表暂时不可用。",
			retry: "重试",
			empty: "尚未安装皮肤 bundle。",
			enabled: "启用中",
			disabled: "已停用",
			enable: "启用",
			disable: "停用",
			apply: "立即应用",
			applyHint: "当前会话即时生效,无需重启",
			saved: "已更新配置,重启 dsh web 后生效",
			runtimeApplied: "已应用到当前会话",
			version: "v",
		};
		var en = {
			nav: "Skins",
			hint: "Installed DeepSeek Harness skins. Toggling writes to the profile patch and takes effect after restarting dsh web; skins with a runtime switch can preview immediately.",
			loading: "Reading skins…",
			error: "Skin list is temporarily unavailable.",
			retry: "Retry",
			empty: "No skin bundles installed.",
			enabled: "On",
			disabled: "Off",
			enable: "Enable",
			disable: "Disable",
			apply: "Apply now",
			applyHint: "applies to this session without restart",
			saved: "Config updated — restart dsh web to apply",
			runtimeApplied: "Applied to the current session",
			version: "v",
		};
		//#endregion

		//#region components
		/** Live bound dictionary; assigned in apply() and shared by components. */
		var t = zh;
		function SkinCard(props) {
			var skin = props.skin;
			var onToggle = props.onToggle;
			var onApply = props.onApply;
			var busy = props.busy;
			var switchKey = RUNTIME_SWITCHES[skin.package];
			var enabled = skin.enabled;
			var title = skin.name + (skin.version ? " · " + t("version") + skin.version : "");
			var preview = skin.preview === null
				? React.createElement("div", { className: "skin-manager-preview-placeholder" }, skin.accent ?? skin.name)
				: React.createElement("img", { src: skin.preview, alt: skin.name, loading: "lazy" });
			return React.createElement("li", { className: "skin-manager-card", "data-plugin": "dsh-skin-manager" },
				React.createElement("div", { className: "skin-manager-preview" }, preview),
				React.createElement("div", { className: "skin-manager-body" },
					React.createElement("div", { className: "skin-manager-title" },
						React.createElement("h3", { title: title }, skin.name),
						React.createElement("span", { className: "skin-manager-badge", "data-on": enabled }, enabled ? t("enabled") : t("disabled")),
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
						React.createElement("button", {
							type: "button",
							className: "skin-manager-btn",
							"data-primary": !enabled,
							disabled: busy,
							onClick: function () { onToggle(skin, !enabled); },
						}, enabled ? t("disable") : t("enable")),
						switchKey !== void 0 && React.createElement("button", {
							type: "button",
							className: "skin-manager-btn",
							disabled: busy,
							title: t("applyHint"),
							onClick: function () { onApply(skin, switchKey); },
						}, t("apply")),
					),
				),
			);
		}

		function SkinManagerSection() {
			var state = React.useState({ status: "loading", skins: [], notice: null, busy: null });
			var status = state[0].status;
			var skins = state[0].skins;
			var notice = state[0].notice;
			var busy = state[0].busy;
			var setState = state[1];
			var load = function () {
				setState({ status: "loading", skins: [], notice: null, busy: null });
				fetch(API + "/api/skins", { headers: { Accept: "application/json" } })
					.then(function (res) {
						if (!res.ok) throw new Error("http " + res.status);
						return res.json();
					})
					.then(function (data) {
						setState({ status: "ready", skins: data.skins, notice: null, busy: null });
					})
					.catch(function () {
						setState({ status: "error", skins: [], notice: null, busy: null });
					});
			};
			React.useEffect(function () { load(); }, []);
			var toggle = function (skin, enabled) {
				setState({ status: status, skins: skins, notice: notice, busy: skin.rowId });
				fetch(API + "/api/toggle", {
					method: "POST",
					headers: { "Content-Type": "application/json", Accept: "application/json" },
					body: JSON.stringify({ rowId: skin.rowId, enabled: enabled }),
				})
					.then(function (res) { return res.json(); })
					.then(function (data) {
						if (!data.ok) throw new Error(data.error ?? "failed");
						var next = skins.map(function (item) {
							return item.rowId === skin.rowId ? { ...item, enabled: enabled } : item;
						});
						setState({ status: "ready", skins: next, notice: t("saved"), busy: null });
					})
					.catch(function () {
						setState({ status: "ready", skins: skins, notice: t("error"), busy: null });
					});
			};
			var applyRuntime = function (skin, switchKey) {
				try {
					var on = switchKey.on;
					var off = switchKey.off;
					var value = skin.enabled ? off : on;
					localStorage.setItem(switchKey.key, value);
					window.dispatchEvent(new StorageEvent("storage", {
						key: switchKey.key,
						newValue: value,
						storageArea: localStorage,
					}));
					var next = skins.map(function (item) {
						return item.rowId === skin.rowId ? { ...item, enabled: !skin.enabled } : item;
					});
					setState({ status: "ready", skins: next, notice: t("runtimeApplied"), busy: null });
				} catch (error) {
					setState({ status: "ready", skins: skins, notice: String(error), busy: null });
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
						onToggle: toggle,
						onApply: applyRuntime,
					});
				}),
			);
			return React.createElement("div", { className: "skin-manager-section" },
				React.createElement("p", { className: "skin-manager-hint" }, t("hint")),
				notice !== null && React.createElement("p", { className: "skin-manager-notice" }, notice),
				content,
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
