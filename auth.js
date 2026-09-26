// ============================================================
// BABA SITARAM PRO - Authentication Logic
// Firebase Email/Password + Email Link
// ============================================================

let currentLang = localStorage.getItem('bsp_lang') || 'hi';
let pendingLang = currentLang;
let confirmationResult = null;
let resendTimer = null;
let resendCountdown = 40;
let currentEmailForLink = '';

// ============ LANGUAGE ============
function t(en, hi) { return currentLang === 'hi' ? hi : en; }

function setLang(lang) {
  currentLang = lang;
  localStorage.setItem('bsp_lang', lang);
  pendingLang = lang;
  document.querySelectorAll('.lang-btn').forEach(b => b.classList.toggle('active', b.dataset.lang === lang));
  // Update UI texts
  updateAllTexts();
}

function onLangChange() {
  pendingLang = document.getElementById('langSelect')?.value || 'hi';
  const btn = document.getElementById('langSaveBtn');
  if (btn) btn.disabled = (pendingLang === currentLang);
}

function saveLanguage() {
  if (pendingLang === currentLang) return;
  setLang(pendingLang);
  showToast(t('Language saved', 'भाषा सेव हो गई'), 'success');
}

function updateAllTexts() {
  // Yahan saare text updates honge (aapke index.html ke hisaab se)
  // Aap keh sakte ho ki main poora index.html de dunga
}

// ============ SEND OTP (Email Link) ============
async function sendEmailOTP() {
  const emailInput = document.getElementById('emailInput');
  const email = emailInput.value.trim();
  const errorEl = document.getElementById('emailError');
  const btn = document.getElementById('sendOtpBtn');

  // Validate email
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showError(errorEl, t('Please enter valid email', 'कृपया सही ईमेल डालें'));
    return;
  }

  errorEl.classList.add('hidden');
  setBtnLoading(btn, true);

  try {
    const actionCodeSettings = {
      url: window.location.origin + window.location.pathname + '?email=' + encodeURIComponent(email),
      handleCodeInApp: true
    };

    await auth.sendSignInLinkToEmail(email, actionCodeSettings);
    localStorage.setItem('emailForSignIn', email);
    currentEmailForLink = email;

    // Show OTP screen / Success message
    document.getElementById('displayEmail').textContent = email;
    showScreen('otp');
    showToast(t('Login link sent to your email!', 'लॉगिन लिंक आपके ईमेल पर भेजा गया!'), 'success');

  } catch (error) {
    console.error('Email error:', error);
    let msg = t('Failed to send link. Try again.', 'लिंक भेजने में समस्या। दोबारा कोशिश करें।');

    if (error.code === 'auth/too-many-requests') {
      msg = t('Too many attempts. Try later.', 'बहुत ज्यादा कोशिशें। बाद में करें।');
    } else if (error.code === 'auth/invalid-email') {
      msg = t('Invalid email address.', 'ईमेल पता सही नहीं है।');
    }

    showError(errorEl, msg);
  } finally {
    setBtnLoading(btn, false);
  }
}

// ============ CHECK EMAIL LINK ON PAGE LOAD ============
async function checkEmailLink() {
  if (auth.isSignInWithEmailLink(window.location.href)) {
    let email = localStorage.getItem('emailForSignIn');
    if (!email) {
      email = window.prompt(t('Please enter your email to confirm', 'कृपया पुष्टि के लिए अपना ईमेल डालें'));
    }
    if (email) {
      try {
        const result = await auth.signInWithEmailLink(email, window.location.href);
        localStorage.removeItem('emailForSignIn');
        handleSuccessfulLogin(result.user);
      } catch (error) {
        console.error('Sign in error:', error);
        showToast(t('Login failed', 'लॉगिन विफल'), 'error');
      }
    }
  }
}

// ============ EMAIL + PASSWORD LOGIN ============
async function loginWithPassword() {
  const email = document.getElementById('emailInput').value.trim();
  const password = document.getElementById('passwordInput').value;
  const errorEl = document.getElementById('emailError');
  const btn = document.getElementById('loginBtn');

  if (!email || !password) {
    showError(errorEl, t('Enter email and password', 'ईमेल और पासवर्ड डालें'));
    return;
  }

  errorEl.classList.add('hidden');
  setBtnLoading(btn, true);

  try {
    const result = await auth.signInWithEmailAndPassword(email, password);
    handleSuccessfulLogin(result.user);
  } catch (error) {
    console.error('Login error:', error);
    let msg = t('Login failed', 'लॉगिन विफल');

    if (error.code === 'auth/user-not-found') {
      msg = t('User not found. Please sign up.', 'यूजर नहीं मिला। कृपया साइन अप करें।');
    } else if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
      msg = t('Wrong email or password', 'ईमेल या पासवर्ड गलत है');
    } else if (error.code === 'auth/invalid-email') {
      msg = t('Invalid email', 'ईमेल सही नहीं');
    }

    showError(errorEl, msg);
  } finally {
    setBtnLoading(btn, false);
  }
}

