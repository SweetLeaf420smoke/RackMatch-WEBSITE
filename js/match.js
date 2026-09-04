(function (w) {
  function hasOutlet(pdu, type) {
    var o = pdu && pdu.outlets;
    if (!o) return false;
    if (Object.prototype.toString.call(o) === "[object Array]") {
      return o.indexOf(type) !== -1;
    }
    return (o[type] || 0) > 0;
  }

  function inletOf(server) {
    return server.psu_inlet || server.inlet;
  }

  function volt(server) {
    return server.voltage || server.v;
  }

  function amp(server) {
    return server.current || server.a;
  }

  function lockOf(pdu) {
    return pdu.locking || pdu.lock || "n/a";
  }

  function match(server, pdu) {
    var inlet = inletOf(server);
    var hasC13 = hasOutlet(pdu, "C13");
    var hasC19 = hasOutlet(pdu, "C19");
    var v = volt(server);
    var a = amp(server);
    var pv = pdu.voltage || pdu.v;
    var pa = pdu.current || pdu.a;
    if (inlet === "C14" && hasC13) {
      return {
        ok: true,
        cable: "IEC C13–C14 jumper",
        connector: "C13 into server C14 inlet; C14 into PDU C13 outlet",
        va: v + " / " + a + " (cable). PDU: " + pv + ", " + pa,
        lock: lockOf(pdu),
        note: ""
      };
    }
    if (inlet === "C20" && hasC19) {
      return {
        ok: true,
        cable: "IEC C19–C20 jumper",
        connector: "C19 into server C20 inlet; C20 into PDU C19 outlet",
        va: v + " / " + a + " (cable). PDU: " + pv + ", " + pa,
        lock: lockOf(pdu),
        note: ""
      };
    }
    if (inlet === "C14" && hasC19 && !hasC13) {
      return {
        ok: true,
        cable: "IEC C13–C20 jumper",
        connector: "C13 into server C14 inlet; C20 into PDU C19 outlet",
        va: v + " / max " + a + " on this jumper. PDU: " + pv + ", " + pa,
        lock: lockOf(pdu),
        note: "C13/C14 is 10 A class. Do not treat this as a 16 A feed."
      };
    }
    if (inlet === "C20" && hasC13 && !hasC19) {
      return {
        ok: false,
        cable: "No standard match",
        connector: "Server C20 inlet needs a C19 outlet on the PDU",
        va: v + " / " + a + " vs PDU C13-only (" + pv + ", " + pa + ")",
        lock: "n/a",
        note: "C13 outlet is 10 A class. This PSU inlet is 16 A class."
      };
    }
    var listed = Object.prototype.toString.call(pdu.outlets) === "[object Array]"
      ? pdu.outlets.join(", ")
      : Object.keys(pdu.outlets || {}).join(", ");
    return {
      ok: false,
      cable: "No standard match",
      connector: "Outlet set " + listed + " vs inlet " + inlet,
      va: v + " / " + a,
      lock: "n/a",
      note: ""
    };
  }

  w.RackMatch = { match: match, hasOutlet: hasOutlet };
})(window);
