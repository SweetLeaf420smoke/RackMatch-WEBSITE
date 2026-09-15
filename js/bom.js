(function () {
  var CATALOG = { servers: [], pdus: [] };
  var lines = [];
  var lastRows = [];
  var lastSummary = null;

  function byId(list, id) {
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/"/g, "&quot;");
  }

  function fillSelect(sel, items, labelFn, extra) {
    sel.innerHTML = "";
    var empty = document.createElement("option");
    empty.value = "";
    empty.textContent = extra || "— select —";
    sel.appendChild(empty);
    for (var i = 0; i < items.length; i++) {
      var o = document.createElement("option");
      o.value = items[i].id;
      o.textContent = labelFn(items[i]);
      sel.appendChild(o);
    }
  }

  function serverLabel(s) {
    return s.display_name || s.manufacturer + " " + s.model;
  }

  function pduLabel(p) {
    return p.manufacturer + " " + p.model;
  }

  function parseIntSafe(v, d) {
    var n = parseInt(v, 10);
    return isNaN(n) ? d : n;
  }

  function demoGauge(inlet) {
    if (inlet === "C20") return "14 AWG (sample, typical C19–C20 class)";
    if (inlet === "C14") return "18 AWG (sample, typical C13–C14 class)";
    return "Not assigned";
  }

  function demoSku(inlet) {
    if (inlet === "C20") return "Not in catalog (C19–C20 jumper)";
    if (inlet === "C14") return "Not in catalog (C13–C14 jumper)";
    return "Not in catalog";
  }

  function connectorPair(inlet, match) {
    if (!inlet) return { a: "Unknown", b: "Unknown" };
    if (match && match.cable === "IEC C13–C14 jumper") return { a: "C14", b: "C13" };
    if (match && match.cable === "IEC C19–C20 jumper") return { a: "C20", b: "C19" };
    if (match && match.cable === "IEC C13–C20 jumper") return { a: "C14", b: "C19" };
    return { a: inlet, b: "Unknown" };
  }

  function classify(device, pdu, inlet, match, inletFromCatalog) {
    var warnings = [];
    var missing = 0;
    if (!device) {
      warnings.push("Unknown equipment model");
      warnings.push("Manual verification required");
      missing += 1;
    }
    if (!inlet) {
      warnings.push("PSU information missing");
      warnings.push("Connector cannot be confirmed");
      missing += 1;
    }
    if (!pdu) {
      warnings.push("PDU model not in catalog");
      missing += 1;
    }
    if (match && match.ok === false) {
      warnings.push("PDU outlet incompatible");
      if (match.note) warnings.push(match.note);
      return { status: "Incompatible", warnings: warnings, missing: missing };
    }
    if (match && match.note && match.cable === "IEC C13–C20 jumper") {
      warnings.push("Cable rating insufficient unless this PSU is 10 A class");
      warnings.push("Manual verification required");
      return { status: "Needs verification", warnings: warnings, missing: missing };
    }
    if (!device || !pdu || !inlet) {
      return { status: "Needs verification", warnings: warnings, missing: missing };
    }
    if (inletFromCatalog === false) {
      warnings.push("Inlet taken from the form, not from the catalog nameplate");
      return { status: "Likely compatible", warnings: warnings, missing: missing };
    }
    return { status: "Verified", warnings: warnings, missing: missing };
  }

  function psuCountFor(line, device) {
    var n = parseIntSafe(line.psu_count, 0);
    if (n > 0) return Math.min(n, 8);
    if (line.eq_type === "pdu") return 0;
    if (device) return 2;
    return 1;
  }

  function resolveDevice(line) {
    if (line.catalog_id) return byId(CATALOG.servers, line.catalog_id);
    return null;
  }

  function resolvePdu(line, rackPdus, feed) {
    if (line.pdu_id) return byId(CATALOG.pdus, line.pdu_id);
    if (rackPdus.length === 0) return null;
    if (feed === "B" && rackPdus.length > 1) return rackPdus[1];
    return rackPdus[0];
  }

  function buildRackPdus(allLines) {
    var out = [];
    for (var i = 0; i < allLines.length; i++) {
      var line = allLines[i];
      if (line.eq_type !== "pdu") continue;
      var qty = Math.max(1, parseIntSafe(line.qty, 1));
      var pdu = line.catalog_id ? byId(CATALOG.pdus, line.catalog_id) : null;
      for (var q = 0; q < qty; q++) {
        out.push({
          instance: pduLabelFake(line, pdu) + (qty > 1 ? " #" + (q + 1) : ""),
          pdu: pdu,
          line: line
        });
      }
    }
    return out;
  }

  function pduLabelFake(line, pdu) {
    if (pdu) return pdu.manufacturer + " " + pdu.model;
    var m = (line.manufacturer || "") + " " + (line.model || "");
    return m.replace(/^\s+|\s+$/g, "") || "PDU (unspecified)";
  }

  function deviceName(line, device) {
    if (device) return device.display_name || device.manufacturer + " " + device.model;
    var m = (line.manufacturer || "") + " " + (line.model || "");
    return m.replace(/^\s+|\s+$/g, "") || "Unknown device";
  }

  function generate(allLines) {
    var rows = [];
    var rackPdus = buildRackPdus(allLines);
    var deviceCount = 0;
    var pduCount = 0;
    var verified = 0;
    var warnCount = 0;
    var missing = 0;
    var feedMap = {};

    for (var i = 0; i < allLines.length; i++) {
      var line = allLines[i];
      var qty = Math.max(1, parseIntSafe(line.qty, 1));
      if (line.eq_type === "pdu") {
        pduCount += qty;
        continue;
      }
      deviceCount += qty;
      var device = resolveDevice(line);
      var inletCatalog = device ? RackMatch.inletOf(device) : "";
      var inlet = line.inlet || inletCatalog;
      var inletFromCatalog = !!(inletCatalog && (!line.inlet || line.inlet === inletCatalog));
      var psuN = psuCountFor(line, device);
      var uBase = parseIntSafe(line.u_pos, 0);

      for (var q = 0; q < qty; q++) {
        var unitLabel = deviceName(line, device);
        if (qty > 1) unitLabel += " #" + (q + 1);
        var uPos = uBase ? uBase + q : 0;
        var feedsForUnit = [];

        for (var p = 0; p < Math.max(psuN, 1); p++) {
          var feed;
          if (line.feed === "A" || line.feed === "B") feed = line.feed;
          else if (psuN >= 2) feed = p === 0 ? "A" : "B";
          else feed = "A";

          var pduWrap = resolvePdu(line, rackPdus, feed);
          var pdu = pduWrap ? pduWrap.pdu : (line.pdu_id ? byId(CATALOG.pdus, line.pdu_id) : null);
          var pduName = pduWrap
            ? pduWrap.instance
            : pdu
              ? pdu.manufacturer + " " + pdu.model
              : line.pdu_id || "PDU not assigned";

          var fakeServer = device
            ? device
            : {
                psu_inlet: inlet,
                voltage: line.voltage || "",
                current: line.current || "",
                source: "",
                source_title: ""
              };
          var fakePdu = pdu || { outlets: {}, voltage: "", current: "" };
          var match = inlet && pdu ? RackMatch.match(fakeServer, fakePdu) : null;
          var cls = classify(device, pdu, inlet, match, inletFromCatalog);
          if (!line.wattage && device && device.id === "dell-r760-2400") {
            /* catalog already states 2400 W PSU */
          } else if (!line.wattage && !device) {
            cls.warnings.push("PSU wattage not provided");
            cls.missing += 1;
            if (cls.status === "Verified") cls.status = "Needs verification";
          }

          var pair = connectorPair(inlet, match);
          var voltage = device ? RackMatch.volt(device) : line.voltage || "Not in catalog";
          var current = device ? RackMatch.amp(device) : line.current || "Not in catalog";
          var psuLabel = psuN >= 2 ? "PSU " + (p + 1) : line.wattage || (device && device.id === "dell-r760-2400" ? "2400 W PSU" : "PSU");
          var label = "R" + (uPos || 0) + "-S" + pad(q + 1) + "-" + feed;
          var notes = cls.warnings.slice();
          notes.push("Recommended length 1.0 m is a sample value, not measured from a rack drawing.");
          notes.push("A/B colour (blue/red) is a sample kit convention, not a vendor SKU.");
          if (device && device.pair_note) notes.push(device.pair_note);
          if (match && match.note) notes.push(match.note);

          if (cls.status === "Verified") verified += 1;
          if (cls.warnings.length) warnCount += 1;
          missing += cls.missing;

          feedsForUnit.push(feed + "|" + pduName);

          rows.push({
            source: unitLabel,
            psu: psuLabel,
            dest: pduName,
            connector_a: pair.a,
            connector_b: pair.b,
            voltage: voltage || "Not in catalog",
            current: current || "Not in catalog",
            gauge: demoGauge(inlet),
            qty: 1,
            length: "1.0 m (sample)",
            feed: feed,
            colour: feed === "B" ? "Red (sample)" : "Blue (sample)",
            label: label,
            status: cls.status,
            notes: notes.join(" "),
            sku: demoSku(inlet),
            warnings: cls.warnings
          });
        }

        var key = unitLabel;
        if (!feedMap[key]) feedMap[key] = [];
        for (var f = 0; f < feedsForUnit.length; f++) feedMap[key].push(feedsForUnit[f]);
      }
    }

    for (var k in feedMap) {
      if (!feedMap.hasOwnProperty(k)) continue;
      var list = feedMap[k];
      if (list.length < 2) continue;
      var destSame = true;
      var firstDest = list[0].split("|")[1];
      var firstFeed = list[0].split("|")[0];
      var feedSame = true;
      for (var x = 1; x < list.length; x++) {
        var parts = list[x].split("|");
        if (parts[1] !== firstDest) destSame = false;
        if (parts[0] !== firstFeed) feedSame = false;
      }
      var same = destSame || feedSame;
      if (same && list[0].indexOf("|") !== -1) {
        for (var r = 0; r < rows.length; r++) {
          if (rows[r].source === k) {
            rows[r].warnings.push("Redundant PSU connected to same feed");
            rows[r].notes += " Redundant PSU connected to same feed.";
            if (rows[r].status === "Verified") rows[r].status = "Needs verification";
            warnCount += 1;
          }
        }
      }
    }

    var used = {};
    for (var u = 0; u < rows.length; u++) {
      var dest = rows[u].dest;
      var rec = rows[u].connector_b;
      if (!used[dest]) used[dest] = {};
      used[dest][rec] = (used[dest][rec] || 0) + 1;
    }
    for (var d = 0; d < rackPdus.length; d++) {
      var inst = rackPdus[d];
      if (!inst.pdu || !inst.pdu.outlets) continue;
      var name = inst.instance;
      var demand = used[name] || {};
      for (var ot in demand) {
        if (!demand.hasOwnProperty(ot)) continue;
        var have = inst.pdu.outlets[ot] || 0;
        if (demand[ot] > have && ot !== "Unknown") {
          for (var rr = 0; rr < rows.length; rr++) {
            if (rows[rr].dest === name && rows[rr].connector_b === ot) {
              rows[rr].warnings.push(
                "PDU outlet count insufficient: " + demand[ot] + " × " + ot + " needed, catalog lists " + have
              );
              rows[rr].notes +=
                " PDU outlet count insufficient: " + demand[ot] + " × " + ot + " needed, catalog lists " + have + ".";
              warnCount += 1;
            }
          }
        }
      }
    }

    verified = 0;
    warnCount = 0;
    for (var vv = 0; vv < rows.length; vv++) {
      if (rows[vv].status === "Verified") verified += 1;
      if (rows[vv].warnings.length) warnCount += 1;
    }

    lastRows = rows;
    lastSummary = {
      devices: deviceCount,
      pdus: pduCount,
      cords: rows.length,
      verified: verified,
      warnings: warnCount,
      missing: missing
    };
    return { rows: rows, summary: lastSummary };
  }

  function pad(n) {
    return n < 10 ? "0" + n : String(n);
  }

  function renderLines() {
    var tbody = document.getElementById("bom-lines");
    tbody.innerHTML = "";
    if (!lines.length) {
      tbody.innerHTML = "<tr><td colspan=\"10\">No equipment yet.</td></tr>";
      return;
    }
    for (var i = 0; i < lines.length; i++) {
      var L = lines[i];
      var tr = document.createElement("tr");
      tr.innerHTML =
        "<td>" +
        esc(L.eq_type) +
        "</td><td>" +
        esc(L.manufacturer) +
        "</td><td>" +
        esc(L.model) +
        "</td><td>" +
        esc(L.qty) +
        "</td><td>" +
        esc(L.u_pos || "") +
        "</td><td>" +
        esc(L.inlet || "") +
        "</td><td>" +
        esc(L.wattage || "") +
        "</td><td>" +
        esc(L.pdu_id || "") +
        "</td><td>" +
        esc(L.feed || "A/B") +
        "</td><td><button type=\"button\" data-rm=\"" +
        i +
        "\">Remove</button></td>";
      tbody.appendChild(tr);
    }
  }

  function renderResult(data) {
    var box = document.getElementById("bom-result");
    var s = data.summary;
    var html = "<h2>Rack Summary</h2>";
    html += "<table>";
    html += "<tr><td>Devices</td><td>" + s.devices + "</td></tr>";
    html += "<tr><td>PDUs</td><td>" + s.pdus + "</td></tr>";
    html += "<tr><td>Required power cords</td><td>" + s.cords + "</td></tr>";
    html += "<tr><td>Verified connections</td><td>" + s.verified + "</td></tr>";
    html += "<tr><td>Warnings</td><td>" + s.warnings + "</td></tr>";
    html += "<tr><td>Missing data</td><td>" + s.missing + "</td></tr>";
    html += "</table>";
    html += "<h2>Power connectivity BOM</h2>";
    html += "<p>Statuses: Verified (catalog inlet + catalog PDU + standard pair). Likely compatible (inlet from the form). Needs verification (missing or unknown data). Incompatible (outlet set cannot feed this inlet). Length, colour, label and gauge are sample kit fields, not vendor-checked SKUs.</p>";
    html += "<div class=\"table-wrap\"><table class=\"bom-table\"><thead><tr>";
    var heads = [
      "Source",
      "PSU",
      "Destination PDU",
      "Connector A",
      "Connector B",
      "Voltage",
      "Current",
      "Gauge",
      "Qty",
      "Length",
      "Feed",
      "Colour",
      "Label",
      "Status",
      "SKU",
      "Notes / warnings"
    ];
    for (var h = 0; h < heads.length; h++) html += "<th>" + heads[h] + "</th>";
    html += "</tr></thead><tbody>";
    for (var i = 0; i < data.rows.length; i++) {
      var r = data.rows[i];
      html += "<tr class=\"st-" + r.status.toLowerCase().replace(/\s/g, "-") + "\">";
      html += "<td>" + esc(r.source) + "</td>";
      html += "<td>" + esc(r.psu) + "</td>";
      html += "<td>" + esc(r.dest) + "</td>";
      html += "<td>" + esc(r.connector_a) + "</td>";
      html += "<td>" + esc(r.connector_b) + "</td>";
      html += "<td>" + esc(r.voltage) + "</td>";
      html += "<td>" + esc(r.current) + "</td>";
      html += "<td>" + esc(r.gauge) + "</td>";
      html += "<td>" + esc(r.qty) + "</td>";
      html += "<td>" + esc(r.length) + "</td>";
      html += "<td>" + esc(r.feed) + "</td>";
      html += "<td>" + esc(r.colour) + "</td>";
      html += "<td>" + esc(r.label) + "</td>";
      html += "<td>" + esc(r.status) + "</td>";
      html += "<td>" + esc(r.sku) + "</td>";
      html += "<td>" + esc(r.notes) + "</td>";
      html += "</tr>";
    }
    html += "</tbody></table></div>";
    html += "<h2>Get this rack as a complete cable kit</h2>";
    html += "<p>We can supply the complete set of rack power cables with the correct lengths, A/B colours, labels and connector types.</p>";
    html += "<p><button type=\"button\" id=\"btn-csv\">Export BOM</button></p>";
    box.innerHTML = html;
    box.hidden = false;
    document.getElementById("quote-block").hidden = false;
    document.getElementById("btn-csv").addEventListener("click", exportCsv);
  }

  function csvCell(v) {
    var s = String(v == null ? "" : v);
    if (/[",\n]/.test(s)) return "\"" + s.replace(/"/g, "\"\"") + "\"";
    return s;
  }

  function exportCsv() {
    var cols = [
      "source",
      "psu",
      "dest",
      "connector_a",
      "connector_b",
      "voltage",
      "current",
      "gauge",
      "qty",
      "length",
      "feed",
      "colour",
      "label",
      "status",
      "sku",
      "notes"
    ];
    var out = [cols.join(",")];
    for (var i = 0; i < lastRows.length; i++) {
      var r = lastRows[i];
      var row = [];
      for (var c = 0; c < cols.length; c++) row.push(csvCell(r[cols[c]]));
      out.push(row.join(","));
    }
    var blob = new Blob([out.join("\n")], { type: "text/csv;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "rackmatch-power-cable-bom.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function exampleRack() {
    lines = [
      {
        eq_type: "server",
        catalog_id: "dell-r760-2400",
        manufacturer: "Dell",
        model: "PowerEdge R760",
        qty: 12,
        u_pos: "1",
        inlet: "",
        wattage: "2400 W (catalog)",
        psu_count: "2",
        pdu_id: "",
        feed: "",
        voltage: "",
        current: ""
      },
      {
        eq_type: "switch",
        catalog_id: "",
        manufacturer: "Cisco",
        model: "rack switch (model not in catalog)",
        qty: 2,
        u_pos: "25",
        inlet: "",
        wattage: "",
        psu_count: "2",
        pdu_id: "",
        feed: "",
        voltage: "",
        current: ""
      },
      {
        eq_type: "pdu",
        catalog_id: "apc-ap8853",
        manufacturer: "APC",
        model: "AP8853",
        qty: 2,
        u_pos: "",
        inlet: "",
        wattage: "",
        psu_count: "0",
        pdu_id: "",
        feed: "",
        voltage: "",
        current: ""
      }
    ];
    renderLines();
    renderResult(generate(lines));
    document.getElementById("bom-result").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function addFromForm() {
    var catalogId = document.getElementById("eq-catalog").value;
    var type = document.getElementById("eq-type").value;
    var device = catalogId ? byId(CATALOG.servers, catalogId) : null;
    var pduCat = catalogId && type === "pdu" ? byId(CATALOG.pdus, catalogId) : null;
    var manufacturer = document.getElementById("eq-mfr").value;
    var model = document.getElementById("eq-model").value;
    if (device) {
      manufacturer = device.manufacturer;
      model = device.model;
      type = device.equipment_type || "server";
    }
    if (pduCat) {
      manufacturer = pduCat.manufacturer;
      model = pduCat.model;
      type = "pdu";
    }
    if (!manufacturer || !model) {
      document.getElementById("add-status").textContent = "Manufacturer and model are required.";
      return;
    }
    lines.push({
      eq_type: type,
      catalog_id: catalogId,
      manufacturer: manufacturer,
      model: model,
      qty: parseIntSafe(document.getElementById("eq-qty").value, 1),
      u_pos: document.getElementById("eq-u").value,
      inlet: document.getElementById("eq-inlet").value,
      wattage: document.getElementById("eq-watt").value,
      psu_count: document.getElementById("eq-psu-count").value,
      pdu_id: document.getElementById("eq-pdu").value,
      feed: document.getElementById("eq-feed").value,
      voltage: "",
      current: ""
    });
    document.getElementById("add-status").textContent = "Added.";
    renderLines();
  }

  function onCatalogChange() {
    var id = document.getElementById("eq-catalog").value;
    var s = byId(CATALOG.servers, id);
    var p = byId(CATALOG.pdus, id);
    if (s) {
      document.getElementById("eq-type").value = s.equipment_type || "server";
      document.getElementById("eq-mfr").value = s.manufacturer;
      document.getElementById("eq-model").value = s.model;
      document.getElementById("eq-inlet").value = RackMatch.inletOf(s) || "";
      document.getElementById("eq-watt").value = s.id === "dell-r760-2400" ? "2400 W" : "";
    } else if (p) {
      document.getElementById("eq-type").value = "pdu";
      document.getElementById("eq-mfr").value = p.manufacturer;
      document.getElementById("eq-model").value = p.model;
      document.getElementById("eq-inlet").value = "";
      document.getElementById("eq-watt").value = "";
    }
  }

  fetch("../data/equipment.json")
    .then(function (r) {
      if (!r.ok) throw new Error("catalog");
      return r.json();
    })
    .then(function (data) {
      CATALOG.servers = data.servers || [];
      CATALOG.pdus = data.pdus || [];
      fillSelect(document.getElementById("eq-catalog"), CATALOG.servers.concat(CATALOG.pdus), function (x) {
        return x.equipment_type === "pdu" || x.outlets ? "PDU: " + pduLabel(x) : "Server: " + serverLabel(x);
      }, "— catalog model (optional) —");
      fillSelect(document.getElementById("eq-pdu"), CATALOG.pdus, pduLabel, "— assign PDU (optional) —");
      renderLines();
      if (/[?&]example=1/.test(location.search)) exampleRack();
    })
    .catch(function () {
      document.getElementById("add-status").textContent = "Catalog failed to load.";
    });

  document.getElementById("eq-catalog").addEventListener("change", onCatalogChange);
  document.getElementById("btn-add").addEventListener("click", addFromForm);
  document.getElementById("btn-generate").addEventListener("click", function () {
    if (!lines.length) {
      document.getElementById("add-status").textContent = "Add equipment first, or load the example rack.";
      return;
    }
    renderResult(generate(lines));
  });
  document.getElementById("btn-example").addEventListener("click", exampleRack);
  document.getElementById("bom-lines").addEventListener("click", function (e) {
    var t = e.target;
    if (t && t.getAttribute("data-rm") != null) {
      lines.splice(parseInt(t.getAttribute("data-rm"), 10), 1);
      renderLines();
    }
  });

  document.getElementById("quote").addEventListener("submit", function (e) {
    e.preventDefault();
    var status = document.getElementById("quote-status");
    if (document.getElementById("q-hp").value) {
      status.hidden = false;
      status.textContent = "Sent.";
      return;
    }
    var msg = [
      "RACK KIT QUOTE",
      "Name: " + document.getElementById("q-name").value,
      "Company: " + document.getElementById("q-company").value,
      "Country: " + document.getElementById("q-country").value,
      "Rack quantity: " + document.getElementById("q-racks").value,
      "Target installation date: " + document.getElementById("q-date").value,
      "Notes: " + document.getElementById("q-notes").value,
      "BOM cords: " + (lastSummary ? lastSummary.cords : 0),
      "Verified: " + (lastSummary ? lastSummary.verified : 0),
      "Warnings: " + (lastSummary ? lastSummary.warnings : 0)
    ].join("\n");
    var body = new URLSearchParams();
    body.set("entry.389100888", msg);
    body.set("entry.1165317586", document.getElementById("q-email").value);
    body.set("entry.563611403", window.location.href);
    body.set("entry.770004551", "rack-bom");
    body.set("entry.341373274", "rack-kit-quote");
    fetch("https://docs.google.com/forms/d/e/1FAIpQLSd7v9wX0zoeXfHHpWcfSLQpzAq0Ny8grFns6fhFI31FqM6cAw/formResponse", {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString()
    })
      .then(function () {
        document.getElementById("quote").reset();
        status.hidden = false;
        status.textContent = "Sent.";
      })
      .catch(function () {
        status.hidden = false;
        status.textContent = "Send failed. Try again.";
      });
  });
})();
