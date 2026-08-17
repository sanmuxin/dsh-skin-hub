//#region lib/index.js — dsh-skin-manager host half
/**
 * @module dsh-skin-manager
 *
 * DeepSeek Harness Web 皮肤管理器 host 半边:扫描 profile 中已安装的皮肤
 * bundle,读取元数据(skin.json / package.json / 预览图),并提供 HTTP API 让
 * client 端浏览与切换皮肤。
 *
 * 切换皮肤 = 编辑 profile 的 cordis.patch.yml(最后覆盖层):给目标皮肤的
 * client 插件行加 `disabled: true` 停用,移除则启用。装配在 dsh web 启动时
 * 完成,因此 UI 需要提示"重启后生效"。
 */
import { readFile, writeFile, stat } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, dirname, basename, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";

/** Stable Cordis plugin name (host row id in cordis.patch.yml). */
const name = "dsh-skin-manager";
/** Services required before this host plugin can mount. */
const inject = ["webServer"];
/** HTTP prefix this plugin owns under the web server. */
const PREFIX = "/plugins/dsh-skin-manager";
/** Path to this bundle's own profile node_modules, used to locate the profile. */
const SELF_DIR = dirname(fileURLToPath(import.meta.url));

/**
 * Resolve the web profile directory.
 *
 * Precedence: $DSH_SKIN_MANAGER_PROFILE (explicit), then $DSH_HOME/profiles/web,
 * then the default home `~/.dsh/profiles/web` — mirroring @deepseek-ai/dsh-home-paths
 * (a blank $DSH_HOME is treated as unset). The bundle-location fallback only
 * applies to a real (non-link) install; a `link:` dev install resolves the
 * bundle to its checkout, so never trust that path first.
 */
function resolveProfileDir() {
	const profileName = process.env.DSH_SKIN_MANAGER_PROFILE?.trim() || "web";
	const envHome = process.env.DSH_HOME;
	const home = envHome !== void 0 && envHome.trim() !== "" ? envHome : join(homedir(), ".dsh");
	const candidate = join(home, "profiles", profileName);
	if (existsSync(candidate)) return candidate;
	// Last resort: a real install sits at <profile>/node_modules/<bundle>/, so
	// walking up three segments lands on the profile root.
	const fallback = resolve(SELF_DIR, "../../..");
	if (basename(fallback) === profileName && existsSync(join(fallback, "package.json"))) return fallback;
	throw new Error(`${name}: unable to locate the web profile directory (tried ${candidate} and ${fallback})`);
}

/** Read a JSON file; returns null when missing or unparsable. */
async function readJson(file) {
	try {
		return JSON.parse(await readFile(file, "utf8"));
	} catch {
		return null;
	}
}

/** Read a text file; returns null when missing. */
async function readText(file) {
	try {
		return await readFile(file, "utf8");
	} catch {
		return null;
	}
}

/** Extract the first insert row id from a bundle's cordis.patch.yml. */
function insertRowId(patchText) {
	if (patchText === null) return null;
	try {
		const doc = YAML.parseDocument(patchText);
		const seq = doc.contents;
		if (seq === null || seq.items === void 0) return null;
		for (const entry of seq.items) {
			if (entry === null || entry.items === void 0) continue;
			const insert = entry.get("insert");
			// yaml nodes are YAMLSeq (not JS arrays): read through .items.
			if (insert !== null && typeof insert === "object" && Array.isArray(insert.items) && insert.items.length > 0) {
				const first = insert.items[0];
				if (first !== null && typeof first === "object" && typeof first.get === "function") {
					const id = first.get("id");
					if (typeof id === "string") return id;
				}
			}
		}
	} catch {
		/* malformed patch is not a skin metadata error */
	}
	return null;
}

/** Read the skin.json of a bundle (may be absent for skins without manifest). */
async function readSkinManifest(pkgDir) {
	return readJson(join(pkgDir, "skin.json"));
}

