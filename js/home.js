(function () {
  var serverEl = document.getElementById("server");
  var pduEl = document.getElementById("pdu");
  var resultEl = document.getElementById("result");
  var SERVERS = [];
  var PDUS = [];

  function fill(sel, items, label) {
    while (sel.options.length > 1) sel.remove(1);
    for (var i = 0; i < items.length; i++) {
      var o = document.createElement("option");
      o.value = items[i].id;
      o.textContent = label(items[i]);
      sel.appendChild(o);
    }
  }

  function byId(list, id) {
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  function row(k, v) {
    return "<tr><td>" + k + "</td><td>" + v + "</td></tr>";
  }

  function serverLabel(s) {
    return s.display_name || (s.manufacturer + " " + s.model);
  }

  function pduLabel(p) {
    return p.manufacturer + " " + p.model;
  }

  function esc(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/"/g, "&quot;");
  }

  fetch("./data/equipment.json")
    .then(function (r) {
      if (!r.ok) throw new Error("catalog");
      return r.json();
    })
    .then(function (data) {
      SERVERS = data.servers || [];
      PDUS = data.pdus || [];
      fill(serverEl, SERVERS, serverLabel);
      fill(pduEl, PDUS, pduLabel);
    })
    .catch(function () {
      resultEl.hidden = false;
      resultEl.innerHTML = "<p>Catalog failed to load.</p>";
    });

  document.getElementById("form").addEventListener("submit", function (e) {
    e.preventDefault();
    var server = byId(SERVERS, serverEl.value);
    var pdu = byId(PDUS, pduEl.value);
    if (!server || !pdu) {
      resultEl.hidden = false;
      resultEl.innerHTML = "<p>Select both models.</p>";
      return;
    }
    var r = RackMatch.match(server, pdu);
    var html = "<p><b>" + (r.ok ? "Compatible" : "Not compatible") + "</b></p>";
    html += "<table>";
    html += row("Required cable type", r.cable);
    html += row("Connector", r.connector);
    html += row("Voltage / current", r.va);
    html += row("Locking option", r.lock);
    html += row(
      "Server source",
      "<a href=\"" + esc(server.source) + "\" target=\"_blank\" rel=\"noopener\">" + esc(server.source_title || server.source) + "</a>"
    );
    html += row(
      "PDU source",
      "<a href=\"" + esc(pdu.source) + "\" target=\"_blank\" rel=\"noopener\">" + esc(pdu.source_title || pdu.source) + "</a>"
    );
    html += "</table>";
    if (r.note) html += "<p class=\"warn\">" + r.note + "</p>";
    resultEl.hidden = false;
    resultEl.innerHTML = html;
  });

  document.getElementById("feedback").addEventListener("submit", function (e) {
    e.preventDefault();
    var status = document.getElementById("fb-status");
    if (document.getElementById("fb-company").value) {
      status.hidden = false;
      status.textContent = "Sent.";
      return;
    }
    var serverName = "";
    var pduName = "";
    if (serverEl && serverEl.value) {
      serverName = serverEl.options[serverEl.selectedIndex].textContent;
    }
    if (pduEl && pduEl.value) {
      pduName = pduEl.options[pduEl.selectedIndex].textContent;
    }
    var body = new URLSearchParams();
    body.set("entry.389100888", document.getElementById("fb-message").value);
    body.set("entry.1165317586", document.getElementById("fb-contact").value);
    body.set("entry.563611403", window.location.href);
    body.set("entry.770004551", serverName);
    body.set("entry.341373274", pduName);
    fetch("https://docs.google.com/forms/d/e/1FAIpQLSd7v9wX0zoeXfHHpWcfSLQpzAq0Ny8grFns6fhFI31FqM6cAw/formResponse", {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString()
    }).then(function () {
      document.getElementById("feedback").reset();
      status.hidden = false;
      status.textContent = "Sent.";
    }).catch(function () {
      status.hidden = false;
      status.textContent = "Send failed. Try again.";
    });
  });
})();
