/* Render published portfolio entries; preserve the built-in cards if the API is unavailable. */
(function () {
  "use strict";

  var config = window.PORTFOLIO_CONTENT_CONFIG;
  if (!config || !config.url || !config.publishableKey) return;

  var workGrid = document.querySelector(".project-grid");
  var servicesGrid = document.querySelector(".grid-services");
  var faqList = document.querySelector(".faq-list");
  if (!workGrid || !servicesGrid) return;

  function node(tag, className, text) {
    var element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function safeUrl(value, allowAnchor) {
    if (allowAnchor && /^#[a-z][a-z0-9-]*$/i.test(value || "")) return value;
    /* Site-relative routes (e.g. /website-development/) stay on this domain. */
    if (/^\/[a-z0-9][a-z0-9./-]*$/i.test(value || "") && !value.includes("..")) return value;
    try {
      var url = new URL(value);
      return url.protocol === "https:" ? url.href : "";
    } catch {
      return "";
    }
  }

  function addLink(parent, url, label, className, accessibleLabel) {
    var destination = safeUrl(url, true);
    if (!destination) return;
    var link = node("a", className);
    link.href = destination;
    if (accessibleLabel) link.setAttribute("aria-label", accessibleLabel);
    if (/^https:/i.test(destination)) {
      link.target = "_blank";
      link.rel = "noopener noreferrer";
    }
    link.append(node("span", "", label), node("span", "", "↗"));
    link.lastChild.setAttribute("aria-hidden", "true");
    parent.append(link);
  }

  /* Split a stored answer into paragraph blocks so the stagger has lines to animate. */
  function paragraphBlocks(text) {
    return String(text || "").split(/\n{2,}/).map(function (block) {
      return block.trim();
    }).filter(Boolean);
  }

  function renderFaq(item, index) {
    var entry = node("div", "faq-item");

    var heading = node("h3");
    var button = node("button", "faq-trigger");
    button.type = "button";
    button.setAttribute("aria-expanded", "false");
    var question = node("span", "faq-q");
    if (item.subtitle) question.append(node("span", "faq-tag", item.subtitle));
    question.append(node("span", "", item.title));
    button.append(question, node("span", "faq-icon"));
    button.lastChild.setAttribute("aria-hidden", "true");
    heading.append(button);

    var panelId = "faq-panel-cms-" + (index + 1);
    var panel = node("div", "faq-panel");
    panel.id = panelId;
    panel.setAttribute("role", "region");
    panel.setAttribute("aria-label", item.title);
    panel.hidden = true;

    var inner = node("div", "faq-panel-inner");
    var answer = node("div", "faq-answer");
    paragraphBlocks(item.description).forEach(function (block) {
      answer.append(node("p", "", block));
    });
    inner.append(answer);
    panel.append(inner);
    entry.append(heading, panel);
    return entry;
  }

  function renderProject(item, index) {
    var card = node("article", "project-card");
    var heading = node("h3", "", item.title);
    heading.id = "project-" + item.id;
    card.setAttribute("aria-labelledby", heading.id);

    var picture = node("div", "project-card-image");
    var imageUrl = safeUrl(item.image_url || "", false);
    if (!imageUrl && /^assets\/[a-z0-9._/-]+$/i.test(item.image_url || "")) imageUrl = item.image_url;
    if (imageUrl) {
      var image = node("img");
      image.src = imageUrl;
      image.alt = item.details && item.details.alt ? item.details.alt : item.title + " project preview";
      image.width = 1425;
      image.height = 802;
      image.loading = "lazy";
      image.decoding = "async";
      picture.append(image);
    }

    var body = node("div", "project-card-content");
    var meta = node("div", "project-card-meta");
    meta.append(node("p", "project-category", item.subtitle || "Website project"));
    var number = node("span", "project-number", String(index + 1).padStart(2, "0"));
    number.setAttribute("aria-hidden", "true");
    meta.append(number);
    body.append(meta, heading, node("p", "project-description", item.description));

    if (item.details && item.details.contribution) {
      var contribution = node("dl", "project-contribution");
      contribution.append(node("dt", "", "My contribution"), node("dd", "", item.details.contribution));
      body.append(contribution);
    }
    addLink(body, item.link_url, item.link_label || "View project", "project-link", "View project: " + item.title + " (opens in a new tab)");
    card.append(picture, body);
    return card;
  }

  function renderService(item, index) {
    var card = node("article", "service-card");
    var tag = node("span", "item-number", String(index + 1).padStart(2, "0") + " / " + (item.subtitle || "SERVICE"));
    tag.setAttribute("aria-hidden", "true");
    card.append(tag, node("h3", "", item.title), node("p", "", item.description));
    var bullets = item.details && Array.isArray(item.details.bullets) ? item.details.bullets : [];
    if (bullets.length) {
      var list = node("ul", "detail-list");
      bullets.forEach(function (bullet) { list.append(node("li", "", String(bullet))); });
      card.append(list);
    }
    var linkRow = node("div", "service-links");
    addLink(linkRow, item.link_url || "#contact", item.link_label || "Let’s talk", "text-link");
    /* The website-development page link is structural, so the CMS cannot drop it. */
    if (item.source_key === "websites") {
      addLink(linkRow, "/website-development/", "Explore website development", "text-link", "Explore the ScaleUpBiz website development service");
    }
    card.append(linkRow);
    return card;
  }

  var endpoint = config.url.replace(/\/$/, "") + "/rest/v1/portfolio_entries?select=id,kind,title,subtitle,description,details,image_url,link_url,link_label,source_key,sort_order&published=eq.true&order=sort_order.asc";
  fetch(endpoint, { headers: { apikey: config.publishableKey }, cache: "no-store" })
    .then(function (response) { if (!response.ok) throw new Error("Content unavailable"); return response.json(); })
    .then(function (entries) {
      if (!Array.isArray(entries)) throw new Error("Invalid content");
      var projects = entries.filter(function (entry) { return entry.kind === "project"; });
      var services = entries.filter(function (entry) { return entry.kind === "service"; });
      var faqs = entries.filter(function (entry) { return entry.kind === "faq"; });
      workGrid.replaceChildren.apply(workGrid, projects.map(renderProject));
      servicesGrid.replaceChildren.apply(servicesGrid, services.map(renderService));
      /* Keep the built-in questions until FAQ rows are actually published in the CMS. */
      if (faqList && faqs.length) {
        faqList.replaceChildren.apply(faqList, faqs.map(renderFaq));
        document.dispatchEvent(new CustomEvent("faq:content-rendered"));
      }
      var counter = document.querySelector(".work-eyebrow span");
      if (counter) counter.textContent = projects.length ? "/ 01—" + String(projects.length).padStart(2, "0") : "/ 00";
      var intro = document.querySelector(".work-intro");
      if (intro) intro.textContent = projects.length ? "Selected projects, built with purpose and attention to detail." : "New work is on the way.";
    })
    .catch(function () { /* The built-in cards remain visible. */ });
})();
