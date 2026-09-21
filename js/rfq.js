(function () {
  var SERVERS = [];
  var PDUS = [];
  var rows = [];
  var lastFileName = "";
  var FORM =
    "https://docs.google.com/forms/d/e/1FAIpQLSd7v9wX0zoeXfHHpWcfSLQpzAq0Ny8grFns6fhFI31FqM6cAw/formResponse";

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/"/g, "&quot;");
  }

  function pduLabel(p) {
    return p.manufacturer + " " + p.model;
  }

  function serverLabel(s) {
    return s.display_name || s.manufacturer + " " + s.model;
  }

  function outletText(pdu) {
    var o = pdu.outlets || {};
    var parts = [];
    for (var k in o) {
      if (o.hasOwnProperty(k)) parts.push(o[k] + " × " + k);
    }
    return parts.join(", ");
  }

  function aliases(item) {
    var list = [];
    function add(v) {
      if (!v) return;
      var s = String(v).replace(/^\s+|\s+$/g, "");
      if (s && list.indexOf(s) === -1) list.push(s);
    }
    add(item.display_name);
    add((item.manufacturer || "") + " " + (item.model || ""));
    add(item.model);
    add(item.short);
    if (item.manufacturer && item.model) {
      add(item.manufacturer + " " + item.short);
    }
    if (item.id === "dell-r760-2400") {
      add("Dell PowerEdge R760");
      add("PowerEdge R760");
      add("Dell R760");
    }
    if (item.id === "dell-r650") {
      add("Dell PowerEdge R650");
      add("PowerEdge R650");
      add("Dell R650");
    }
    if (item.id === "hpe-dl380-g11") {
      add("HPE ProLiant DL380 Gen11");
      add("DL380 Gen11");
    }
    return list;
  }

  function escapeRe(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function qtyNear(text, start, end) {
    var before = text.slice(Math.max(0, start - 48), start);
    var after = text.slice(end, Math.min(text.length, end + 24));
    var m =
      before.match(/(\d{1,4})\s*[x×]\s*$/i) ||
      before.match(/(?:qty|quantity|pcs|pc)\s*[:#]?\s*(\d{1,4})\s*$/i);
    if (m) return parseInt(m[1], 10);
    m = after.match(/^\s*[x×]\s*(\d{1,4})\b/i);
    if (m) return parseInt(m[1], 10);
    return 1;
  }

  function overlaps(used, start, end) {
    for (var i = 0; i < used.length; i++) {
      if (start < used[i][1] && end > used[i][0]) return true;
    }
    return false;
  }

  function findCatalogHits(text) {
    var used = [];
    var hits = [];
    var catalog = [];
    var i;
    for (i = 0; i < SERVERS.length; i++) catalog.push({ kind: "server", item: SERVERS[i] });
    for (i = 0; i < PDUS.length; i++) catalog.push({ kind: "pdu", item: PDUS[i] });

    var needles = [];
    for (i = 0; i < catalog.length; i++) {
      var al = aliases(catalog[i].item);
      for (var a = 0; a < al.length; a++) {
        needles.push({
          kind: catalog[i].kind,
          item: catalog[i].item,
          needle: al[a]
        });
      }
    }
    needles.sort(function (x, y) {
      return y.needle.length - x.needle.length;
    });

    for (i = 0; i < needles.length; i++) {
      var n = needles[i];
      var re = new RegExp("\\b" + escapeRe(n.needle).replace(/\s+/g, "\\s+") + "\\b", "ig");
      var m;
      while ((m = re.exec(text))) {
        var start = m.index;
        var end = start + m[0].length;
        if (overlaps(used, start, end)) continue;
        used.push([start, end]);
        hits.push({
          kind: n.kind,
          item: n.item,
          qty: qtyNear(text, start, end)
        });
      }
    }
    return { hits: hits, used: used };
  }

  function findUnknown(text, used) {
    var out = [];
    var re =
      /(\d{1,4})\s*[x×]\s+((?:Dell|HPE|HP|Lenovo|Supermicro|Cisco|NVIDIA|Juniper|Arista|APC|Eaton|Raritan|Schneider|NetApp|IBM)(?:[\t ]+[A-Za-z0-9._\/-]+){0,8}?)(?=\s+\d{1,4}\s*[x×]|\s*$|[,;\n])/gi;
    var m;
    while ((m = re.exec(text))) {
      var start = m.index;
      var end = start + m[0].length;
      if (overlaps(used, start, end)) continue;
      var name = m[2].replace(/\s+/g, " ").replace(/^\s+|\s+$/g, "");
      used.push([start, end]);
      out.push({
        qty: parseInt(m[1], 10),
        name: name
      });
    }
    return out;
  }

  function pduAlternatives(server) {
    var names = [];
    for (var i = 0; i < PDUS.length; i++) {
      var r = RackMatch.match(server, PDUS[i]);
      if (r && r.ok) names.push(pduLabel(PDUS[i]));
    }
    return names;
  }

  function otherPdus(exceptId) {
    var names = [];
    for (var i = 0; i < PDUS.length; i++) {
      if (PDUS[i].id !== exceptId) names.push(pduLabel(PDUS[i]));
    }
    return names;
  }

  function otherServers(exceptId, inlet) {
    var names = [];
    for (var i = 0; i < SERVERS.length; i++) {
      if (SERVERS[i].id === exceptId) continue;
      if (inlet && RackMatch.inletOf(SERVERS[i]) !== inlet) continue;
      names.push(serverLabel(SERVERS[i]));
    }
    return names;
  }

  function guessType(name) {
    var n = name.toLowerCase();
    if (/\bpdu\b|apc|raritan|eaton|netshelter/.test(n)) return "pdu";
    if (/switch|nexus|catalyst|arista|juniper/.test(n)) return "switch";
    if (/storage|netapp|powervault|isilon/.test(n)) return "storage";
    return "server";
  }

  function splitMfrModel(name) {
    var parts = name.split(/\s+/);
    if (parts.length < 2) return { manufacturer: "", model: name };
    return { manufacturer: parts[0], model: parts.slice(1).join(" ") };
  }

  function buildRows(text) {
    var found = findCatalogHits(text);
    var unknown = findUnknown(text, found.used);
    var out = [];
    var catalogPdusInSpec = [];
    var i;
    for (i = 0; i < found.hits.length; i++) {
      if (found.hits[i].kind === "pdu") catalogPdusInSpec.push(found.hits[i].item);
    }

    for (i = 0; i < found.hits.length; i++) {
      var hit = found.hits[i];
      var item = hit.item;
      var req = hit.qty + " × " + (hit.kind === "pdu" ? pduLabel(item) : serverLabel(item));
      var compliance = "";
      var alt = "";
      var needs = "No";
      var reason = "";

      if (hit.kind === "server") {
        var inlet = RackMatch.inletOf(item);
        compliance =
          "In catalog. PSU inlet " +
          inlet +
          ". Voltage " +
          RackMatch.volt(item) +
          ". Current " +
          RackMatch.amp(item) +
          ".";
        if (item.pair_note) {
          compliance += " " + item.pair_note;
          needs = "Yes";
          reason = "Catalog nameplate note";
        }
        if (item.nameplate_note) {
          needs = "Yes";
          reason = reason || "Catalog nameplate note";
        }
        var alts = otherServers(item.id, inlet);
        var pduAlts = pduAlternatives(item);
        var altParts = [];
        if (alts.length) altParts.push("Other catalog servers with the same inlet: " + alts.join("; "));
        if (pduAlts.length) altParts.push("Catalog PDUs that match this inlet: " + pduAlts.join("; "));
        alt = altParts.length ? altParts.join(". ") : "None in this catalog";
        if (catalogPdusInSpec.length) {
          var notes = [];
          for (var p = 0; p < catalogPdusInSpec.length; p++) {
            var m = RackMatch.match(item, catalogPdusInSpec[p]);
            notes.push(
              pduLabel(catalogPdusInSpec[p]) + ": " + (m.ok ? "Compatible" : "Not compatible") + (m.note ? " (" + m.note + ")" : "")
            );
            if (!m.ok) {
              needs = "Yes";
              reason = "PDU in this spec is not a standard match";
            }
          }
          compliance += " Spec PDUs: " + notes.join("; ") + ".";
        }
        out.push({
          requirement: req,
          suggested: serverLabel(item),
          compliance: compliance,
          alternative: alt,
          needs: needs,
          needs_reason: reason,
          confirm: needs !== "Yes",
          bom: {
            eq_type: item.equipment_type || "server",
            catalog_id: item.id,
            manufacturer: item.manufacturer,
            model: item.model,
            qty: hit.qty,
            u_pos: "",
            inlet: "",
            wattage: item.id === "dell-r760-2400" ? "2400 W (catalog)" : "",
            psu_count: "2",
            pdu_id: "",
            feed: "",
            voltage: "",
            current: ""
          }
        });
      } else {
        compliance =
          "In catalog. Outlets " +
          outletText(item) +
          ". Voltage " +
          (item.voltage || "") +
          ". Current " +
          (item.current || "") +
          ".";
        alt = otherPdus(item.id).join("; ") || "None in this catalog";
        out.push({
          requirement: req,
          suggested: pduLabel(item),
          compliance: compliance,
          alternative: alt,
          needs: "No",
          needs_reason: "",
          confirm: true,
          bom: {
            eq_type: "pdu",
            catalog_id: item.id,
            manufacturer: item.manufacturer,
            model: item.model,
            qty: hit.qty,
            u_pos: "",
            inlet: "",
            wattage: "",
            psu_count: "0",
            pdu_id: "",
            feed: "",
            voltage: "",
            current: ""
          }
        });
      }
    }

    for (i = 0; i < unknown.length; i++) {
      var u = unknown[i];
      var sm = splitMfrModel(u.name);
      var t = guessType(u.name);
      out.push({
        requirement: u.qty + " × " + u.name,
        suggested: "Not in catalog",
        compliance: "Needs verification. This model is not in the RackMatch catalog.",
        alternative: "None from catalog",
        needs: "Yes",
        needs_reason: "Unknown model",
        confirm: false,
        bom: {
          eq_type: t,
          catalog_id: "",
          manufacturer: sm.manufacturer,
          model: sm.model,
          qty: u.qty,
          u_pos: "",
          inlet: "",
          wattage: "",
          psu_count: t === "pdu" ? "0" : "",
          pdu_id: "",
          feed: "",
          voltage: "",
          current: ""
        }
      });
    }

    if (!out.length) {
      out.push({
        requirement: "No catalog models or qty × vendor lines found",
        suggested: "Not in catalog",
        compliance: "Needs verification. Paste a list with model names from the spec.",
        alternative: "None from catalog",
        needs: "Yes",
        needs_reason: "Nothing extracted",
        confirm: false,
        bom: null
      });
    }
    return out;
  }

  function catalogFields() {
    var servers = [];
    var pdus = [];
    for (var i = 0; i < rows.length; i++) {
      var b = rows[i].bom;
      if (!b || !b.catalog_id) continue;
      var label = ((b.manufacturer || "") + " " + (b.model || "")).replace(/^\s+|\s+$/g, "");
      if (b.eq_type === "pdu") pdus.push(label);
      else servers.push(label);
    }
    return {
      server: servers.join("; ").slice(0, 200) || "rfq",
      pdu: pdus.join("; ").slice(0, 200) || "rfq-log"
    };
  }

  function rowLogLine(r) {
    return (
      r.requirement +
      " | " +
      r.suggested +
      " | needs=" +
      r.needs +
      (r.needs_reason ? " (" + r.needs_reason + ")" : "")
    );
  }

  function postRfqLog(kind, extra) {
    var fields = catalogFields();
    var lines = [
      kind,
      "File: " + (lastFileName || "(pasted text)"),
      "Chars: " + extra.chars,
      "Rows: " + rows.length
    ];
    var max = Math.min(rows.length, 20);
    for (var i = 0; i < max; i++) lines.push(rowLogLine(rows[i]));
    if (rows.length > 20) lines.push("(" + (rows.length - 20) + " more rows not listed)");
    if (extra.note) lines.push(extra.note);
    var body = new URLSearchParams();
    body.set("entry.389100888", lines.join("\n").slice(0, 8000));
    body.set("entry.1165317586", "");
    body.set("entry.563611403", window.location.href);
    body.set("entry.770004551", fields.server);
    body.set("entry.341373274", fields.pdu);
    return fetch(FORM, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString()
    });
  }

  function render() {
    var tbody = document.getElementById("rfq-rows");
    tbody.innerHTML = "";
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      var tr = document.createElement("tr");
      var needsCell = r.needs === "Yes" ? "Yes" + (r.needs_reason ? " (" + r.needs_reason + ")" : "") : "No";
      tr.innerHTML =
        "<td><input type=\"checkbox\" data-i=\"" +
        i +
        "\"" +
        (r.confirm ? " checked" : "") +
        (r.bom ? "" : " disabled") +
        "></td><td>" +
        esc(r.requirement) +
        "</td><td>" +
        esc(r.suggested) +
        "</td><td>" +
        esc(r.compliance) +
        "</td><td>" +
        esc(r.alternative) +
        "</td><td>" +
        esc(needsCell) +
        "</td>";
      tbody.appendChild(tr);
    }
    document.getElementById("rfq-result").hidden = false;
  }

  function loadPdfJs() {
    return new Promise(function (resolve, reject) {
      if (window.pdfjsLib) return resolve(window.pdfjsLib);
      var s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
      s.onload = function () {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc =
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
        resolve(window.pdfjsLib);
      };
      s.onerror = function () {
        reject(new Error("pdf.js failed to load"));
      };
      document.head.appendChild(s);
    });
  }

  function pdfToText(buf) {
    return loadPdfJs().then(function (pdfjsLib) {
      return pdfjsLib.getDocument({ data: buf }).promise;
    }).then(function (doc) {
      var n = doc.numPages;
      var chain = Promise.resolve("");
      var p;
      for (p = 1; p <= n; p++) {
        (function (pageNo) {
          chain = chain.then(function (acc) {
            return doc.getPage(pageNo).then(function (page) {
              return page.getTextContent().then(function (tc) {
                var parts = [];
                for (var i = 0; i < tc.items.length; i++) parts.push(tc.items[i].str);
                return acc + "\n" + parts.join(" ");
              });
            });
          });
        })(p);
      }
      return chain;
    });
  }

  function extract() {
    var text = document.getElementById("spec-text").value || "";
    if (!text.replace(/\s/g, "")) {
      document.getElementById("extract-status").textContent = "Paste text or upload a file first.";
      return;
    }
    rows = buildRows(text);
    render();
    document.getElementById("extract-status").textContent =
      "Extracted " + rows.length + " row(s) from the catalog match. No prices or stock.";
    postRfqLog("RFQ EXTRACT", { chars: text.length }).catch(function () {});
  }

  document.getElementById("spec-file").addEventListener("change", function (e) {
    var f = e.target.files && e.target.files[0];
    var status = document.getElementById("file-status");
    if (!f) return;
    lastFileName = f.name || "";
    var name = f.name.toLowerCase();
    if (name.slice(-4) === ".pdf" || f.type === "application/pdf") {
      status.textContent = "Reading PDF…";
      var reader = new FileReader();
      reader.onload = function () {
        pdfToText(new Uint8Array(reader.result))
          .then(function (t) {
            document.getElementById("spec-text").value = t.replace(/^\s+|\s+$/g, "");
            status.textContent = t.replace(/\s/g, "")
              ? "PDF text loaded. Review it, then extract."
              : "PDF had no extractable text. Paste the spec as text.";
          })
          .catch(function () {
            status.textContent = "Could not read this PDF. Paste the spec as text.";
          });
      };
      reader.readAsArrayBuffer(f);
      return;
    }
    var tr = new FileReader();
    tr.onload = function () {
      document.getElementById("spec-text").value = String(tr.result || "");
      status.textContent = "Text file loaded.";
    };
    tr.readAsText(f);
  });

  document.getElementById("btn-extract").addEventListener("click", extract);

  document.getElementById("btn-to-bom").addEventListener("click", function () {
    var boxes = document.querySelectorAll("#rfq-rows input[type=checkbox]");
    var lines = [];
    for (var i = 0; i < boxes.length; i++) {
      if (!boxes[i].checked) continue;
      var idx = parseInt(boxes[i].getAttribute("data-i"), 10);
      if (rows[idx] && rows[idx].bom) lines.push(rows[idx].bom);
    }
    var st = document.getElementById("bom-status");
    if (!lines.length) {
      st.textContent = "Check at least one row that can go to the BOM Engine.";
      return;
    }
    try {
      sessionStorage.setItem("rackmatch_rfq_bom", JSON.stringify(lines));
    } catch (err) {
      st.textContent = "Could not store the BOM lines in this browser.";
      return;
    }
    var text = document.getElementById("spec-text").value || "";
    st.textContent = "Sending log, then opening BOM…";
    postRfqLog("RFQ TO BOM", { chars: text.length, note: "Confirmed to BOM: " + lines.length })
      .then(function () {
        window.location.href = "../bom/";
      })
      .catch(function () {
        window.location.href = "../bom/";
      });
  });

  fetch("../data/equipment.json")
    .then(function (r) {
      if (!r.ok) throw new Error("catalog");
      return r.json();
    })
    .then(function (data) {
      SERVERS = data.servers || [];
      PDUS = data.pdus || [];
    })
    .catch(function () {
      document.getElementById("extract-status").textContent = "Catalog failed to load.";
    });
})();
