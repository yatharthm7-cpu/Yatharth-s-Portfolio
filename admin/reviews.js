/* Review moderation for the admin dashboard. Runs on the owner's authenticated Supabase
   session; row-level security allows only the owner to read private fields or change
   status. The website shows a review only after it is approved here. */
(function () {
  "use strict";

  var OWNER_EMAIL = "yatharth@scaleupbiz.co.in";
  var config = window.PORTFOLIO_CONTENT_CONFIG;
  var tab = document.getElementById("reviewsTab");
  if (!tab || !config || !config.url || !config.publishableKey || !window.supabase) return;

  var client = window.supabase.createClient(config.url, config.publishableKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });

  var panel = document.getElementById("reviewsPanel");
  var count = document.getElementById("reviewsCount");
  var list = document.getElementById("reviewsList");
  var empty = document.getElementById("reviewsEmpty");
  var refresh = document.getElementById("reviewsRefresh");
  var statusEl = document.getElementById("reviewsStatus");
  var editor = document.getElementById("reviewEditor");
  var editorStars = document.getElementById("reviewEditorStars");
  var editorName = document.getElementById("reviewEditorName");
  var editorMeta = document.getElementById("reviewEditorMeta");
  var editorStatus = document.getElementById("reviewEditorStatus");
  var editName = document.getElementById("reviewEditName");
  var editBusiness = document.getElementById("reviewEditBusiness");
  var editProject = document.getElementById("reviewEditProject");
  var editOrder = document.getElementById("reviewEditOrder");
  var editText = document.getElementById("reviewEditText");
  var editEmail = document.getElementById("reviewEditEmail");
  var editVerified = document.getElementById("reviewEditVerified");
  var consentNote = document.getElementById("reviewConsentNote");
  var approveButton = document.getElementById("reviewApprove");
  var unpublishButton = document.getElementById("reviewUnpublish");
  var rejectButton = document.getElementById("reviewReject");
  var saveButton = document.getElementById("reviewSave");
  var deleteButton = document.getElementById("reviewDelete");
  var deleteConfirm = document.getElementById("reviewDeleteConfirm");
  var deleteYes = document.getElementById("reviewDeleteYes");
  var deleteNo = document.getElementById("reviewDeleteNo");

  var state = { reviews: [], selectedId: null, loaded: false, signedIn: false, busy: false };
  var STATUS_RANK = { pending: 0, approved: 1, rejected: 2 };
  var STATUS_LABEL = { pending: "Pending", approved: "Approved", rejected: "Rejected" };

  function message(text, type) {
    statusEl.textContent = text;
    statusEl.className = "admin-inline-status" + (type ? " is-" + type : "");
  }
  function shortDate(value) {
    var date = new Date(value);
    if (isNaN(date.getTime())) return "";
    try {
      return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(date);
    } catch (_) {
      return date.getFullYear() + "";
    }
  }
  function starString(rating) {
    return "★".repeat(rating) + "☆".repeat(5 - rating);
  }
  function isOwner(user) {
    return Boolean(user && !user.is_anonymous && user.email && user.email.toLowerCase() === OWNER_EMAIL);
  }

  tab.addEventListener("click", function () {
    ["projectsTab", "servicesTab", "faqsTab"].forEach(function (id) {
      var button = document.getElementById(id);
      if (button) button.setAttribute("aria-selected", "false");
    });
    tab.setAttribute("aria-selected", "true");
    panel.hidden = false;
    var layout = document.querySelector(".admin-layout");
    if (layout) layout.hidden = true;
    if (state.signedIn && !state.loaded && !state.busy) loadReviews();
  });

  refresh.addEventListener("click", function () {
    if (state.signedIn && !state.busy) loadReviews();
  });

  async function loadReviews() {
    state.busy = true;
    message("Loading reviews…");
    var result = await client.from("reviews").select("*");
    state.busy = false;
    if (result.error) {
      message("Could not load reviews. Check the connection and use Refresh.", "error");
      return;
    }
    state.reviews = result.data || [];
    state.loaded = true;
    message("");
    renderAll();
  }

  function sortedReviews() {
    return state.reviews.slice().sort(function (a, b) {
      if (STATUS_RANK[a.status] !== STATUS_RANK[b.status]) return STATUS_RANK[a.status] - STATUS_RANK[b.status];
      if (a.status === "pending") return new Date(a.created_at) - new Date(b.created_at);
      if (a.status === "approved") {
        return (a.display_order || 0) - (b.display_order || 0)
          || new Date(b.published_at || 0) - new Date(a.published_at || 0);
      }
      return new Date(b.updated_at) - new Date(a.updated_at);
    });
  }

  function renderAll() {
    var pending = state.reviews.filter(function (review) { return review.status === "pending"; }).length;
    count.textContent = String(pending);
    count.className = pending ? "has-pending" : "";
    renderList();
    if (state.selectedId) {
      var selected = state.reviews.find(function (review) { return review.id === state.selectedId; });
      if (selected) { fillEditor(selected); return; }
      state.selectedId = null;
    }
    editor.hidden = true;
  }

  function renderList() {
    list.replaceChildren();
    var items = sortedReviews();
    empty.hidden = items.length > 0;
    items.forEach(function (review) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "admin-list-item review-moderation-item";
      button.setAttribute("aria-current", String(state.selectedId === review.id));
      button.setAttribute("aria-label", "Review from " + review.client_name + ", rated " + review.rating + " of 5, " + STATUS_LABEL[review.status]);
      var top = document.createElement("span");
      top.className = "review-item-top";
      var stars = document.createElement("span");
      stars.className = "review-item-stars";
      stars.setAttribute("aria-hidden", "true");
      stars.textContent = starString(review.rating);
      var badge = document.createElement("span");
      badge.className = "admin-badge is-" + review.status;
      badge.textContent = STATUS_LABEL[review.status];
      top.append(stars, badge);
      var title = document.createElement("strong");
      title.textContent = review.client_name + (review.verified_client ? " ✓" : "");
      var meta = document.createElement("small");
      var context = [review.business_name, review.project_name].filter(Boolean).join(" · ");
      meta.textContent = (context ? context + " · " : "") + "Submitted " + shortDate(review.created_at);
      button.append(top, title, meta);
      button.addEventListener("click", function () { selectReview(review.id); });
      list.append(button);
    });
  }

  function fillEditor(review) {
    editorStars.textContent = starString(review.rating);
    editorStars.setAttribute("aria-label", "Rated " + review.rating + " of 5");
    editorName.textContent = review.client_name;
    editorMeta.textContent = "Submitted " + shortDate(review.created_at)
      + (review.verified_client ? " · verified client" : "")
      + (review.published_at ? " · published " + shortDate(review.published_at) : "");
    editorStatus.textContent = STATUS_LABEL[review.status];
    editorStatus.className = "admin-badge is-" + review.status;
    editName.value = review.client_name || "";
    editBusiness.value = review.business_name || "";
    editProject.value = review.project_name || "";
    editOrder.value = String(review.display_order || 0);
    editText.value = review.review_text || "";
    editEmail.value = review.client_email || "";
    editVerified.checked = Boolean(review.verified_client);
    consentNote.textContent = review.consent_to_publish
      ? "The client gave permission to publish this feedback publicly after verification."
      : "The client did not give publication permission, so this review cannot be approved.";
    approveButton.disabled = !review.consent_to_publish || review.status === "approved";
    unpublishButton.hidden = review.status !== "approved";
    rejectButton.disabled = review.status === "rejected";
    deleteConfirm.hidden = true;
    editor.hidden = false;
    renderList();
  }

  function selectReview(id) {
    var review = state.reviews.find(function (item) { return item.id === id; });
    if (!review) return;
    state.selectedId = id;
    fillEditor(review);
  }

  function editedFields() {
    return {
      client_name: editName.value.trim(),
      business_name: editBusiness.value.trim() || null,
      project_name: editProject.value.trim() || null,
      review_text: editText.value.trim(),
      display_order: Math.max(0, Math.min(999, Number(editOrder.value) || 0)),
      verified_client: editVerified.checked
    };
  }
  function validateEdits(fields) {
    if (!fields.client_name || fields.client_name.length > 80) return "The client name must be 1–80 characters.";
    if ((fields.business_name || "").length > 100) return "The business name must be 100 characters or fewer.";
    if ((fields.project_name || "").length > 100) return "The project name must be 100 characters or fewer.";
    if (fields.review_text.length < 40 || fields.review_text.length > 700) return "The review must stay between 40 and 700 characters.";
    return "";
  }

  async function updateReview(payload, successMessage) {
    if (!state.selectedId || state.busy) return false;
    state.busy = true;
    message("Saving…");
    var result = await client.from("reviews").update(payload).eq("id", state.selectedId).select("id").single();
    state.busy = false;
    if (result.error) {
      message("Could not save this change. Check the connection and try again.", "error");
      return false;
    }
    await loadReviews();
    message(successMessage, "success");
    return true;
  }

  saveButton.addEventListener("click", async function () {
    var fields = editedFields();
    var problem = validateEdits(fields);
    if (problem) { message(problem, "error"); return; }
    await updateReview(fields, "Changes saved. The website shows the review as saved here.");
  });

  approveButton.addEventListener("click", async function () {
    var review = state.reviews.find(function (item) { return item.id === state.selectedId; });
    if (!review) return;
    if (!review.consent_to_publish) { message("Publication permission is missing, so this review cannot be approved.", "error"); return; }
    var fields = editedFields();
    var problem = validateEdits(fields);
    if (problem) { message(problem, "error"); return; }
    fields.status = "approved";
    fields.published_at = new Date().toISOString();
    await updateReview(fields, "Approved and published. It now appears on the website with its rating.");
  });

  unpublishButton.addEventListener("click", async function () {
    await updateReview({ status: "pending", published_at: null }, "Unpublished. The review is waiting for approval again.");
  });

  rejectButton.addEventListener("click", async function () {
    await updateReview({ status: "rejected", published_at: null }, "Rejected. The review will not appear on the website.");
  });

  deleteButton.addEventListener("click", function () {
    deleteConfirm.hidden = false;
    deleteYes.focus();
  });
  deleteNo.addEventListener("click", function () {
    deleteConfirm.hidden = true;
    deleteButton.focus();
  });
  deleteYes.addEventListener("click", async function () {
    if (!state.selectedId || state.busy) return;
    state.busy = true;
    message("Deleting…");
    var result = await client.from("reviews").delete().eq("id", state.selectedId);
    state.busy = false;
    if (result.error) {
      message("Could not delete this review. Try again.", "error");
      return;
    }
    state.selectedId = null;
    await loadReviews();
    message("Review deleted permanently.", "success");
  });

  async function checkSession() {
    var result = await client.auth.getUser();
    var user = result.data && result.data.user;
    state.signedIn = isOwner(user);
    if (!state.signedIn) {
      state.reviews = [];
      state.loaded = false;
      state.selectedId = null;
      renderAll();
      return;
    }
    if (!state.loaded && !panel.hidden && !state.busy) loadReviews();
  }
  client.auth.onAuthStateChange(function () { setTimeout(checkSession, 0); });
  checkSession();
})();
