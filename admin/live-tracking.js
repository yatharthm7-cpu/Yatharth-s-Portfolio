(function () {
  "use strict";
  window.createLiveTracking = function (client) {
    var panel = document.getElementById("liveTracking");
    if (!panel) return { start: function () {}, stop: function () {} };
    var status = document.getElementById("trackingStatus");
    var refresh = document.getElementById("trackingRefresh");
    var auto = document.getElementById("trackingAuto");
    var updated = document.getElementById("trackingUpdated");
    var active = false, busy = false, generation = 0, timer, controller;
    var fields = ["activeUsers5", "activeUsers30", "pageViews30", "enquiries30", "whatsappClicks30", "emailClicks30"];
    var messages = {
      analytics_setup_required: "Google Analytics needs its private server connection. The setup guide below explains the final connection step.",
      analytics_connection_failed: "The secure Google connection could not be verified. Check the production connection and try again.",
      analytics_access_required: "Google denied report access. Enable the Analytics Data API and give the dashboard connection Viewer access to this property.",
      analytics_rate_limited: "Google's report limit was reached. Wait a moment and refresh.",
      sign_in_required: "Your session has expired. Sign in again to view tracking.",
      owner_only: "Live tracking is available only to the verified portfolio owner.",
      auth_unavailable: "Sign-in verification is temporarily unavailable. Try again shortly."
    };
    function blank() {
      fields.forEach(function (key) { document.getElementById("tracking-" + key).textContent = "—"; });
      document.getElementById("trackingPages").replaceChildren();
      document.getElementById("trackingCountries").replaceChildren();
      updated.textContent = "No report loaded yet.";
    }
    function rows(id, items, empty) {
      var list = document.getElementById(id);
      list.replaceChildren();
      if (!items.length) { var note = document.createElement("li"); note.className = "tracking-empty"; note.textContent = empty; list.appendChild(note); return; }
      items.forEach(function (item) {
        var row = document.createElement("li"), label = document.createElement("span"), count = document.createElement("strong");
        label.textContent = item.name; count.textContent = item.count.toLocaleString(); row.append(label, count); list.appendChild(row);
      });
    }
    function schedule() {
      clearTimeout(timer);
      if (active && auto.checked && !document.hidden) timer = setTimeout(load, 30000);
    }
    async function load() {
      if (!active || busy || document.hidden) return;
      var turn = generation;
      busy = true; refresh.disabled = true;
      panel.setAttribute("aria-busy", "true");
      status.textContent = "Updating from Google Analytics…";
      panel.dataset.state = "loading";
      controller = new AbortController();
      var abort = setTimeout(function () { if (turn === generation && controller) controller.abort(); }, 20000);
      try {
        var session = await client.auth.getSession();
        if (!active || turn !== generation) return;
        var token = session.data && session.data.session && session.data.session.access_token;
        if (!token) throw { code: "sign_in_required" };
        var response = await fetch("/api/analytics", { headers: { Authorization: "Bearer " + token }, cache: "no-store", signal: controller.signal });
        var data = await response.json();
        if (!active || turn !== generation) return;
        if (!response.ok) throw { code: data.error };
        if (fields.some(function (key) { return !Number.isFinite(data[key]) || data[key] < 0; }) || !Array.isArray(data.pages) || !Array.isArray(data.countries) || data.pages.concat(data.countries).some(function (row) { return !row || typeof row.name !== "string" || !Number.isFinite(row.count) || row.count < 0; }) || !Number.isFinite(Date.parse(data.updatedAt))) throw { code: "analytics_unavailable" };
        fields.forEach(function (key) { document.getElementById("tracking-" + key).textContent = data[key].toLocaleString(); });
        rows("trackingPages", data.pages, "No page views in the last 30 minutes.");
        rows("trackingCountries", data.countries, "No active visitors in the last 30 minutes.");
        updated.textContent = "Last successful update: " + new Date(data.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
        status.textContent = "Connected to Google Analytics.";
        panel.dataset.state = "connected";
        document.getElementById("trackingSetup").hidden = true;
      } catch (error) {
        if (!active || turn !== generation) return;
        status.textContent = messages[error.code] || "Live data could not be refreshed. Any numbers shown are from the last successful update.";
        panel.dataset.state = "error";
        if (error.code === "sign_in_required" || error.code === "owner_only") { blank(); active = false; }
        if (error.code === "analytics_setup_required" || error.code === "analytics_access_required" || error.code === "analytics_connection_failed") {
          document.getElementById("trackingSetup").hidden = false;
          auto.checked = false;
        }
      } finally {
        clearTimeout(abort);
        if (turn === generation) { busy = false; refresh.disabled = false; panel.setAttribute("aria-busy", "false"); schedule(); }
      }
    }
    refresh.addEventListener("click", load);
    auto.addEventListener("change", schedule);
    document.addEventListener("visibilitychange", function () { clearTimeout(timer); if (active && auto.checked && !document.hidden) load(); });
    return {
      start: function () { if (active) return; active = true; generation++; blank(); load(); },
      stop: function () { active = false; generation++; clearTimeout(timer); if (controller) controller.abort(); busy = false; refresh.disabled = false; blank(); status.textContent = "Sign in to view live tracking."; panel.dataset.state = "idle"; panel.setAttribute("aria-busy", "false"); }
    };
  };
})();
