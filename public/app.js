const form = document.querySelector("#search-form");
const input = document.querySelector("#website-url");
const status = document.querySelector("#status");
const results = document.querySelector("#results");
const submit = form.querySelector("button");

const sourceNames = { manifest: "Web App Manifest", "apple-touch": "Apple Touch Icon", html: "HTML 声明", fallback: "默认路径" };

function proxyUrl(icon, download = false, format = "original") {
  return `/api/icon-file?url=${encodeURIComponent(icon.url)}${download ? "&download=1" : ""}${format !== "original" ? `&format=${format}` : ""}`;
}

function dimensions(icon) {
  if (icon.width && icon.height) return `${icon.width} × ${icon.height}`;
  return icon.declaredSizes?.join(", ") || "未知尺寸";
}

function metadata(icon) {
  return [
    ["来源", sourceNames[icon.source] || icon.source],
    ["尺寸", dimensions(icon)],
    ["格式", (icon.format || "未知").toUpperCase()],
  ];
}

function bindIconActions(container, icon) {
  const image = container.querySelector("img");
  image.src = proxyUrl(icon);
  image.alt = `${dimensions(icon)} 网站图标预览`;
  image.addEventListener("error", () => container.classList.add("unavailable"), { once: true });
  const download = container.querySelector(".download-link");
  download.setAttribute("download", "");
  const formatSelect = container.querySelector(".format-select");
  const updateDownload = () => { download.href = proxyUrl(icon, true, formatSelect.value); };
  formatSelect.addEventListener("change", updateDownload);
  updateDownload();
  download.addEventListener("click", async (event) => {
    event.preventDefault();
    const originalText = download.textContent;
    download.textContent = "正在转换…";
    download.setAttribute("aria-disabled", "true");
    try {
      const response = await fetch(download.href);
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "下载转换失败");
      }
      const blobUrl = URL.createObjectURL(await response.blob());
      const temporaryLink = document.createElement("a");
      temporaryLink.href = blobUrl;
      temporaryLink.download = response.headers.get("content-disposition")?.match(/filename="([^"]+)"/)?.[1] || "website-icon";
      temporaryLink.click();
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      status.classList.add("error");
      status.textContent = error.message;
      status.scrollIntoView({ behavior: "smooth", block: "center" });
    } finally {
      download.textContent = originalText;
      download.removeAttribute("aria-disabled");
    }
  });
  container.querySelector(".copy-button").addEventListener("click", async (event) => {
    await navigator.clipboard.writeText(icon.url);
    const original = event.currentTarget.textContent;
    event.currentTarget.textContent = "已复制";
    setTimeout(() => { event.currentTarget.textContent = original; }, 1400);
  });
}

function renderRecommended(icon) {
  const fragment = document.querySelector("#recommended-template").content.cloneNode(true);
  fragment.querySelector("h3").textContent = dimensions(icon);
  fragment.querySelector(".icon-url").textContent = icon.url;
  const list = fragment.querySelector(".meta-list");
  for (const [term, value] of metadata(icon)) {
    const item = document.createElement("div");
    item.innerHTML = `<dt>${term}</dt><dd></dd>`;
    item.querySelector("dd").textContent = value;
    list.append(item);
  }
  document.querySelector("#recommended").replaceChildren(fragment);
  bindIconActions(document.querySelector("#recommended"), icon);
}

function renderCandidate(icon) {
  const fragment = document.querySelector("#candidate-template").content.cloneNode(true);
  const article = fragment.querySelector(".candidate");
  fragment.querySelector("strong").textContent = dimensions(icon);
  fragment.querySelector(".candidate-top span").textContent = sourceNames[icon.source] || icon.source;
  fragment.querySelector(".icon-url").textContent = icon.url;
  if (!icon.available) article.classList.add("unavailable");
  bindIconActions(article, icon);
  return fragment;
}

function render(data) {
  document.querySelector("#site-title").textContent = data.site.title;
  const siteLink = document.querySelector("#site-link");
  siteLink.href = data.site.url;
  siteLink.textContent = data.site.hostname;
  const recommended = data.icons.find((icon) => icon.id === data.recommendedId) || data.icons[0];
  renderRecommended(recommended);
  const grid = document.querySelector("#candidate-grid");
  grid.replaceChildren(...data.icons.map(renderCandidate));
  document.querySelector("#candidate-count").textContent = `${data.icons.length} 个候选`;
  results.hidden = false;
  results.scrollIntoView({ behavior: "smooth", block: "start" });
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  submit.disabled = true;
  submit.classList.add("loading");
  status.classList.remove("error");
  status.textContent = "正在分析网页和图标声明…";
  results.hidden = true;
  try {
    const response = await fetch(`/api/icons?url=${encodeURIComponent(input.value)}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "获取失败");
    if (!data.icons.length) throw new Error("没有发现可用的网站图标");
    render(data);
    status.textContent = `已找到 ${data.icons.length} 个候选图标`;
  } catch (error) {
    status.classList.add("error");
    status.textContent = error.message;
  } finally {
    submit.disabled = false;
    submit.classList.remove("loading");
  }
});