/** Locate a preview image inside a skin bundle. */
async function findPreview(pkgDir) {
	const candidates = [
		join(pkgDir, "docs", "preview.png"),
		join(pkgDir, "assets", "liang-poster.png"),
		join(pkgDir, "preview.png"),
	];
	for (const candidate of candidates) {
		try {
			const info = await stat(candidate);
			if (info.isFile()) return candidate;
		} catch {
			/* try next */
		}
	}
	return null;
}

/** Whether a bundle looks like a skin (manifest present, or name/description hints). */
function looksLikeSkin(pkgMeta, hasManifest) {
	if (hasManifest) return true;
	const nameField = typeof pkgMeta?.name === "string" ? pkgMeta.name : "";
	const description = typeof pkgMeta?.description === "string" ? pkgMeta.description : "";
	return /skin/i.test(nameField) || /skin/i.test(description);
}

/**
 * Scan the profile for installed skin bundles and build their metadata.
 * @param profileDir - the web profile directory.
 * @returns list of skin descriptors.
 */
async function scanSkins(profileDir) {
	const profilePkg = await readJson(join(profileDir, "package.json"));
	const bundles = profilePkg?.dsh?.profile?.bundles ?? [];
	const nodeModules = join(profileDir, "node_modules");
	const skins = [];
	for (const bundle of bundles) {
		// Official platform bundles are never skins; nor is the manager itself.
		if (typeof bundle !== "string") continue;
		if (bundle === "@deepseek-ai/dsh-base" || bundle === "@deepseek-ai/dsh-web-app") continue;
		if (bundle === "dsh-skin-manager") continue;
		const pkgDir = join(nodeModules, ...bundle.split("/"));
		const pkgMeta = await readJson(join(pkgDir, "package.json"));
		if (pkgMeta === null) continue;
		const manifest = await readSkinManifest(pkgDir);
		if (!looksLikeSkin(pkgMeta, manifest !== null)) continue;
		const patchText = await readText(join(pkgDir, "cordis.patch.yml"));
		const rowId = manifest?.wiring?.id ?? insertRowId(patchText) ?? bundle;
		const preview = await findPreview(pkgDir);
		skins.push({
			id: manifest?.id ?? bundle,
			rowId,
			package: bundle,
			version: typeof pkgMeta.version === "string" ? pkgMeta.version : null,
			name: manifest?.name ?? pkgMeta.name ?? bundle,
			nameEn: manifest?.nameEn ?? null,
			author: manifest?.author ?? null,
			tagline: manifest?.tagline ?? null,
			description: manifest?.description ?? pkgMeta.description ?? null,
			tags: Array.isArray(manifest?.tags) ? manifest.tags : [],
			accent: manifest?.accent ?? null,
			order: typeof manifest?.order === "number" ? manifest.order : 100,
			preview: preview === null ? null : `${PREFIX}/preview?bundle=${encodeURIComponent(bundle)}`,
		});
	}
	skins.sort((a, b) => (a.order ?? 100) - (b.order ?? 100));
	return skins;
}

/** Parse the profile patch text into a document plus the top-level sequence. */
function parsePatch(text) {
	const doc = YAML.parseDocument(text);
	const seq = doc.contents;
	if (seq === null || seq.items === void 0) throw new Error(`${name}: profile cordis.patch.yml has no top-level sequence`);
	return { doc, seq };
}

/** Read current disabled state of every row id in the profile patch. */
function readDisabledRows(profileDir) {
	const patchPath = join(profileDir, "cordis.patch.yml");
	const text = existsSync(patchPath) ? readFileSync(patchPath, "utf8") : "[]";
	if (text.trim() === "" ) return new Set();
	const { seq } = parsePatch(text);
	const disabled = new Set();
	for (const entry of seq.items) {
		if (entry === null || entry.items === void 0) continue;
		const id = entry.get("id");
		if (typeof id !== "string") continue;
		if (entry.get("disabled") === true) disabled.add(id);
	}
	return disabled;
}

