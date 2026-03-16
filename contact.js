/* ============================================================
   OceanRAG — contact.js
   Calendar Widget + Time Slot Selection + Booking API
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

  // --- Config ---
  const BOOKING_API_URL = 'https://oceanrag-booking.watermelom5404.workers.dev';

  // --- State ---
  const today = new Date();
  let viewYear = today.getFullYear();
  let viewMonth = today.getMonth(); // 0-indexed
  let selectedDate = null; // Date object
  let selectedTime = null; // string like "09:00"
  let availableSlots = []; // from API
  let slotsLoading = false;
  let bookingInProgress = false;

  const allTimeSlots = ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00'];
  const weekdayNames = ['日', '一', '二', '三', '四', '五', '六'];

  // --- DOM Refs ---
  const calTitle = document.getElementById('calTitle');
  const calDays = document.getElementById('calDays');
  const calPrev = document.getElementById('calPrev');
  const calNext = document.getElementById('calNext');
  const timeslotCard = document.getElementById('timeslotCard');
  const timeslotTitle = document.getElementById('timeslotTitle');
  const timeslotGrid = document.getElementById('timeslotGrid');
  const selectedDatetime = document.getElementById('selectedDatetime');
  const selectedDatetimeText = document.getElementById('selectedDatetimeText');
  const contactForm = document.getElementById('contactForm');
  const submitBtn = document.getElementById('submitBtn');

  // --- Calendar Rendering ---
  function renderCalendar(year, month) {
    calTitle.textContent = `${year} 年 ${month + 1} 月`;

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    calDays.innerHTML = '';

    // Empty cells before first day
    for (let i = 0; i < firstDay; i++) {
      const empty = document.createElement('div');
      empty.className = 'cal-day empty';
      calDays.appendChild(empty);
    }

    // Day cells
    for (let d = 1; d <= daysInMonth; d++) {
      const cell = document.createElement('div');
      cell.className = 'cal-day';
      cell.textContent = d;

      const cellDate = new Date(year, month, d);
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

      // Past dates
      if (cellDate < todayStart) {
        cell.classList.add('past');
      } else {
        // Today highlight
        if (cellDate.getTime() === todayStart.getTime()) {
          cell.classList.add('today');
        }

        // Selected state
        if (selectedDate &&
            cellDate.getFullYear() === selectedDate.getFullYear() &&
            cellDate.getMonth() === selectedDate.getMonth() &&
            cellDate.getDate() === selectedDate.getDate()) {
          cell.classList.add('selected');
        }

        cell.addEventListener('click', () => onDateSelect(year, month, d));
      }

      calDays.appendChild(cell);
    }
  }

  // --- Date Selection ---
  function onDateSelect(year, month, day) {
    selectedDate = new Date(year, month, day);
    selectedTime = null;
    availableSlots = [];

    renderCalendar(viewYear, viewMonth);
    fetchAvailability();
    updateDatetimeBadge();
  }

  // --- Fetch Availability from Worker API ---
  async function fetchAvailability() {
    if (!selectedDate) return;

    slotsLoading = true;
    showTimeSlots(); // show loading state

    const dateStr = formatDate(selectedDate);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const res = await fetch(
        `${BOOKING_API_URL}/api/availability?date=${dateStr}`,
        { signal: controller.signal },
      );
      clearTimeout(timeoutId);
      const data = await res.json();

      if (res.ok) {
        availableSlots = data.available || [];
      } else {
        console.error('Availability error:', data.error);
        availableSlots = [...allTimeSlots];
      }
    } catch (err) {
      clearTimeout(timeoutId);
      console.error('Availability fetch failed:', err);
      availableSlots = [...allTimeSlots];
    }

    slotsLoading = false;
    showTimeSlots();
  }

  // --- Time Slots ---
  function showTimeSlots() {
    if (!selectedDate) return;

    const m = selectedDate.getMonth() + 1;
    const d = selectedDate.getDate();
    const w = weekdayNames[selectedDate.getDay()];

    timeslotTitle.textContent = slotsLoading
      ? `${m}月${d}日 (${w}) 載入中...`
      : `${m}月${d}日 (${w}) 可選時段：`;

    timeslotGrid.innerHTML = '';

    allTimeSlots.forEach(time => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'slot-btn';
      btn.textContent = time;

      if (slotsLoading) {
        btn.classList.add('loading');
        btn.disabled = true;
      } else if (!availableSlots.includes(time)) {
        btn.classList.add('booked');
        btn.disabled = true;
        btn.textContent = `${time} 已預約`;
        btn.title = '此時段已被預約';
      } else if (selectedTime === time) {
        btn.classList.add('selected');
      }

      if (!btn.disabled) {
        btn.addEventListener('click', () => onTimeSelect(time));
      }

      timeslotGrid.appendChild(btn);
    });

    timeslotCard.style.display = '';
  }

  function onTimeSelect(time) {
    selectedTime = time;
    showTimeSlots(); // re-render to update selected state
    updateDatetimeBadge();
  }

  // --- Datetime Badge ---
  function updateDatetimeBadge() {
    if (!selectedDate) {
      selectedDatetime.style.display = 'none';
      return;
    }

    const m = selectedDate.getMonth() + 1;
    const d = selectedDate.getDate();
    const w = weekdayNames[selectedDate.getDay()];
    let text = `${selectedDate.getFullYear()}/${m}/${d} (${w})`;

    if (selectedTime) {
      text += ` ${selectedTime}`;
    }

    selectedDatetimeText.textContent = text;
    selectedDatetime.style.display = '';
  }

  // --- Month Navigation ---
  calPrev.addEventListener('click', () => {
    viewMonth--;
    if (viewMonth < 0) {
      viewMonth = 11;
      viewYear--;
    }
    renderCalendar(viewYear, viewMonth);
  });

  calNext.addEventListener('click', () => {
    viewMonth++;
    if (viewMonth > 11) {
      viewMonth = 0;
      viewYear++;
    }
    renderCalendar(viewYear, viewMonth);
  });

  // --- Form Validation & Submit ---
  contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (bookingInProgress) return;
    bookingInProgress = true;

    // Clear previous errors
    contactForm.querySelectorAll('.form-group').forEach(g => g.classList.remove('error'));

    const name = document.getElementById('contactName');
    const company = document.getElementById('contactCompany');
    const email = document.getElementById('contactEmail');
    const phone = document.getElementById('contactPhone');
    const type = document.getElementById('contactType');
    const message = document.getElementById('contactMessage');

    let hasError = false;

    // Validate required fields (name + message only)
    const fields = [
      { el: name, check: () => name.value.trim() === '' },
      { el: message, check: () => message.value.trim() === '' },
    ];

    // Validate optional email format if provided
    if (email.value.trim() && !email.validity.valid) {
      email.closest('.form-group').classList.add('error');
      hasError = true;
    }

    // Validate optional phone format if provided
    if (phone.value.trim() && !/^[0-9\-+()]{7,20}$/.test(phone.value.trim())) {
      phone.closest('.form-group').classList.add('error');
      hasError = true;
    }

    fields.forEach(({ el, check }) => {
      if (check()) {
        el.closest('.form-group').classList.add('error');
        hasError = true;
      }
    });

    // Date & time are optional — no validation needed

    if (hasError) {
      bookingInProgress = false;
      return;
    }

    // --- Submit via Booking API ---
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 發送中...';

    const bookingData = {
      date: selectedDate ? formatDate(selectedDate) : '',
      time: selectedTime || '',
      name: name.value.trim(),
      company: company.value.trim(),
      email: email.value.trim(),
      phone: phone.value.trim(),
      type: type.value || '',
      message: message.value.trim(),
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const res = await fetch(`${BOOKING_API_URL}/api/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingData),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const data = await res.json();

      if (res.ok && data.success) {
        showNotice('success', '已送出，收到後我會盡快回覆你！');
        contactForm.reset();
        selectedDate = null;
        selectedTime = null;
        availableSlots = [];
        timeslotCard.style.display = 'none';
        selectedDatetime.style.display = 'none';
        viewYear = today.getFullYear();
        viewMonth = today.getMonth();
        renderCalendar(viewYear, viewMonth);
      } else if (res.status === 409) {
        showNotice('error', '此時段已被其他人預約，請重新選擇時段。');
        selectedTime = null;
        updateDatetimeBadge();
        await fetchAvailability();
      } else if (res.status === 429) {
        showNotice('error', '請求次數過多，請稍後再試。');
      } else {
        throw new Error(data.error || 'Booking failed');
      }
    } catch (err) {
      clearTimeout(timeoutId);
      console.error('Booking failed:', err);
      fallbackMailto(bookingData);
    } finally {
      bookingInProgress = false;
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> 確認發送';
    }
  });

  // --- Mailto Fallback ---
  function fallbackMailto(data) {
    const dateStr = `${data.date} ${data.time}`;
    const subject = encodeURIComponent(
      `[OceanRAG 諮詢] ${data.type} — ${data.company}`
    );
    const bodyLines = [
      `姓名：${data.name}`,
      `公司/組織：${data.company}`,
      `Email：${data.email}`,
      `電話：${data.phone}`,
      `諮詢類型：${data.type}`,
      `預約時間：${dateStr}`,
      '',
      '訊息內容：',
      data.message,
      '',
      '---',
      '此信件由 OceanRAG 官網聯繫表單自動產生',
      '(線上預約系統暫時無法使用，改為 Email 發送)',
    ];
    const body = encodeURIComponent(bodyLines.join('\n'));
    const mailtoUrl = `mailto:mackinhung@gmail.com?subject=${subject}&body=${body}`;

    showNotice('error', '線上預約暫時無法使用，已開啟郵件客戶端作為替代方案。');
    window.location.href = mailtoUrl;
  }

  // --- Notice Helper ---
  function showNotice(type, text) {
    const notice = document.getElementById('submitNotice');
    const icon = notice.querySelector('i');
    const msg = notice.querySelector('p');

    if (type === 'success') {
      notice.className = 'submit-notice success';
      icon.className = 'fa-solid fa-circle-check';
    } else {
      notice.className = 'submit-notice error';
      icon.className = 'fa-solid fa-triangle-exclamation';
    }

    msg.textContent = text;
    notice.style.display = '';

    setTimeout(() => {
      notice.style.display = 'none';
    }, 8000);
  }

  // --- Error message placeholders ---
  contactForm.querySelectorAll('.form-group').forEach(group => {
    const errSpan = document.createElement('div');
    errSpan.className = 'error-msg';
    errSpan.textContent = '此欄位為必填';
    group.appendChild(errSpan);
  });

  // Clear error on input
  contactForm.querySelectorAll('input, select, textarea').forEach(el => {
    el.addEventListener('input', () => {
      el.closest('.form-group').classList.remove('error');
    });
  });

  // --- Helpers ---
  function formatDate(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  // --- Mobile Menu Toggle (matches script.js logic) ---
  const menuToggle = document.getElementById('menuToggle');
  const navLinks = document.getElementById('navLinks');

  if (menuToggle && navLinks) {
    menuToggle.addEventListener('click', () => {
      menuToggle.classList.toggle('active');
      navLinks.classList.toggle('active');
      document.body.style.overflow = navLinks.classList.contains('active') ? 'hidden' : '';
    });

    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        menuToggle.classList.remove('active');
        navLinks.classList.remove('active');
        document.body.style.overflow = '';
      });
    });
  }

  // --- Init ---
  renderCalendar(viewYear, viewMonth);
});
