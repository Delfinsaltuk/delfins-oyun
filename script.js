// ==========================================
// 1. DESIGN (Tasarımcı Parametreleri)
// ==========================================
// Bu obje sistemin tüm görsel, zamanlama ve kural sınırlarını belirler.
// Katılımcı oyun sırasında bu parametreleri değiştiremez.
const DESIGN = {
  // Solma (fade) süresi (Milisaniye cinsinden)
  // Değeri artırmak ışıkların daha uzun süre sahnede kalmasını sağlar.
  fadeDurationMs: 500,

  // Sönük durumdaki taban opaklık (0.0 - 1.0)
  // Şekillerin basılmadığı andaki izi gösterir.
  idleOpacity: 0.15,

  // Aktif durumdaki opaklık (0.0 - 1.0)
  activeOpacity: 1.0,

  // İzin verilen girdi tuşları ve eşleştirmeleri
  keyMap: {
    'a': 'A', 'A': 'A',
    's': 'S', 'S': 'S',
    'd': 'D', 'D': 'D',
    'f': 'F', 'F': 'F'
  },

  // Mod seçenekleri
  modes: {
    INDIVIDUAL: 'INDIVIDUAL',
    TOGETHER: 'TOGETHER'
  }
};

// ==========================================
// 2. STATE (Sistem Durumu)
// ==========================================
const state = {
  // Şun anda basılı tutulan girdi kimlikleri (Set)
  activeInputs: new Set(),

  // Aktif mod: INDIVIDUAL veya TOGETHER
  currentMode: DESIGN.modes.INDIVIDUAL,

  // Şekillerin mevcut opaklık ve fade animasyon durumları
  shapes: {
    A: { opacity: DESIGN.idleOpacity, fadeStartTime: null },
    S: { opacity: DESIGN.idleOpacity, fadeStartTime: null },
    D: { opacity: DESIGN.idleOpacity, fadeStartTime: null },
    F: { opacity: DESIGN.idleOpacity, fadeStartTime: null }
  }
};

// DOM Eleman Referansları
const shapeElements = {
  A: document.getElementById('shape-A'),
  S: document.getElementById('shape-S'),
  D: document.getElementById('shape-D'),
  F: document.getElementById('shape-F')
};

const touchButtons = {
  A: document.getElementById('touch-A'),
  S: document.getElementById('touch-S'),
  D: document.getElementById('touch-D'),
  F: document.getElementById('touch-F')
};

const modeIndBtn = document.getElementById('mode-individual');
const modeTogBtn = document.getElementById('mode-together');
const resetBtn = document.getElementById('btn-reset');

// ==========================================
// 3. INPUT (Girdi Dinleyicileri)
// ==========================================

// Tuş basma (Keydown - Repeat engellemeli)
window.addEventListener('keydown', (e) => {
  if (e.repeat) return; // Klavye tuş tekrarını yoksay
  const mappedKey = DESIGN.keyMap[e.key];
  if (mappedKey) {
    handleInputStart(mappedKey);
  }
});

// Tuş bırakma (Keyup)
window.addEventListener('keyup', (e) => {
  const mappedKey = DESIGN.keyMap[e.key];
  if (mappedKey) {
    handleInputEnd(mappedKey);
  }
});

// Dokunmatik / Fare (Pointer Events + Pointer Capture)
Object.entries(touchButtons).forEach(([key, button]) => {
  button.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    button.setPointerCapture(e.pointerId);
    handleInputStart(key);
  });

  button.addEventListener('pointerup', (e) => {
    e.preventDefault();
    handleInputEnd(key);
  });

  button.addEventListener('pointercancel', (e) => {
    e.preventDefault();
    handleInputEnd(key);
  });
});

// Odak kaybı (Blur) durumunda tüm girdileri temizle (Işıkların takılı kalmasını önler)
window.addEventListener('blur', () => {
  clearAllInputs();
});

// Mod Değiştirme Butonları
modeIndBtn.addEventListener('click', () => setMode(DESIGN.modes.INDIVIDUAL));
modeTogBtn.addEventListener('click', () => setMode(DESIGN.modes.TOGETHER));

// Sıfırlama Butonu
resetBtn.addEventListener('click', () => resetStage());

