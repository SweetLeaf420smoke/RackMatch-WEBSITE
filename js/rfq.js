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
          qty: qtyNear(text, start, end),
          start: start,
          end: end
        });
      }
    }
    return { hits: hits, used: used };
  }

  function findUnknownVendor(text, used) {
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

  function guessTypeFromName(name) {
    var n = (name || "").toLowerCase();
    if (/\bups\b|uninterruptible/.test(n)) return "ups";
    if (/\bpdu\b|apc|raritan|eaton|netshelter/.test(n)) return "pdu";
    if (/switch|nexus|catalyst|arista|juniper|\bcisco\b/.test(n)) return "switch";
    if (/storage|netapp|powervault|isilon/.test(n)) return "storage";
    if (/generator|genset/.test(n)) return "generator";
    if (/\bats\b|transfer switch/.test(n)) return "ats";
    return "server";
  }

  function splitMfrModel(name) {
    var parts = (name || "").split(/\s+/);
    if (parts.length < 2) return { manufacturer: "", model: name || "" };
    return { manufacturer: parts[0], model: parts.slice(1).join(" ") };
  }

  function isBatteryMultiplier(text, matchIndex, matchLen) {
    var rest = text.slice(matchIndex + matchLen).replace(/^\s+/, "");
    return /^\d{1,4}\s*V(?:DC)?\s*\d+(?:\.\d+)?\s*Ah/i.test(rest);
  }

  function findItemStarts(text) {
    var starts = [];
    function add(index) {
      if (index == null || index < 0) return;
      for (var i = 0; i < starts.length; i++) {
        if (Math.abs(starts[i] - index) <= 1) return;
      }
      starts.push(index);
    }
    function precededByQtyX(index) {
      return /\d{1,4}\s*[x×]\s*$/i.test(text.slice(Math.max(0, index - 14), index));
    }

    var m;
    var reQty = /(\d{1,4})\s*[x×]\s*/gi;
    while ((m = reQty.exec(text))) {
      if (isBatteryMultiplier(text, m.index, m[0].length)) continue;
      add(m.index);
    }

    var rePower = /(\d+(?:[.,]\d+)?)\s*(kVA|kW)\s+(UPS|PDU)s?\b/gi;
    while ((m = rePower.exec(text))) {
      if (precededByQtyX(m.index)) continue;
      add(m.index);
    }

    var reAmp = /(\d+(?:[.,]\d+)?)\s*A\s+(?:incomer\s+)?MCCBs?\b/gi;
    while ((m = reAmp.exec(text))) {
      if (precededByQtyX(m.index)) continue;
      add(m.index);
    }

    var reStand = /(?:^|[,\n;+]|\band\b)\s*(Type\s+(?:1|2|I|II)\s+SPD|SPD\b|multifunction\s+energy\s+meter|(?:multifunction\s+)?energy\s+meter)/gi;
    while ((m = reStand.exec(text))) {
      var inner = m[0].search(/Type\s+|SPD\b|multifunction|energy\s+meter/i);
      add(m.index + (inner < 0 ? 0 : inner));
    }

    starts.sort(function (a, b) {
      return a - b;
    });
    return starts;
  }

  function splitChunks(text) {
    var t = String(text || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    t = t.replace(/[•·]/g, "\n");
    var starts = findItemStarts(t);
    if (!starts.length) {
      var lineParts = [];
      var lines = t.split("\n");
      for (var i = 0; i < lines.length; i++) {
        var line = lines[i].replace(/^\s+|\s+$/g, "");
        if (!line) continue;
        var bits = line.split(/\s*[,;]\s*(?=\d{1,4}\s*[x×])/i);
        for (var b = 0; b < bits.length; b++) {
          var bit = bits[b].replace(/^\s+|\s+$/g, "");
          if (bit) lineParts.push(bit);
        }
      }
      return lineParts.length ? lineParts : [t.replace(/^\s+|\s+$/g, "")];
    }
    var parts = [];
    for (var s = 0; s < starts.length; s++) {
      var from = s === 0 ? 0 : starts[s];
      var to = s + 1 < starts.length ? starts[s + 1] : t.length;
      var chunk = t.slice(from, to).replace(/^\s*[,;+]+\s*|\s+$/g, "").replace(/^\band\s+/i, "");
      if (chunk) parts.push(chunk);
    }
    return parts;
  }

  function detectType(text) {
    var n = text.toLowerCase();
    if (/\buninterruptible power|\bups\b/.test(n)) return "ups";
    if (/\bpower distribution unit|\bpdu\b/.test(n)) return "pdu";
    if (/\bmccbs?\b|\bincomer\b|\boutgoing\b|\bbreaker\b/.test(n)) return "mccb";
    if (/\bspd\b|surge\s+protect/.test(n)) return "spd";
    if (/\benergy\s+meter|\bkwh\s+meter|\bmultifunction\s+meter/.test(n)) return "meter";
    if (/\bgenerator|\bgenset\b/.test(n)) return "generator";
    if (/\bautomatic transfer|\bats\b/.test(n)) return "ats";
    if (/\bstorage\b|\bsan\b|\bnas\b/.test(n)) return "storage";
    if (/\bswitch|\bnexus|\bcatalyst|\bcisco\b/.test(n)) return "switch";
    if (/\bserver|\bpoweredge|\bproliant|\bthinksystem\b/.test(n)) return "server";
    return "";
  }

  function parseChunk(chunk) {
    var rec = {
      source: chunk,
      qty: "",
      eq_type: "",
      power: "",
      voltage: "",
      input_voltage: "",
      output_voltage: "",
      phase: "",
      frequency: "",
      topology: "",
      battery: "",
      battery_qty: "",
      battery_voltage: "",
      battery_ah: "",
      backup: "",
      current_rating: "",
      efficiency: "",
      load_condition: "",
      manufacturer_pref: "",
      approved_equivalent: "",
      monitoring: "",
      installation: "",
      commissioning: "",
      maintenance_term: "",
      accessories: "",
      mandatory: [],
      optional: []
    };
    var body = chunk;

    var batt = body.match(/(\d{1,4})\s*[x×]\s*(\d{1,4})\s*V(?:DC)?\s*(\d+(?:\.\d+)?)\s*Ah/i);
    if (batt) {
      rec.battery_qty = batt[1];
      rec.battery_voltage = batt[2] + " V";
      rec.battery_ah = batt[3] + " Ah";
      body = body.replace(batt[0], " ");
    }

    var qtyM;
    var reQty = /(\d{1,4})\s*[x×]\s*/gi;
    while ((qtyM = reQty.exec(body))) {
      if (isBatteryMultiplier(body, qtyM.index, qtyM[0].length)) continue;
      rec.qty = parseInt(qtyM[1], 10);
      break;
    }
    if (rec.qty === "") {
      var q2 = body.match(/\b(?:qty|quantity)\s*[:#]?\s*(\d{1,4})\b/i);
      if (q2) rec.qty = parseInt(q2[1], 10);
    }

    rec.eq_type = detectType(chunk);

    var pm = body.match(/(\d+(?:[.,]\d+)?)\s*(kVA|kW|VA|W)\b/i);
    if (pm) rec.power = pm[1].replace(",", ".") + " " + pm[2];

    var amp = body.match(/(\d+(?:[.,]\d+)?)\s*A\b/i);
    if (amp && (rec.eq_type === "mccb" || rec.eq_type === "spd" || /\bmccb\b|\bincomer\b|\boutgoing\b/i.test(chunk))) {
      rec.current_rating = amp[1].replace(",", ".") + " A";
    }

    var inV = body.match(/\binput(?:\s+voltage)?\s*[:=]?\s*(\d{2,4}(?:\s*[\/-]\s*\d{2,4})?\s*V(?:AC|DC)?)/i);
    if (inV) rec.input_voltage = inV[1].replace(/\s+/g, " ");
    var outV = body.match(/\boutput(?:\s+voltage)?\s*[:=]?\s*(\d{2,4}(?:\s*[\/-]\s*\d{2,4})?\s*V(?:AC|DC)?)/i);
    if (outV) rec.output_voltage = outV[1].replace(/\s+/g, " ");
    if (!rec.input_voltage && !rec.output_voltage) {
      var vm = body.match(/(\d{2,4}(?:\s*[\/-]\s*\d{2,4})?)\s*V(?:AC|DC)?\b/i);
      if (vm) rec.voltage = vm[0].replace(/\s+/g, " ");
    }

    var hz = body.match(/(\d{2,3})\s*Hz\b/i);
    if (hz) rec.frequency = hz[1] + " Hz";

    if (/3[\s-]*ph(?:ase)?|three[\s-]*phase/i.test(body)) rec.phase = "3-phase";
    else if (/1[\s-]*ph(?:ase)?|single[\s-]*phase/i.test(body)) rec.phase = "1-phase";

    var tops = [];
    if (/double[\s-]*conversion/i.test(body)) tops.push("double-conversion");
    if (/\bonline\b/i.test(body)) tops.push("online");
    if (/line[\s-]*interactive/i.test(body)) tops.push("line-interactive");
    if (/\boffline\b|\bstandby\b/i.test(body)) tops.push("offline");
    rec.topology = tops.join(", ");

    if (/\bVRLA\b/i.test(body)) rec.battery = "VRLA";
    else if (/valve[\s-]*regulated lead/i.test(body)) rec.battery = "VRLA";
    else if (/li[\s-]*ion|lithium/i.test(body)) rec.battery = "Li-ion";
    else if (/ni[\s-]*cd|nickel[\s-]*cadmium/i.test(body)) rec.battery = "NiCd";
    else if (/lead[\s-]*acid/i.test(body)) rec.battery = "lead-acid";

    var bm = body.match(/(\d+(?:[.,]\d+)?)\s*(minutes?|mins?|hours?|hrs?|h)\b/i);
    if (bm && (/backup|runtime|autonomy|endur/i.test(body) || rec.eq_type === "ups" || /\bups\b/i.test(body))) {
      var unit = bm[2].toLowerCase();
      if (/^min/.test(unit)) unit = "min";
      else if (/^h/.test(unit)) unit = "h";
      rec.backup = bm[1].replace(",", ".") + " " + unit;
    }

    var eff = body.match(/(?:efficiency|eff\.?)\s*(?:of\s*)?(?:≥|>=|min(?:imum)?\.?\s*)?(\d+(?:\.\d+)?)\s*%/i);
    if (!eff) eff = body.match(/(\d+(?:\.\d+)?)\s*%\s*(?:efficiency|eff\.?)/i);
    if (eff) rec.efficiency = (/≥|>=/.test(body) ? "≥" : "") + eff[1] + "%";

    var load = body.match(/(?:load(?:\s+condition)?\s*(?:of\s+)?)(\d+(?:\.\d+)?)\s*%/i);
    if (!load) load = body.match(/(\d+(?:\.\d+)?)\s*%\s*load/i);
    if (load) rec.load_condition = load[1] + "%";

    var brand = body.match(/\b(?:preferred\s+(?:manufacturer|brand|supplier)|manufacturer\s+preference|manufacturer)\s*:?\s*([A-Za-z][A-Za-z0-9 .\/-]{1,40}?)(?=[,.;]|$|\s+and\s)/i);
    if (!brand) brand = body.match(/\bprefer(?:red)?\s+([A-Z][A-Za-z0-9 .\/-]{1,30})/);
    if (brand) rec.manufacturer_pref = brand[1].replace(/^\s+|\s+$/g, "");

    if (/approved\s+equivalent|or\s+equivalent|or\s+approved\s+equal/i.test(body)) {
      var eqm = body.match(/((?:approved\s+equivalent|or\s+equivalent|or\s+approved\s+equal)[^,.;]*)/i);
      rec.approved_equivalent = eqm ? eqm[1].replace(/^\s+|\s+$/g, "") : "approved equivalent";
    }

    var proto = [];
    if (/\bSNMP\b/i.test(body)) proto.push("SNMP");
    if (/\bModbus\b/i.test(body)) proto.push("Modbus");
    if (/\bBACnet\b/i.test(body)) proto.push("BACnet");
    rec.monitoring = proto.join(", ");

    if (/\binstallation\b/i.test(body)) {
      var inst = body.match(/([^,.;]*installation[^,.;]*)/i);
      rec.installation = inst ? inst[1].replace(/^\s+|\s+$/g, "") : "installation";
    }
    if (/\bcommissioning\b/i.test(body)) {
      var com = body.match(/([^,.;]*commissioning[^,.;]*)/i);
      rec.commissioning = com ? com[1].replace(/^\s+|\s+$/g, "") : "commissioning";
    }
    var maint = body.match(/(\d+)\s*(year|yr|month|mo)s?\s+maintenance/i);
    if (!maint) maint = body.match(/maintenance\s+(?:term|period|for)?\s*:?\s*(\d+)\s*(year|yr|month|mo)s?/i);
    if (maint) rec.maintenance_term = maint[1] + " " + maint[2];
    else if (/\bmaintenance\b/i.test(body) && !/maintenance\s+bypass/i.test(body)) {
      var mt = body.match(/([^,.;]*maintenance[^,.;]*)/i);
      rec.maintenance_term = mt ? mt[1].replace(/^\s+|\s+$/g, "") : "";
    }

    var acc = [];
    if (/maintenance\s+bypass/i.test(body)) acc.push("maintenance bypass");
    if (/internal\s+bypass/i.test(body)) acc.push("internal bypass");
    rec.accessories = acc.join("; ");

    if (/\bmodular\b/i.test(body)) rec.mandatory.push("modular");
    if (/\bredundant\b|\bn\+1\b/i.test(body)) rec.mandatory.push("redundant");
    var iec = body.match(/\b(C13|C14|C19|C20)\b/gi);
    if (iec) {
      var seen = [];
      for (var i = 0; i < iec.length; i++) {
        var u = iec[i].toUpperCase();
        if (seen.indexOf(u) === -1) seen.push(u);
      }
      rec.mandatory.push("connectors " + seen.join(", "));
    }

    var opt = body.match(/\boptional(?:ly)?\s*:?\s*([^.;]+)/i);
    if (opt) rec.optional.push(opt[1].replace(/^\s+|\s+$/g, ""));
    var pref = body.match(/\bpreferably\s+([^.;]+)/i);
    if (pref) rec.optional.push(pref[1].replace(/^\s+|\s+$/g, ""));

    return rec;
  }

  function isSpecRow(rec, catalogHits, vendor) {
    if (catalogHits.length || vendor) return true;
    if (
      rec.eq_type ||
      rec.power ||
      rec.voltage ||
      rec.phase ||
      rec.topology ||
      rec.battery ||
      rec.backup ||
      rec.current_rating ||
      rec.frequency ||
      rec.battery_qty ||
      rec.monitoring ||
      rec.accessories
    ) {
      return true;
    }
    return false;
  }

  function joinList(arr) {
    return arr && arr.length ? arr.join("; ") : "";
  }

  function qtyPrefix(qty) {
    if (qty === "" || qty == null) return "";
    return qty + " × ";
  }

  function requirementLabel(rec, catalogHits, vendor) {
    if (catalogHits.length) {
      var hit = catalogHits[0];
      var name = hit.kind === "pdu" ? pduLabel(hit.item) : serverLabel(hit.item);
      return qtyPrefix(rec.qty) + name;
    }
    if (vendor) return qtyPrefix(rec.qty) + vendor.name;
    var bits = [];
    if (rec.qty !== "" && rec.qty != null) bits.push(rec.qty + " ×");
    if (rec.power) bits.push(rec.power);
    if (rec.current_rating) bits.push(rec.current_rating);
    if (rec.eq_type === "spd") {
      var spd = rec.source.match(/Type\s+(?:1|2|I|II)\s+SPD/i);
      bits.push(spd ? spd[0].replace(/\s+/g, " ") : "SPD");
    } else if (rec.eq_type === "meter") {
      bits.push(/multifunction/i.test(rec.source) ? "multifunction energy meter" : "energy meter");
    } else if (rec.eq_type === "mccb") {
      if (/outgoing/i.test(rec.source)) bits.push("outgoing MCCB");
      else if (/incomer/i.test(rec.source)) bits.push("incomer MCCB");
      else bits.push("MCCB");
    } else if (rec.eq_type === "ups") {
      bits.push("UPS");
    } else if (rec.eq_type) {
      bits.push(rec.eq_type.toUpperCase());
    } else if (!bits.length) {
      bits.push(rec.source);
    }
    return bits.join(" ");
  }

  function catalogRowExtras(hit, rec, catalogPdusInSpec) {
    var item = hit.item;
    var compliance = "";
    var alt = "";
    var needs = "No";
    var reason = "";
    var suggested = "";
    if (hit.kind === "server") {
      var inlet = RackMatch.inletOf(item);
      suggested = serverLabel(item);
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
      if (rec.power) {
        needs = "Yes";
        reason = "Spec power rating is not a catalog field match";
        compliance += " Spec power " + rec.power + " is not verified against a catalog PSU SKU.";
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
      return {
        suggested: suggested,
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
          qty: rec.qty,
          u_pos: "",
          inlet: "",
          wattage: item.id === "dell-r760-2400" ? "2400 W (catalog)" : "",
          psu_count: "2",
          pdu_id: "",
          feed: "",
          voltage: "",
          current: ""
        }
      };
    }
    suggested = pduLabel(item);
    compliance =
      "In catalog. Outlets " +
      outletText(item) +
      ". Voltage " +
      (item.voltage || "") +
      ". Current " +
      (item.current || "") +
      ".";
    return {
      suggested: suggested,
      compliance: compliance,
      alternative: otherPdus(item.id).join("; ") || "None in this catalog",
      needs: "No",
      needs_reason: "",
      confirm: true,
      bom: {
        eq_type: "pdu",
        catalog_id: item.id,
        manufacturer: item.manufacturer,
        model: item.model,
        qty: rec.qty,
        u_pos: "",
        inlet: "",
        wattage: "",
        psu_count: "0",
        pdu_id: "",
        feed: "",
        voltage: "",
        current: ""
      }
    };
  }

  function unmatchedRow(rec, vendor) {
    var sm = vendor ? splitMfrModel(vendor.name) : { manufacturer: "", model: "" };
    var t = rec.eq_type || (vendor ? guessTypeFromName(vendor.name) : "unknown");
    var model = sm.model;
    if (!model) {
      var bits = [];
      if (rec.power) bits.push(rec.power);
      if (rec.eq_type) bits.push(rec.eq_type);
      if (rec.topology) bits.push(rec.topology);
      model = bits.join(" ") || rec.source.slice(0, 80);
    }
    var reason = vendor ? "Unknown model" : "No catalog match";
    return {
      suggested: "Not in catalog",
      compliance: "Needs verification. No catalog match.",
      alternative: "None from catalog",
      needs: "Yes",
      needs_reason: reason,
      confirm: false,
      bom: {
        eq_type: t,
        catalog_id: "",
        manufacturer: sm.manufacturer,
        model: model,
        qty: rec.qty,
        u_pos: "",
        inlet: "",
        wattage: "",
        psu_count: t === "pdu" ? "0" : "",
        pdu_id: "",
        feed: "",
        voltage: rec.voltage,
        current: ""
      }
    };
  }

  function emptySpecFields() {
    return {
      eq_type: "",
      qty: "",
      power: "",
      voltage: "",
      phase: "",
      topology: "",
      battery: "",
      backup: "",
      mandatory: "",
      optional: ""
    };
  }

  function attachSpec(row, rec) {
    row.eq_type = rec.eq_type || (row.bom && row.bom.eq_type) || "";
    row.qty = rec.qty;
    row.power = rec.power;
    row.voltage = rec.voltage;
    row.input_voltage = rec.input_voltage;
    row.output_voltage = rec.output_voltage;
    row.phase = rec.phase;
    row.frequency = rec.frequency;
    row.topology = rec.topology;
    row.battery = rec.battery;
    row.battery_qty = rec.battery_qty;
    row.battery_voltage = rec.battery_voltage;
    row.battery_ah = rec.battery_ah;
    row.backup = rec.backup;
    row.current_rating = rec.current_rating;
    row.efficiency = rec.efficiency;
    row.load_condition = rec.load_condition;
    row.manufacturer_pref = rec.manufacturer_pref;
    row.approved_equivalent = rec.approved_equivalent;
    row.monitoring = rec.monitoring;
    row.installation = rec.installation;
    row.commissioning = rec.commissioning;
    row.maintenance_term = rec.maintenance_term;
    row.accessories = rec.accessories;
    row.mandatory = joinList(rec.mandatory);
    row.optional = joinList(rec.optional);
    return row;
  }

  function buildRows(text) {
    var chunks = splitChunks(text);
    if (!chunks.length) chunks = [String(text || "").replace(/^\s+|\s+$/g, "")];
    var catalogPdusInSpec = [];
    var whole = findCatalogHits(text);
    var i;
    for (i = 0; i < whole.hits.length; i++) {
      if (whole.hits[i].kind === "pdu") catalogPdusInSpec.push(whole.hits[i].item);
    }
    var out = [];
    var seenKey = {};

    for (i = 0; i < chunks.length; i++) {
      var chunk = chunks[i];
      if (chunk.length < 4) continue;
      if (/^(scope|introduction|contents|index|page \d+)$/i.test(chunk)) continue;
      var rec = parseChunk(chunk);
      var local = findCatalogHits(chunk);
      var vendorHits = findUnknownVendor(chunk, local.used.slice());
      if (!isSpecRow(rec, local.hits, vendorHits[0])) continue;
      if (local.hits.length && (rec.qty === "" || rec.qty == null) && local.hits[0].qty) rec.qty = local.hits[0].qty;
      if (vendorHits[0] && (rec.qty === "" || rec.qty == null)) rec.qty = vendorHits[0].qty;
      if (local.hits.length && !rec.eq_type) {
        rec.eq_type = local.hits[0].kind === "pdu" ? "pdu" : local.hits[0].item.equipment_type || "server";
      }
      var extras;
      if (local.hits.length) extras = catalogRowExtras(local.hits[0], rec, catalogPdusInSpec);
      else extras = unmatchedRow(rec, vendorHits[0] || null);
      var row = {
        requirement: requirementLabel(rec, local.hits, vendorHits[0] || null),
        suggested: extras.suggested,
        compliance: extras.compliance,
        alternative: extras.alternative,
        needs: extras.needs,
        needs_reason: extras.needs_reason,
        confirm: extras.confirm,
        bom: extras.bom
      };
      attachSpec(row, rec);
      var key = row.requirement + "|" + row.suggested + "|" + row.power;
      if (seenKey[key]) continue;
      seenKey[key] = true;
      out.push(row);
    }

    if (!out.length) {
      var fallback = emptySpecFields();
      fallback.requirement = "No equipment requirement extracted";
      fallback.suggested = "Not in catalog";
      fallback.compliance = "Needs verification. No structured requirement and no catalog model found.";
      fallback.alternative = "None from catalog";
      fallback.needs = "Yes";
      fallback.needs_reason = "Nothing extracted";
      fallback.confirm = false;
      fallback.bom = null;
      out.push(fallback);
    }
    return out;
  }

  function catalogFields() {
    var servers = [];
    var pdus = [];
    for (var i = 0; i < rows.length; i++) {
      var b = rows[i].bom;
      if (!b) continue;
      var label = ((b.manufacturer || "") + " " + (b.model || "")).replace(/^\s+|\s+$/g, "");
      if (!label) label = rows[i].eq_type || "rfq";
      if (b.catalog_id && b.eq_type === "pdu") pdus.push(label);
      else if (b.catalog_id) servers.push(label);
      else if (b.eq_type === "pdu") pdus.push(label);
      else servers.push(label);
    }
    return {
      server: servers.join("; ").slice(0, 200) || "rfq",
      pdu: pdus.join("; ").slice(0, 200) || "rfq-log"
    };
  }

  function rowLogLine(r) {
    return [
      r.requirement,
      "type=" + (r.eq_type || ""),
      "qty=" + (r.qty || ""),
      "power=" + (r.power || ""),
      "freq=" + (r.frequency || ""),
      "batt=" + [r.battery_qty, r.battery_voltage, r.battery_ah].filter(Boolean).join(" "),
      "mon=" + (r.monitoring || ""),
      "suggested=" + r.suggested,
      "needs=" + r.needs + (r.needs_reason ? " (" + r.needs_reason + ")" : "")
    ].join(" | ");
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
        esc(r.eq_type) +
        "</td><td>" +
        esc(r.qty) +
        "</td><td>" +
        esc(r.power) +
        "</td><td>" +
        esc(r.current_rating) +
        "</td><td>" +
        esc(r.voltage) +
        "</td><td>" +
        esc(r.input_voltage) +
        "</td><td>" +
        esc(r.output_voltage) +
        "</td><td>" +
        esc(r.phase) +
        "</td><td>" +
        esc(r.frequency) +
        "</td><td>" +
        esc(r.topology) +
        "</td><td>" +
        esc(r.battery) +
        "</td><td>" +
        esc(r.battery_qty) +
        "</td><td>" +
        esc(r.battery_voltage) +
        "</td><td>" +
        esc(r.battery_ah) +
        "</td><td>" +
        esc(r.backup) +
        "</td><td>" +
        esc(r.efficiency) +
        "</td><td>" +
        esc(r.load_condition) +
        "</td><td>" +
        esc(r.manufacturer_pref) +
        "</td><td>" +
        esc(r.approved_equivalent) +
        "</td><td>" +
        esc(r.monitoring) +
        "</td><td>" +
        esc(r.installation) +
        "</td><td>" +
        esc(r.commissioning) +
        "</td><td>" +
        esc(r.maintenance_term) +
        "</td><td>" +
        esc(r.accessories) +
        "</td><td>" +
        esc(r.mandatory) +
        "</td><td>" +
        esc(r.optional) +
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
      "Extracted " + rows.length + " requirement row(s). Catalog match only where a catalog product exists. No invented models.";
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