/**
 * Set a patch row's disabled state in the profile's cordis.patch.yml.
 * Preserves comments, other rows, and !!js expressions via yaml round-trip.
 * @returns the new disabled state of the row.
 */
async function setRowDisabled(profileDir, rowId, disabled) {
	const patchPath = join(profileDir, "cordis.patch.yml");
	const text = existsSync(patchPath) ? await readFile(patchPath, "utf8") : "[]";
	const { doc, seq } = parsePatch(text === "" ? "[]" : text);
	let entry = null;
	for (const candidate of seq.items) {
		if (candidate !== null && candidate.items !== void 0 && candidate.get("id") === rowId) {
			entry = candidate;
			break;
		}
	}
	if (disabled) {
		if (entry === null) {
			const created = doc.createNode({ id: rowId, disabled: true });
			seq.items.push(created);
		} else {
			entry.set("disabled", true);
		}
	} else if (entry !== null) {
		if (entry.has("disabled")) entry.delete("disabled");
		// Drop a row that now only carries its id (a pure enable override).
		if (entry.items.length === 1 && entry.has("id")) {
			const index = seq.items.indexOf(entry);
			if (index !== -1) seq.items.splice(index, 1);
		}
	}
	await writeFile(patchPath, doc.toString(), "utf8");
	return disabled;
}

/** JSON helper for responses. */
function sendJson(res, status, payload) {
	const body = JSON.stringify(payload);
	res.writeHead(status, {
		"Content-Type": "application/json; charset=utf-8",
		"Content-Length": Buffer.byteLength(body),
	});
	res.end(body);
}

/** MIME type for a preview file. */
function mimeFor(file) {
	switch (extname(file).toLowerCase()) {
		case ".png": return "image/png";
		case ".jpg":
		case ".jpeg": return "image/jpeg";
		case ".webp": return "image/webp";
		case ".gif": return "image/gif";
		default: return "application/octet-stream";
	}
}

/** Serve a preview image from a skin bundle path. */
async function servePreview(res, profileDir, encodedBundle) {
	let bundle;
	try {
		bundle = decodeURIComponent(encodedBundle);
	} catch {
		sendJson(res, 400, { ok: false, error: "bad bundle name" });
		return;
	}
	// Scoped package names legitimately contain a single "/" (scope/name).
	// Reject only path traversal or absolute paths.
	const segments = bundle.split("/");
	if (segments.length > 2 || segments.some((segment) => segment === "" || segment === "." || segment === "..") || bundle.includes("\\")) {
		sendJson(res, 400, { ok: false, error: "bad bundle name" });
		return;
	}
	const pkgDir = join(profileDir, "node_modules", ...segments);
	const preview = await findPreview(pkgDir);
	if (preview === null) {
		sendJson(res, 404, { ok: false, error: "no preview" });
		return;
	}
	const data = await readFile(preview);
	res.writeHead(200, {
		"Content-Type": mimeFor(preview),
		"Content-Length": data.length,
		"Cache-Control": "public, max-age=300",
	});
	res.end(data);
}

