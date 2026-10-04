(function () {
  "use strict";

  const DATA_URL = "./actors.json";
  const configuredFaceBase = window.ACTOR_WEB_CONFIG && typeof window.ACTOR_WEB_CONFIG.faceBaseUrl === "string"
    ? window.ACTOR_WEB_CONFIG.faceBaseUrl.replace(/\/+$/, "")
    : "public/assets";
  const FACE_PATHS = {
    dressed: configuredFaceBase + "/faces-dressed/",
    original: configuredFaceBase + "/faces-original/"
  };
  const elements = {
    actorCount: document.getElementById("actor-count"),
    capabilityCount: document.getElementById("capability-count"),
    commentCount: document.getElementById("comment-count"),
    sourceCount: document.getElementById("source-count"),
    loadStatus: document.getElementById("load-status"),
    searchInput: document.getElementById("search-input"),
    searchButton: document.getElementById("search-button"),
    faceMode: document.getElementById("face-mode"),
    actorMode: document.getElementById("actor-mode"),
    supplementaryMode: document.getElementById("supplementary-mode"),
    fixedMode: document.getElementById("fixed-mode"),
    sourceMode: document.getElementById("source-mode"),
    clearFilters: document.getElementById("clear-filters"),
    resultLine: document.getElementById("result-line"),
    actorList: document.getElementById("actor-list"),
    emptyState: document.getElementById("empty-state"),
    errorState: document.getElementById("error-state"),
    errorMessage: document.getElementById("error-message"),
    actorTemplate: document.getElementById("actor-template"),
    scrollTop: document.getElementById("scroll-top"),
    scrollBottom: document.getElementById("scroll-bottom")
  };

  let actors = [];
  let filteredActors = [];
  let appliedQuery = "";
  let actorMode = "collapsed";
  let supplementaryMode = "expanded";
  let fixedMode = "collapsed";
  let faceMode = "dressed";
  let sourceMode = "collapsed";

  function text(value) {
    return value === null || value === undefined ? "" : String(value).trim();
  }

  function list(value) {
    return Array.isArray(value) ? value : [];
  }

  function hasText(value) {
    return text(value).length > 0;
  }

  function normalizeActor(actor) {
    const capabilities = list(actor && actor.capabilities).map(function (capability) {
      return {
        description: text(capability.description_chinese),
        comment: text(capability.comment_chinese),
        sourceRaw: text(capability.source_raw)
      };
    });
    const fixed = actor && actor.fixed_ability ? actor.fixed_ability : {};
    return {
      id: text(actor && actor.actor_id),
      nameChinese: text(actor && actor.name_chinese),
      nameJapanese: text(actor && actor.name_japanese),
      fixed: {
        nameChinese: text(fixed.name_chinese),
        nameJapanese: text(fixed.name_japanese),
        descriptions: list(fixed.descriptions).map(function (item) {
          return {
            order: text(item.ability_order),
            chinese: text(item.description_chinese),
            japanese: text(item.description_japanese)
          };
        })
      },
      capabilities: capabilities
    };
  }

  function hasComment(actor) {
    return actor.capabilities.some(function (capability) { return hasText(capability.comment); });
  }

  function hasSource(actor) {
    return actor.capabilities.some(function (capability) { return hasText(capability.sourceRaw); });
  }

  function searchableText(actor) {
    return [
      actor.id,
      actor.nameChinese,
      actor.nameJapanese,
      actor.fixed.nameChinese,
      actor.fixed.nameJapanese,
      actor.capabilities.map(function (capability) {
        return [capability.description, capability.comment, capability.sourceRaw].join(" ");
      }).join(" ")
    ].join(" ").toLocaleLowerCase();
  }

  function updateUrl() {
    const params = new URLSearchParams(window.location.search);
    const query = appliedQuery;
    if (query) params.set("q", query); else params.delete("q");
    if (faceMode !== "dressed") params.set("face", faceMode); else params.delete("face");
    if (actorMode === "collapsed") params.set("actor", actorMode); else params.delete("actor");
    if (supplementaryMode !== "collapsed") params.set("comment", supplementaryMode); else params.delete("comment");
    if (fixedMode !== "collapsed") params.set("fixed", fixedMode); else params.delete("fixed");
    if (sourceMode !== "collapsed") params.set("source", sourceMode); else params.delete("source");
    const queryString = params.toString();
    window.history.replaceState(null, "", window.location.pathname + (queryString ? "?" + queryString : ""));
  }

  function readUrlState() {
    const params = new URLSearchParams(window.location.search);
    appliedQuery = params.get("q") || "";
    elements.searchInput.value = appliedQuery;
    faceMode = ["dressed", "original", "hidden"].includes(params.get("face")) ? params.get("face") : "dressed";
    elements.faceMode.value = faceMode;
    actorMode = params.get("actor") === "expanded" ? "expanded" : "collapsed";
    elements.actorMode.value = actorMode;
    supplementaryMode = ["collapsed", "expanded", "hidden"].includes(params.get("comment")) ? params.get("comment") : "expanded";
    elements.supplementaryMode.value = supplementaryMode;
    fixedMode = ["expanded", "collapsed", "hidden"].includes(params.get("fixed")) ? params.get("fixed") : "collapsed";
    elements.fixedMode.value = fixedMode;
    sourceMode = ["collapsed", "expanded", "hidden"].includes(params.get("source")) ? params.get("source") : "collapsed";
    elements.sourceMode.value = sourceMode;
  }

  function createText(tag, className, value) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    node.textContent = value;
    return node;
  }

  function setFaceSource(faceFrame, actor) {
    if (faceMode === "hidden") {
      faceFrame.remove();
      return;
    }
    const image = faceFrame.querySelector(".actor-face");
    const placeholder = faceFrame.querySelector(".face-placeholder");
    const actorLabel = actor.id || "?";
    image.alt = (actor.nameChinese || "角色") + "头像";
    placeholder.textContent = "#" + actorLabel;
    faceFrame.classList.remove("is-placeholder");
    image.dataset.fallbackTried = "false";
    image.src = FACE_PATHS[faceMode] + encodeURIComponent(actorLabel) + ".png";
    image.onerror = function () {
      if (faceMode === "dressed" && image.dataset.fallbackTried !== "true") {
        image.dataset.fallbackTried = "true";
        image.src = FACE_PATHS.original + encodeURIComponent(actorLabel) + ".png";
        return;
      }
      faceFrame.classList.add("is-placeholder");
    };
  }

  function renderFixedAbility(actor, parent) {
    if (fixedMode === "hidden") return;
    const details = document.createElement("details");
    details.className = "fixed-details";
    details.open = fixedMode === "expanded";
    details.appendChild(createText("summary", "", "原固有能力"));
    const fixed = document.createElement("div");
    fixed.className = "fixed-ability";
    const fixedName = [actor.fixed.nameChinese, actor.fixed.nameJapanese].filter(Boolean).join(" / ");
    if (fixedName) fixed.appendChild(createText("div", "fixed-name", fixedName));
    if (actor.fixed.descriptions.length) {
      const listNode = document.createElement("ol");
      listNode.className = "fixed-descriptions";
      actor.fixed.descriptions.forEach(function (description) {
        const item = document.createElement("li");
        item.textContent = description.chinese || description.japanese || "暂无说明";
        listNode.appendChild(item);
      });
      fixed.appendChild(listNode);
    }
    if (!fixedName && !actor.fixed.descriptions.length) {
      fixed.appendChild(createText("div", "fixed-empty", "暂无固有能力名称或说明"));
    }
    details.appendChild(fixed);
    parent.appendChild(details);
  }

  function renderCapabilities(actor, parent) {
    parent.appendChild(createText("h3", "section-title", "特征与备注（" + actor.capabilities.length + " 条）"));
    const listNode = document.createElement("div");
    listNode.className = "capability-list";
    actor.capabilities.forEach(function (capability) {
      const item = document.createElement("article");
      item.className = "capability";
      if (capability.description) item.appendChild(createText("div", "capability-description", capability.description));
      if (capability.comment && supplementaryMode !== "hidden") {
        const comment = document.createElement("details");
        comment.className = "comment-details";
        comment.open = supplementaryMode === "expanded";
        comment.appendChild(createText("summary", "", "补充备注"));
        comment.appendChild(createText("div", "comment-text", capability.comment));
        item.appendChild(comment);
      }
      if (capability.sourceRaw && sourceMode !== "hidden") {
        const sourceDetails = document.createElement("details");
        sourceDetails.className = "source-details";
        sourceDetails.open = sourceMode === "expanded";
        sourceDetails.appendChild(createText("summary", "", "查看 source_raw"));
        sourceDetails.appendChild(createText("div", "source-raw", capability.sourceRaw));
        item.appendChild(sourceDetails);
      }
      listNode.appendChild(item);
    });
    parent.appendChild(listNode);
  }

  function renderActor(actor) {
    const fragment = elements.actorTemplate.content.cloneNode(true);
    const card = fragment.querySelector(".actor-card");
    const summary = fragment.querySelector(".actor-summary");
    const faceFrame = fragment.querySelector(".face-frame");
    if (faceMode === "hidden") summary.classList.add("faces-hidden");
    setFaceSource(faceFrame, actor);
    fragment.querySelector(".actor-id").textContent = "#" + (actor.id || "?");
    fragment.querySelector(".name-chinese").textContent = actor.nameChinese || "未命名角色";
    fragment.querySelector(".name-japanese").textContent = actor.nameJapanese || "暂无日文名";
    const meta = [actor.capabilities.length + " 条特征"];
    if (hasComment(actor)) meta.push("含备注");
    if (hasSource(actor)) meta.push("含来源");
    fragment.querySelector(".actor-meta").textContent = meta.join(" · ");
    const body = fragment.querySelector(".actor-body");
    renderCapabilities(actor, body);
    renderFixedAbility(actor, body);
    if (actorMode === "expanded") card.open = true;
    return fragment;
  }

  function applyFilters() {
    const query = appliedQuery.toLocaleLowerCase();
    filteredActors = actors.filter(function (actor) {
      if (query && !searchableText(actor).includes(query)) return false;
      return true;
    });
    elements.actorList.replaceChildren();
    const fragment = document.createDocumentFragment();
    filteredActors.forEach(function (actor) { fragment.appendChild(renderActor(actor)); });
    elements.actorList.appendChild(fragment);
    elements.emptyState.hidden = filteredActors.length !== 0;
    elements.resultLine.textContent = "显示 " + filteredActors.length + " / " + actors.length + " 个角色";
    updateUrl();
    updateScrollButtons();
  }

  function clearFilters() {
    elements.searchInput.value = "";
    appliedQuery = "";
    actorMode = "collapsed";
    supplementaryMode = "expanded";
    fixedMode = "collapsed";
    elements.actorMode.value = actorMode;
    elements.supplementaryMode.value = supplementaryMode;
    elements.fixedMode.value = fixedMode;
    applyFilters();
  }

  function updateMetrics() {
    const capabilityCount = actors.reduce(function (sum, actor) { return sum + actor.capabilities.length; }, 0);
    const commentCount = actors.reduce(function (sum, actor) {
      return sum + actor.capabilities.filter(function (capability) { return hasText(capability.comment); }).length;
    }, 0);
    const sourceCount = actors.reduce(function (sum, actor) {
      return sum + actor.capabilities.filter(function (capability) { return hasText(capability.sourceRaw); }).length;
    }, 0);
    elements.actorCount.textContent = actors.length.toLocaleString();
    elements.capabilityCount.textContent = capabilityCount.toLocaleString();
    elements.commentCount.textContent = commentCount.toLocaleString();
    elements.sourceCount.textContent = sourceCount.toLocaleString();
  }

  function showError(error) {
    elements.loadStatus.textContent = "加载失败";
    elements.errorMessage.textContent = "无法读取 actors.json。请使用本地开发服务器打开页面。" + (error && error.message ? "（" + error.message + "）" : "");
    elements.errorState.hidden = false;
    elements.actorList.hidden = true;
  }

  function submitSearch() {
    appliedQuery = elements.searchInput.value.trim();
    applyFilters();
  }

  function updateScrollButtons() {
    const current = window.scrollY || document.documentElement.scrollTop;
    const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    elements.scrollTop.hidden = current < 300;
    elements.scrollBottom.hidden = maxScroll < 300 || current > maxScroll - 300;
  }

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function scrollToBottom() {
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" });
  }

  async function init() {
    readUrlState();
    try {
      const response = await fetch(DATA_URL, { cache: "no-cache" });
      if (!response.ok) throw new Error("HTTP " + response.status);
      const data = await response.json();
      actors = list(data.actors).map(normalizeActor);
      updateMetrics();
      elements.loadStatus.textContent = "数据已加载";
      applyFilters();
    } catch (error) {
      showError(error);
    }
  }

  elements.searchButton.addEventListener("click", submitSearch);
  elements.searchInput.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
      event.preventDefault();
      submitSearch();
    }
  });
  elements.faceMode.addEventListener("change", function () {
    faceMode = ["dressed", "original", "hidden"].includes(elements.faceMode.value) ? elements.faceMode.value : "dressed";
    applyFilters();
  });
  elements.actorMode.addEventListener("change", function () {
    actorMode = elements.actorMode.value === "collapsed" ? "collapsed" : "expanded";
    applyFilters();
  });
  elements.supplementaryMode.addEventListener("change", function () {
    supplementaryMode = ["collapsed", "expanded", "hidden"].includes(elements.supplementaryMode.value) ? elements.supplementaryMode.value : "collapsed";
    applyFilters();
  });
  elements.fixedMode.addEventListener("change", function () {
    fixedMode = ["expanded", "collapsed", "hidden"].includes(elements.fixedMode.value) ? elements.fixedMode.value : "collapsed";
    applyFilters();
  });
  elements.sourceMode.addEventListener("change", function () {
    sourceMode = ["collapsed", "expanded", "hidden"].includes(elements.sourceMode.value) ? elements.sourceMode.value : "collapsed";
    applyFilters();
  });
  elements.clearFilters.addEventListener("click", clearFilters);
  elements.scrollTop.addEventListener("click", scrollToTop);
  elements.scrollBottom.addEventListener("click", scrollToBottom);
  window.addEventListener("scroll", updateScrollButtons, { passive: true });
  window.addEventListener("resize", updateScrollButtons);
  updateScrollButtons();
  init();
})();