// ============ SIGN UP (Email + Password) ============
async function signUpWithPassword() {
  const email = document.getElementById('emailInput').value.trim();
  const password = document.getElementById('passwordInput').value;
  const errorEl = document.getElementById('emailError');
  const btn = document.getElementById('signupBtn');

  if (!email || !password) {
    showError(errorEl, t('Enter email and password', 'ईमेल और पासवर्ड डालें'));
    return;
  }

  if (password.length < 6) {
    showError(errorEl, t('Password must be 6+ characters', 'पासवर्ड 6+ अक्षर का होना चाहिए'));
    return;
  }

  errorEl.classList.add('hidden');
  setBtnLoading(btn, true);

  try {
    const result = await auth.createUserWithEmailAndPassword(email, password);
    await result.user.updateProfile({ displayName: email.split('@')[0] });
    showToast(t('Account created!', 'अकाउंट बन गया!'), 'success');
    handleSuccessfulLogin(result.user);
  } catch (error) {
    console.error('Signup error:', error);
    let msg = t('Signup failed', 'साइनअप विफल');

    if (error.code === 'auth/email-already-in-use') {
      msg = t('Email already registered. Please login.', 'ईमेल पहले से रजिस्टर्ड है। लॉगिन करें।');
    } else if (error.code === 'auth/weak-password') {
      msg = t('Password too weak (min 6 chars)', 'पासवर्ड कमजोर है (कम से कम 6 अक्षर)');
    }

    showError(errorEl, msg);
  } finally {
    setBtnLoading(btn, false);
  }
}

// ============ AFTER SUCCESSFUL LOGIN ============
async function handleSuccessfulLogin(user) {
  console.log('✅ Logged in:', user.uid, user.email);

  // Firestore me user document check karo
  try {
    const userDoc = await db.collection('users').doc(user.uid).get();

    if (!userDoc.exists) {
      // Naya user - setup screen
      showScreen('setup');
    } else {
      // Purana user - dashboard
      localStorage.setItem('bsp_userId', user.uid);
      window.location.href = 'dashboard.html';
    }
  } catch (error) {
    console.error('Firestore error:', error);
    showToast(t('Could not verify account data. Please check your connection and try again.', 'अकाउंट डेटा सत्यापित नहीं हो सका। इंटरनेट कनेक्शन जांचें और दोबारा कोशिश करें।'), 'error');
  }
}

// ============ SAVE USER SETUP ============
async function saveSetup() {
  const shopName = document.getElementById('shopName').value.trim();
  const ownerName = document.getElementById('ownerName').value.trim();
  const upiId = document.getElementById('upiId').value.trim();
  const backupEmail = document.getElementById('backupEmail').value.trim();
  const btn = document.getElementById('setupBtn');

  if (!shopName) return showToast(t('Enter shop name', 'दुकान का नाम डालें'), 'error');
  if (!ownerName) return showToast(t('Enter your name', 'अपना नाम डालें'), 'error');

  setBtnLoading(btn, true);

  try {
    const user = auth.currentUser;
    if (!user) throw new Error('No user');

    await db.collection('users').doc(user.uid).set({
      uid: user.uid,
      email: user.email,
      shopName: shopName,
      ownerName: ownerName,
      upiId: upiId || '',
      backupEmail: backupEmail || user.email,
      defaultRate: 2,
      language: currentLang,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    localStorage.setItem('bsp_userId', user.uid);
    window.location.href = 'dashboard.html';

  } catch (error) {
    console.error('Setup error:', error);
    showToast(t('Something went wrong', 'कुछ गड़बड़ हुई'), 'error');
    setBtnLoading(btn, false);
  }
}

// ============ LOGOUT ============
async function logout() {
  if (!confirm(t('Logout? Data will be safe.', 'लॉगआउट करें? डेटा सुरक्षित रहेगा।'))) return;
  try {
    await auth.signOut();
    localStorage.removeItem('bsp_userId');
    window.location.href = 'index.html';
  } catch (error) {
    console.error('Logout error:', error);
  }
}

// ============ AUTO-LOGIN CHECK ============
auth.onAuthStateChanged((user) => {
  if (user) {
    console.log('User already logged in:', user.email);
    // Agar login page par hai aur user logged in hai, to dashboard bhejo
    if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
      db.collection('users').doc(user.uid).get().then(doc => {
        if (doc.exists) {
          window.location.href = 'dashboard.html';
        } else {
          showScreen('setup');
        }
      }).catch((error) => {
        console.error('Auto-login profile check failed:', error);
        showToast(t('Could not load your account. Please check your connection.', 'अकाउंट लोड नहीं हो सका। इंटरनेट कनेक्शन जांचें।'), 'error');
      });
    }
  }
});

// ============ HELPERS ============
function showError(el, msg) {
  if (!el) return;
  el.textContent = msg;
  el.classList.remove('hidden');
}

function setBtnLoading(btn, isLoading) {
  if (!btn) return;
  const txt = btn.querySelector('.btn-text');
  const loader = btn.querySelector('.btn-loader');
  btn.disabled = isLoading;
  if (txt) txt.classList.toggle('hidden', isLoading);
  if (loader) loader.classList.toggle('hidden', !isLoading);
}

function showToast(msg, type) {
  const el = document.getElementById('toast');
  if (!el) { alert(msg); return; }
  el.textContent = msg;
  el.className = 'toast show' + (type ? ' ' + type : '');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 2500);
}

function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById('screen-' + name);
  if (el) el.classList.add('active');
}

// ============ INIT ============
window.addEventListener('load', () => {
  setLang(currentLang);
  checkEmailLink();
});