function handleInputStart(keyId) {
  if (!state.activeInputs.has(keyId)) {
    state.activeInputs.add(keyId);
    // Yeni girdi geldiğinde ilgili zamanlayıcıları sıfırla
    state.shapes[keyId].fadeStartTime = null;
  }
}

function handleInputEnd(keyId) {
  if (state.activeInputs.has(keyId)) {
    state.activeInputs.delete(keyId);

    const now = performance.now();

    if (state.currentMode === DESIGN.modes.INDIVIDUAL) {
      // Individual Modu: Sadece bırakılan şekil 500ms solmaya başlar
      state.shapes[keyId].fadeStartTime = now;
    } else if (state.currentMode === DESIGN.modes.TOGETHER) {
      // Together Modu: Yalnızca TÜM girdiler serbest bırakıldığında hepsi solmaya başlar
      if (state.activeInputs.size === 0) {
        Object.keys(state.shapes).forEach(k => {
          state.shapes[k].fadeStartTime = now;
        });
      }
    }
  }
}

function clearAllInputs() {
  state.activeInputs.clear();
  Object.keys(state.shapes).forEach(k => {
    state.shapes[k].opacity = DESIGN.idleOpacity;
    state.shapes[k].fadeStartTime = null;
  });
}

function setMode(newMode) {
  if (state.currentMode !== newMode) {
    state.currentMode = newMode;
    clearAllInputs();
    
    if (newMode === DESIGN.modes.INDIVIDUAL) {
      modeIndBtn.classList.add('active');
      modeTogBtn.classList.remove('active');
    } else {
      modeTogBtn.classList.add('active');
      modeIndBtn.classList.remove('active');
    }
  }
}

function resetStage() {
  clearAllInputs();
}

// ==========================================
// 4. RULE & 5. OUTPUT (Kural Mantığı ve Çıktı Döngüsü)
// ==========================================

function updateRulesAndRender(timestamp) {
  // A. KURAL HESAPLAMALARI (Rule Logic)
  const isAnyInputActive = state.activeInputs.size > 0;

  Object.keys(state.shapes).forEach(key => {
    const shape = state.shapes[key];

    if (state.currentMode === DESIGN.modes.INDIVIDUAL) {
      if (state.activeInputs.has(key)) {
        shape.opacity = DESIGN.activeOpacity;
        shape.fadeStartTime = null;
      } else if (shape.fadeStartTime !== null) {
        const elapsed = timestamp - shape.fadeStartTime;
        if (elapsed < DESIGN.fadeDurationMs) {
          const progress = elapsed / DESIGN.fadeDurationMs;
          shape.opacity = DESIGN.activeOpacity - progress * (DESIGN.activeOpacity - DESIGN.idleOpacity);
        } else {
          shape.opacity = DESIGN.idleOpacity;
          shape.fadeStartTime = null;
        }
      }
    } 
    else if (state.currentMode === DESIGN.modes.TOGETHER) {
      if (isAnyInputActive) {
        // Herhangi bir tuş basılı tutulduğu sürece TÜM şekiller yanar
        shape.opacity = DESIGN.activeOpacity;
        shape.fadeStartTime = null;
      } else if (shape.fadeStartTime !== null) {
        const elapsed = timestamp - shape.fadeStartTime;
        if (elapsed < DESIGN.fadeDurationMs) {
          const progress = elapsed / DESIGN.fadeDurationMs;
          shape.opacity = DESIGN.activeOpacity - progress * (DESIGN.activeOpacity - DESIGN.idleOpacity);
        } else {
          shape.opacity = DESIGN.idleOpacity;
          shape.fadeStartTime = null;
        }
      }
    }
  });

  // B. GÖRSEL ÇIKTI (Output / Rendering)
  // Şekil Opaklıklarını Güncelle
  Object.keys(state.shapes).forEach(key => {
    if (shapeElements[key]) {
      shapeElements[key].style.opacity = state.shapes[key].opacity;
    }
    // Ekranda basılan düğmeleri vurgula
    if (touchButtons[key]) {
      if (state.activeInputs.has(key)) {
        touchButtons[key].classList.add('active');
      } else {
        touchButtons[key].classList.remove('active');
      }
    }
  });

  // Animasyon döngüsünü sürdür
  requestAnimationFrame(updateRulesAndRender);
}

// Animasyon döngüsünü başlat
requestAnimationFrame(updateRulesAndRender);