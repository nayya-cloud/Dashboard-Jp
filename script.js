(() => {
  "use strict";
  const STORAGE_KEY = "oraKasinoJackpotApplications_v1";
  const PAGE_SIZE = 5;
  const $ = (id) => document.getElementById(id);
  const form = $("jackpotForm");
  const whatsappInput = $("whatsapp");
  const amountInput = $("amount");
  let records = loadRecords();
  let currentPage = 1;
  let searchTerm = "";
  let toastTimer;

  function loadRecords() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  }
  function persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  }
  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  }
  function parseDigits(value) {
    const digits = String(value).replace(/\D/g, "");
    if (!digits) return 0;
    return Number(digits);
  }
  function formatRupiah(value) {
    return "Rp " + Number(value || 0).toLocaleString("en-US", {minimumFractionDigits:2, maximumFractionDigits:2});
  }
  function formatDate(dateValue) {
    const date = new Date(dateValue);
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Jakarta", day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23"
    }).formatToParts(date);
    const p = Object.fromEntries(parts.map(x => [x.type, x.value]));
    return `${p.day}-${p.month}-${p.year} ${p.hour}:${p.minute}:${p.second}`;
  }
  function dateKey(dateValue) {
    const d = new Date(dateValue);
    return new Intl.DateTimeFormat("en-CA", {timeZone:"Asia/Jakarta",year:"numeric",month:"2-digit",day:"2-digit"}).format(d);
  }
  function showToast(message) {
    const toast = $("toast");
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2800);
  }
  function normalizePhone(value) {
    let phone = value.replace(/\D/g, "");
    if (phone.startsWith("0")) phone = "62" + phone.slice(1);
    if (phone.startsWith("8")) phone = "62" + phone;
    return phone;
  }
  function clearForm() {
    form.reset();
    $("editingId").value = "";
    $("submitButton").innerHTML = "<span>▣</span> SIMPAN / AJUKAN";
    $("formHint").textContent = "Isi data member untuk membuat pengajuan jackpot baru.";
    $("jackpotType").value = "Jackpot Utama";
    $("status").value = "Aktif";
  }
  function filteredRecords() {
    return [...records]
      .filter(r => r.whatsapp.includes(searchTerm))
      .sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
  }
  function renderStats() {
    $("totalCount").textContent = records.length.toLocaleString("id-ID");
    $("activeCount").textContent = records.filter(r => r.status === "Aktif").length.toLocaleString("id-ID");
    const today = dateKey(Date.now());
    const total = records.filter(r => dateKey(r.createdAt) === today).reduce((sum,r) => sum + Number(r.amount || 0), 0);
    $("todayTotal").textContent = formatRupiah(total);
  }
  function renderHistory() {
    const latest = [...records].sort((a,b) => new Date(b.createdAt)-new Date(a.createdAt)).slice(0,3);
    $("historyList").innerHTML = latest.length ? latest.map(r => `
      <div class="history-item"><span><strong>${escapeHTML(r.whatsapp)}</strong> · ${escapeHTML(r.type)}<br><small>${formatDate(r.createdAt)}</small></span>
      <span>${formatRupiah(r.amount)}<br><small>${escapeHTML(r.status)}</small></span></div>`).join("") :
      '<div class="empty-history">Belum ada riwayat pengajuan.</div>';
  }
  function renderTable() {
    const list = filteredRecords();
    const pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
    currentPage = Math.min(currentPage, pages);
    const start = (currentPage - 1) * PAGE_SIZE;
    const pageItems = list.slice(start, start + PAGE_SIZE);
    $("dataBody").innerHTML = pageItems.length ? pageItems.map((r, index) => `
      <tr>
        <td>${start + index + 1}</td>
        <td>${escapeHTML(r.whatsapp)}</td>
        <td>${escapeHTML(r.type)}</td>
        <td>${formatRupiah(r.amount)}</td>
        <td><span class="status-pill status-${escapeHTML(r.status)}">${escapeHTML(r.status)}</span></td>
        <td>${formatDate(r.createdAt)}</td>
        <td><div class="row-actions">
          <button class="action-btn edit-btn" data-action="edit" data-id="${r.id}" title="Edit" aria-label="Edit data">✎</button>
          <button class="action-btn delete-btn" data-action="delete" data-id="${r.id}" title="Hapus" aria-label="Hapus data">▤</button>
        </div></td>
      </tr>`).join("") : '<tr><td colspan="7" class="empty-table">Tidak ada data yang cocok dengan pencarian.</td></tr>';
    $("tableInfo").textContent = list.length ? `Menampilkan ${start + 1} - ${Math.min(start + PAGE_SIZE, list.length)} dari ${list.length} data` : "Menampilkan 0 data";
    $("pageNumber").textContent = currentPage;
    $("prevPage").disabled = currentPage <= 1;
    $("nextPage").disabled = currentPage >= pages;
  }
  function renderAll() { renderStats(); renderHistory(); renderTable(); }
  function editRecord(id) {
    const record = records.find(r => r.id === id);
    if (!record) return;
    $("editingId").value = record.id;
    whatsappInput.value = record.whatsapp;
    $("jackpotType").value = record.type;
    amountInput.value = Number(record.amount).toLocaleString("en-US", {maximumFractionDigits:0});
    $("status").value = record.status;
    $("submitButton").innerHTML = "<span>✓</span> PERBARUI DATA";
    $("formHint").textContent = "Mode edit aktif — waktu pengajuan awal akan tetap dipertahankan.";
    $("jackpotForm").scrollIntoView({behavior:"smooth",block:"center"});
    showToast("Data dimuat ke form untuk diedit.");
  }

  whatsappInput.addEventListener("input", () => {
    whatsappInput.value = whatsappInput.value.replace(/\D/g, "").slice(0,16);
  });
  amountInput.addEventListener("input", () => {
    const digits = amountInput.value.replace(/\D/g, "");
    amountInput.value = digits ? Number(digits).toLocaleString("en-US") : "";
  });
  form.addEventListener("submit", event => {
    event.preventDefault();
    const whatsapp = normalizePhone(whatsappInput.value);
    const amount = parseDigits(amountInput.value);
    if (!/^628\d{7,13}$/.test(whatsapp)) {
      showToast("Nomor tidak valid. Gunakan nomor Indonesia, contoh 6281234567890.");
      whatsappInput.focus(); return;
    }
    if (!amount || !Number.isFinite(amount)) {
      showToast("Masukkan nominal deposit yang valid."); amountInput.focus(); return;
    }
    const id = $("editingId").value;
    if (id) {
      const index = records.findIndex(r => r.id === id);
      if (index !== -1) records[index] = {...records[index], whatsapp, type:$("jackpotType").value, amount, status:$("status").value};
      showToast("Data pengajuan berhasil diperbarui.");
    } else {
      records.push({
        id: (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        whatsapp, type:$("jackpotType").value, amount, status:$("status").value,
        createdAt:new Date().toISOString()
      });
      showToast("Pengajuan jackpot berhasil disimpan.");
    }
    persist(); clearForm(); currentPage = 1; renderAll();
  });
  $("resetButton").addEventListener("click", () => { clearForm(); showToast("Form berhasil direset."); });
  $("dataBody").addEventListener("click", event => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const {action,id} = button.dataset;
    if (action === "edit") editRecord(id);
    if (action === "delete") {
      const record = records.find(r => r.id === id);
      if (!record) return;
      if (confirm(`Hapus pengajuan untuk nomor ${record.whatsapp}? Data yang dihapus tidak dapat dikembalikan.`)) {
        records = records.filter(r => r.id !== id);
        persist(); renderAll(); showToast("Data pengajuan berhasil dihapus.");
        if ($("editingId").value === id) clearForm();
      }
    }
  });
  $("searchInput").addEventListener("input", event => {
    searchTerm = event.target.value.replace(/\D/g, "");
    currentPage = 1; renderTable();
  });
  $("prevPage").addEventListener("click", () => { if(currentPage>1){currentPage--;renderTable();} });
  $("nextPage").addEventListener("click", () => {
    const pages = Math.max(1,Math.ceil(filteredRecords().length/PAGE_SIZE));
    if(currentPage<pages){currentPage++;renderTable();}
  });
  $("viewAllButton").addEventListener("click", () => {
    $("searchInput").value = ""; searchTerm = ""; currentPage = 1; renderTable();
    $("tableBody")?.scrollIntoView?.({behavior:"smooth"});
    document.querySelector(".table-panel").scrollIntoView({behavior:"smooth",block:"start"});
  });
  $("mobileMenu").addEventListener("click", () => {
    $("sidebar").classList.add("open"); $("sidebarOverlay").classList.add("show");
  });
  $("sidebarOverlay").addEventListener("click", () => {
    $("sidebar").classList.remove("open"); $("sidebarOverlay").classList.remove("show");
  });
  $("profileButton").addEventListener("click", () => showToast("Anda masuk sebagai admin."));
  $("year").textContent = new Date().getFullYear();
  renderAll();
})();

/* Scale the full 1200px desktop dashboard to the available phone width.
   This preserves the landscape layout even when the phone is held portrait. */
(function fitLandscapeDashboardOnPortrait() {
  const shell = document.querySelector('.app-shell');
  if (!shell) return;

  function fitDashboard() {
    if (window.matchMedia('(max-width: 700px)').matches) {
      const scale = Math.min(window.innerWidth / 1200, 1);
      document.documentElement.style.setProperty('--portrait-fit', String(scale));
      document.body.style.width = '100%';
      document.body.style.minHeight = Math.ceil(shell.scrollHeight * scale) + 'px';
      shell.style.marginBottom = '0';
    } else {
      document.documentElement.style.removeProperty('--portrait-fit');
      document.body.style.width = '';
      document.body.style.minHeight = '';
      shell.style.marginBottom = '';
    }
  }

  window.addEventListener('resize', fitDashboard, { passive: true });
  window.addEventListener('orientationchange', fitDashboard, { passive: true });
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fitDashboard, { once: true });
  } else {
    fitDashboard();
  }
  if ('ResizeObserver' in window) {
    new ResizeObserver(fitDashboard).observe(shell);
  }
})();
