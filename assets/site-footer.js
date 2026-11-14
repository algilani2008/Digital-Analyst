/* ---------- تواصل مشترك بين كل صفحات الموقع: يملأ تذييل الصفحة بروابط التواصل ---------- */
(function () {
  var CONTACT = { whatsapp: "966569184730", email: "" }; /* نفس بيانات assets/site-discover.js */
  function waLink(text) { return CONTACT.whatsapp ? "https://wa.me/" + CONTACT.whatsapp.replace(/\D/g, "") + (text ? "?text=" + encodeURIComponent(text) : "") : ""; }
  var f = document.getElementById("foot-reach");
  if (f) {
    var parts = [];
    if (CONTACT.whatsapp) parts.push("واتساب: " + CONTACT.whatsapp);
    if (CONTACT.email) parts.push(CONTACT.email);
    f.textContent = parts.join(" · ");
  }
  window.__daWaLink = waLink;

  /* ---------- مسح بيانات الجهاز: زر مستقل عن site-tools.js/site-systems.js عشان يشتغل من أي صفحة فيها الزر (صفحة الخصوصية بـ index.html) ---------- */
  var wipeBtn = document.getElementById("wipe"), wipeStatus = document.getElementById("wipe-status");
  if (wipeBtn) {
    wipeBtn.addEventListener("click", function () {
      if (wipeBtn.dataset.armed !== "1") {
        var old = wipeBtn.textContent;
        wipeBtn.dataset.armed = "1"; wipeBtn.textContent = "اضغط مرة ثانية للتأكيد";
        setTimeout(function () { if (wipeBtn.isConnected) { wipeBtn.dataset.armed = ""; wipeBtn.textContent = old; } }, 4000);
        return;
      }
      wipeBtn.dataset.armed = "";
      try { localStorage.removeItem("da_free"); } catch (x) {}
      try { localStorage.removeItem("da_sys_v1"); } catch (x) {}
      if (window.__daSysWipe) window.__daSysWipe();
      if (wipeStatus) wipeStatus.textContent = "انمسحت.";
    });
  }
})();
