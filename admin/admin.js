(function () {
  "use strict";

  var OWNER_EMAIL = "yatharth@scaleupbiz.co.in";
  var config = window.PORTFOLIO_CONTENT_CONFIG;
  var status = document.getElementById("adminStatus");
  var loginPanel = document.getElementById("loginPanel");
  var editorPanel = document.getElementById("editorPanel");
  var loginButton = document.getElementById("loginButton");
  var saveButton = document.getElementById("saveEntry");
  var signOutButton = document.getElementById("signOut");
  var form = document.getElementById("entryForm");
  var state = { kind: "project", entries: [], selectedId: null };

  function message(text, type) {
    status.textContent = text;
    status.className = "admin-status" + (type ? " is-" + type : "");
  }

  if (!config || !config.url || !config.publishableKey || !window.supabase) {
    message("The content service is not configured yet. The public portfolio is unaffected.", "error");
    loginButton.disabled = true;
    return;
  }

  var client = window.supabase.createClient(config.url, config.publishableKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
  var input = function (id) { return document.getElementById(id); };

  function validUrl(value, allowAnchor) {
    if (allowAnchor && /^#[a-z][a-z0-9-]*$/i.test(value)) return true;
    if (/^assets\/[a-z0-9._/-]+$/i.test(value) && !value.includes("..")) return !allowAnchor;
    try { return new URL(value).protocol === "https:"; } catch { return false; }
  }

  function setKind(kind) {
    state.kind = kind;
    input("projectsTab").setAttribute("aria-selected", String(kind === "project"));
    input("servicesTab").setAttribute("aria-selected", String(kind === "service"));
    input("faqsTab").setAttribute("aria-selected", String(kind === "faq"));
    input("listHeading").textContent = kind === "project" ? "Projects" : kind === "service" ? "Services" : "FAQ questions";
    input("formEyebrow").textContent = kind === "project" ? "Project editor" : kind === "service" ? "Service editor" : "Question editor";
    input("projectFields").hidden = kind !== "project";
    input("serviceFields").hidden = kind !== "service";
    input("faqFields").hidden = kind !== "faq";
    input("descriptionField").hidden = kind === "faq";
    input("linkFields").hidden = kind === "faq";
    input("entryDescription").required = kind !== "faq";
    input("entryAnswer").required = kind === "faq";
    renderList();
    resetForm();
  }

  function renderList() {
    var list = input("entryList");
    list.replaceChildren();
    input("projectCount").textContent = state.entries.filter(function (entry) { return entry.kind === "project"; }).length;
    input("serviceCount").textContent = state.entries.filter(function (entry) { return entry.kind === "service"; }).length;
    input("faqCount").textContent = state.entries.filter(function (entry) { return entry.kind === "faq"; }).length;
    var items = state.entries.filter(function (entry) { return entry.kind === state.kind; });
    items.sort(function (a, b) { return a.sort_order - b.sort_order || a.title.localeCompare(b.title); });
    if (!items.length) {
      var empty = document.createElement("p");
      empty.className = "admin-empty";
      empty.textContent = "No " + (state.kind === "project" ? "projects" : state.kind === "service" ? "services" : "questions") + " yet. Add the first one.";
      list.append(empty);
    }
    items.forEach(function (entry) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "admin-list-item";
      button.setAttribute("aria-current", String(state.selectedId === entry.id));
      var badge = document.createElement("span");
      badge.className = "admin-badge" + (entry.published ? "" : " draft");
      badge.textContent = entry.published ? "Live" : "Draft";
      var title = document.createElement("strong");
      title.textContent = entry.title;
      var meta = document.createElement("small");
      meta.textContent = "Order " + entry.sort_order + (entry.subtitle ? " · " + entry.subtitle : "");
      button.append(badge, title, meta);
      button.addEventListener("click", function () { selectEntry(entry); });
      list.append(button);
    });
  }

  function resetForm() {
    form.reset();
    state.selectedId = null;
    input("entryId").value = "";
    input("entryOrder").value = String(state.entries.filter(function (entry) { return entry.kind === state.kind; }).length + 1);
    input("entryLinkLabel").value = state.kind === "project" ? "View project" : state.kind === "service" ? "Let’s talk" : "";
    input("entryLinkUrl").value = state.kind === "service" ? "#contact" : "";
    input("formTitle").textContent = state.kind === "project" ? "New project" : state.kind === "service" ? "New service" : "New question";
    renderList();
  }

  function selectEntry(entry) {
    state.selectedId = entry.id;
    input("entryId").value = entry.id;
    input("entryTitle").value = entry.title || "";
    input("entrySubtitle").value = entry.subtitle || "";
    input("entryDescription").value = entry.description || "";
    input("entryContribution").value = entry.details && entry.details.contribution || "";
    input("entryImageUrl").value = entry.image_url || "";
    input("entryImageAlt").value = entry.details && entry.details.alt || "";
    input("entryImageFile").value = "";
    input("entryBullets").value = entry.details && Array.isArray(entry.details.bullets) ? entry.details.bullets.join("\n") : "";
    input("entryAnswer").value = entry.description || "";
    input("entryLinkUrl").value = entry.link_url || "";
    input("entryLinkLabel").value = entry.link_label || "";
    input("entryOrder").value = entry.sort_order || 1;
    input("entryPublished").checked = Boolean(entry.published);
    input("formTitle").textContent = "Edit " + (state.kind === "project" ? "project" : state.kind === "service" ? "service" : "question");
    renderList();
    input("entryTitle").focus();
  }

  async function loadEntries() {
    var result = await client.from("portfolio_entries").select("*").order("sort_order", { ascending: true });
    if (result.error) throw result.error;
    state.entries = result.data || [];
    renderList();
  }

  async function showSession() {
    var result = await client.auth.getUser();
    var user = result.data && result.data.user;
    if (!user || !user.email || user.email.toLowerCase() !== OWNER_EMAIL) {
      loginPanel.hidden = false;
      editorPanel.hidden = true;
      signOutButton.hidden = true;
      if (user) {
        await client.auth.signOut();
        message("This account cannot edit the portfolio.", "error");
      }
      return;
    }
    loginPanel.hidden = true;
    editorPanel.hidden = false;
    signOutButton.hidden = false;
    input("signedInEmail").textContent = user.email;
    try { await loadEntries(); } catch { message("Could not load content. Please try again.", "error"); }
  }

  input("loginForm").addEventListener("submit", async function (event) {
    event.preventDefault();
    var email = input("loginEmail").value.trim().toLowerCase();
    if (email !== OWNER_EMAIL) { message("Use the portfolio owner's email address.", "error"); return; }
    loginButton.disabled = true;
    message("Sending sign-in link…");
    try {
      var result = await client.auth.signInWithOtp({
        email: email,
        options: { emailRedirectTo: window.location.origin + "/admin/" }
      });
      message(result.error ? "Sign-in link could not be sent. Please try again." : "Check your inbox for the sign-in link.", result.error ? "error" : "success");
    } catch {
      message("Sign-in link could not be sent. Please try again.", "error");
    } finally {
      loginButton.disabled = false;
    }
  });

  signOutButton.addEventListener("click", async function () {
    await client.auth.signOut();
    state.entries = [];
    await showSession();
    message("Signed out.", "success");
  });

  [input("projectsTab"), input("servicesTab"), input("faqsTab")].forEach(function (tab) {
    tab.addEventListener("click", function () { setKind(tab.dataset.kind); });
  });
  input("addEntry").addEventListener("click", function () { resetForm(); input("entryTitle").focus(); });
  input("resetEntry").addEventListener("click", resetForm);

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    var title = input("entryTitle").value.trim();
    var description = input(state.kind === "faq" ? "entryAnswer" : "entryDescription").value.trim();
    var imageUrl = input("entryImageUrl").value.trim();
    var linkUrl = input("entryLinkUrl").value.trim();
    var published = input("entryPublished").checked;
    var file = input("entryImageFile").files[0];
    if (!title || !description) { message(state.kind === "faq" ? "Add a question and answer." : "Add a title and description.", "error"); return; }
    if (state.kind !== "faq" && linkUrl && !validUrl(linkUrl, state.kind === "service")) { message("Use a secure HTTPS link" + (state.kind === "service" ? " or a page link such as #contact" : "") + ".", "error"); return; }
    if (state.kind === "project" && imageUrl && !validUrl(imageUrl, false)) { message("Use a secure screenshot URL or an existing assets/ image.", "error"); return; }
    if (published && state.kind === "project" && !imageUrl && !file) { message("Add a screenshot before publishing this project.", "error"); return; }
    if (published && state.kind === "project" && !linkUrl) { message("Add a project link before publishing.", "error"); return; }
    if (file && (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size > 5 * 1024 * 1024)) { message("Upload a JPG, PNG or WebP image under 5 MB.", "error"); return; }

    saveButton.disabled = true;
    message("Saving entry…");
    try {
      if (file) {
        var extension = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }[file.type];
        var path = "projects/" + crypto.randomUUID() + "." + extension;
        var upload = await client.storage.from("portfolio-images").upload(path, file, { contentType: file.type, upsert: false });
        if (upload.error) throw upload.error;
        imageUrl = client.storage.from("portfolio-images").getPublicUrl(path).data.publicUrl;
      }
      var details = state.kind === "project"
        ? { contribution: input("entryContribution").value.trim(), alt: input("entryImageAlt").value.trim() }
        : state.kind === "service"
        ? { bullets: input("entryBullets").value.split("\n").map(function (line) { return line.trim(); }).filter(Boolean).slice(0, 8) }
        : {};
      var payload = {
        kind: state.kind, title: title, subtitle: input("entrySubtitle").value.trim(), description: description,
        image_url: state.kind === "project" ? imageUrl : null,
        link_url: state.kind === "faq" ? null : linkUrl || (state.kind === "service" ? "#contact" : null),
        link_label: state.kind === "faq" ? "" : input("entryLinkLabel").value.trim() || (state.kind === "project" ? "View project" : "Let’s talk"),
        details: details, sort_order: Number(input("entryOrder").value) || 1,
        published: published, updated_at: new Date().toISOString()
      };
      var result = state.selectedId
        ? await client.from("portfolio_entries").update(payload).eq("id", state.selectedId).select("id").single()
        : await client.from("portfolio_entries").insert(payload).select("id").single();
      if (result.error) throw result.error;
      await loadEntries();
      var saved = state.entries.find(function (entry) { return entry.id === result.data.id; });
      if (saved) selectEntry(saved);
      message(published ? "Saved and published. Refresh the website to see the change." : "Draft saved. It is not visible on the website.", "success");
    } catch (error) {
      message("Could not save this entry. Check the connection and try again.", "error");
      console.error("Portfolio admin save failed", error);
    } finally {
      saveButton.disabled = false;
    }
  });

  client.auth.onAuthStateChange(function () { setTimeout(showSession, 0); });
  showSession();
})();