/** The web-server request dispatcher. */
function createHandler(profileDir) {
	return async (req, res) => {
		let url;
		try {
			url = new URL(req.url ?? "/", "http://dsh.local");
		} catch {
			sendJson(res, 400, { ok: false, error: "bad url" });
			return;
		}
		const pathname = url.pathname;
		// GET /plugins/dsh-skin-manager/api/skins
		if (pathname === `${PREFIX}/api/skins` && (req.method === "GET" || req.method === "HEAD")) {
			try {
				const skins = await scanSkins(profileDir);
				const disabled = readDisabledRows(profileDir);
				const payload = skins.map((skin) => ({
					...skin,
					enabled: !disabled.has(skin.rowId),
				}));
				if (req.method === "HEAD") {
					res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
					res.end();
					return;
				}
				sendJson(res, 200, { ok: true, skins: payload });
			} catch (error) {
				sendJson(res, 500, { ok: false, error: error instanceof Error ? error.message : String(error) });
			}
			return;
		}
		// POST /plugins/dsh-skin-manager/api/toggle  { rowId, enabled }
		// Assembly-level enable/disable of ONE skin row. This is intentionally
		// NOT exclusive: disabling a skin removes its client bundle from the next
		// boot, so it could never be switched to at runtime. Runtime exclusivity
		// lives in the browser (client adapters); this endpoint only marks the
		// patch default and is meant for "install/uninstall-like" management.
		if (pathname === `${PREFIX}/api/toggle` && req.method === "POST") {
			let body = "";
			for await (const chunk of req) body += chunk;
			let parsed;
			try {
				parsed = JSON.parse(body === "" ? "{}" : body);
			} catch {
				sendJson(res, 400, { ok: false, error: "bad json body" });
				return;
			}
			const rowId = typeof parsed.rowId === "string" ? parsed.rowId : null;
			const enabled = parsed.enabled === true;
			if (rowId === null || rowId === "") {
				sendJson(res, 400, { ok: false, error: "rowId required" });
				return;
			}
			try {
				await setRowDisabled(profileDir, rowId, !enabled);
				sendJson(res, 200, {
					ok: true,
					rowId,
					enabled,
					restartRequired: true,
				});
			} catch (error) {
				sendJson(res, 500, { ok: false, error: error instanceof Error ? error.message : String(error) });
			}
			return;
		}
		// GET /plugins/dsh-skin-manager/preview?bundle=<bundle>
		if (pathname === `${PREFIX}/preview` && (req.method === "GET" || req.method === "HEAD")) {
			const bundle = url.searchParams.get("bundle");
			if (bundle === null || bundle === "") {
				sendJson(res, 400, { ok: false, error: "bundle query required" });
				return;
			}
			try {
				await servePreview(res, profileDir, bundle);
			} catch (error) {
				sendJson(res, 500, { ok: false, error: error instanceof Error ? error.message : String(error) });
			}
			return;
		}
		sendJson(res, 404, { ok: false, error: "not found" });
	};
}

/** Host plugin apply: register the skin-management API routes. */
function apply(ctx) {
	// Lazily resolve the profile on first request so a missing directory never
	// fails the whole plugin tree at boot (which would take dsh web down).
	const resolveProfile = () => {
		let cached;
		let error;
		return () => {
			if (cached !== void 0) return cached;
			if (error !== void 0) throw error;
			try {
				cached = resolveProfileDir();
				return cached;
			} catch (err) {
				error = err;
				throw error;
			}
		};
	};
	const getProfileDir = resolveProfile();
	const mount = () => {
		const disposers = [];
		const routes = [
			{ kind: "exact", path: `${PREFIX}/api/skins` },
			{ kind: "exact", path: `${PREFIX}/api/toggle` },
			{ kind: "exact", path: `${PREFIX}/preview` },
		];
		for (const route of routes) {
			disposers.push(ctx.webServer.register({
				kind: route.kind,
				path: route.path,
				handler: async (req, res) => {
					let profileDir;
					try {
						profileDir = getProfileDir();
					} catch (error) {
						sendJson(res, 503, {
							ok: false,
							error: error instanceof Error ? error.message : String(error),
						});
						return;
					}
					try {
						await createHandler(profileDir)(req, res);
					} catch (error) {
						sendJson(res, 500, {
							ok: false,
							error: error instanceof Error ? error.message : String(error),
						});
					}
				},
			}));
		}
		return () => {
			for (const dispose of disposers) dispose();
		};
	};
	ctx.effect(mount, `${name}: skin manager API`);
}

export { apply, inject, name };
/** Test hook: internal functions for standalone verification. */
export const internals = { scanSkins, readDisabledRows, setRowDisabled, resolveProfileDir, parsePatch };
//#endregion
