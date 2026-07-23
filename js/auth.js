/* =====================================================
   SentCor — Authentication Module
   ===================================================== */
window.S = window.S || {};
window.S.auth = window.S.auth || {};

(function () {
  var supabase = null;
  var currentUser = null;
  var isLoginMode = true;

  function getSupabase() {
    if (!supabase && window.S && window.S.supabase) supabase = window.S.supabase;
    return supabase;
  }

  /* -----------------------------------------------------
     DOM references (populated after DOMContentLoaded)
     ----------------------------------------------------- */
  var $authScreen, $mainScreen;
  var $email, $password, $username;
  var $authBtn, $authToggleBtn;
  var $authError;

  /* -----------------------------------------------------
     Initialise DOM handles
     ----------------------------------------------------- */
  function cacheDom() {
    $authScreen = document.getElementById('auth-screen');
    $mainScreen = document.getElementById('main-app-screen');
    $email = document.getElementById('auth-email');
    $password = document.getElementById('auth-password');
    $username = document.getElementById('auth-username');
    $authBtn = document.getElementById('auth-submit');
    $authToggleBtn = document.getElementById('auth-toggle');
    $authError = document.getElementById('auth-error');
  }

  function showAuthError(msg) {
    if ($authError) { $authError.textContent = msg; $authError.style.display = 'block'; }
    window.S.ui.showToast(msg, 'error');
  }
  function hideAuthError() { if ($authError) { $authError.textContent = ''; $authError.style.display = 'none'; } }

  /* -----------------------------------------------------
     Toggle login / register mode
     ----------------------------------------------------- */
  function toggleMode() {
    isLoginMode = !isLoginMode;
    hideAuthError();
    if ($username) $username.style.display = isLoginMode ? 'none' : 'flex';
    if ($authBtn) $authBtn.textContent = isLoginMode ? 'Войти' : 'Зарегистрироваться';
    if ($authToggleBtn) {
      $authToggleBtn.innerHTML = isLoginMode
        ? 'Нет аккаунта? <span>Зарегистрироваться</span>'
        : 'Уже есть аккаунт? <span>Войти</span>';
    }
  }

  /* -----------------------------------------------------
     Submit handler
     ----------------------------------------------------- */
  async function handleSubmit() {
    hideAuthError();
    var email = ($email ? $email.value : '').trim();
    var password = ($password ? $password.value : '').trim();
    var uname = ($username ? $username.value : '').trim();

    if (!email || !password) { showAuthError('Заполните email и пароль'); return; }
    if (!isLoginMode && !uname) { showAuthError('Введите логин'); return; }
    if (password.length < 6) { showAuthError('Пароль должен быть не менее 6 символов'); return; }

    window.S.ui.showLoading(isLoginMode ? 'Вход...' : 'Регистрация...');
    try {
      var client = getSupabase();
      if (!client) throw new Error('Supabase client не инициализирован');
      var result;
      if (isLoginMode) {
        result = await client.auth.signInWithPassword({ email: email, password: password });
      } else {
        result = await client.auth.signUp({ email: email, password: password });
        if (result.data && result.data.user && !result.error) {
          // Create profile row
          var profileRes = await client.from('profiles').upsert({
            id: result.data.user.id,
            username: uname,
            email: email,
            avatar_url: '',
            status: 'online',
            created_at: new Date().toISOString()
          }, { onConflict: 'id' });
          if (profileRes.error) console.warn('[SentCor] Profile upsert warning:', profileRes.error.message);
        }
      }
      if (result.error) throw result.error;
      currentUser = result.data.user;
      window.S.ui.showToast(isLoginMode ? 'Добро пожаловать!' : 'Аккаунт создан!', 'success');
      window.S.auth.onAuthSuccess(currentUser);
    } catch (err) {
      var msg = (err && err.message) ? err.message : 'Неизвестная ошибка';
      if (msg.includes('Invalid login')) msg = 'Неверный email или пароль';
      if (msg.includes('already registered')) msg = 'Пользователь уже зарегистрирован';
      if (msg.includes('Password should')) msg = 'Пароль слишком короткий';
      showAuthError(msg);
    } finally {
      window.S.ui.hideLoading();
    }
  }

  /* -----------------------------------------------------
     Check existing session
     ----------------------------------------------------- */
  async function checkSession() {
    try {
      var client = getSupabase();
      if (!client) return null;
      var res = await client.auth.getSession();
      if (res.data && res.data.session && res.data.session.user) {
        currentUser = res.data.session.user;
        window.S.auth.onAuthSuccess(currentUser);
        return currentUser;
      }
    } catch (e) { console.warn('[SentCor] Session check:', e.message); }
    return null;
  }

  /* -----------------------------------------------------
     Logout
     ----------------------------------------------------- */
  async function logout() {
    try {
      var client = getSupabase();
      if (client) {
        // Set status to offline before signing out
        if (currentUser) {
          await client.from('profiles').upsert({ id: currentUser.id, status: 'offline' }, { onConflict: 'id' });
        }
        await client.auth.signOut();
      }
    } catch (e) { console.warn('[SentCor] Logout:', e.message); }
    currentUser = null;
    if ($authScreen) $authScreen.classList.add('active');
    if ($mainScreen) $mainScreen.classList.remove('active');
    window.S.ui.showToast('Вы вышли из аккаунта', 'info');
  }

  /* -----------------------------------------------------
     Public API
     ----------------------------------------------------- */
  window.S.auth.init = function () {
    cacheDom();
    if ($authToggleBtn) $authToggleBtn.addEventListener('click', toggleMode);
    if ($authBtn) $authBtn.addEventListener('click', handleSubmit);
    if ($password) $password.addEventListener('keydown', function (e) { if (e.key === 'Enter') handleSubmit(); });
    if ($email) $email.addEventListener('keydown', function (e) { if (e.key === 'Enter') handleSubmit(); });
    if ($username) {
      $username.style.display = 'none';
      $username.addEventListener('keydown', function (e) { if (e.key === 'Enter') handleSubmit(); });
    }
    toggleMode(); // set initial state
    checkSession();
  };

  window.S.auth.onAuthSuccess = function onAuthSuccess(user) {
    currentUser = user;
    if ($authScreen) $authScreen.classList.remove('active');
    if ($mainScreen) $mainScreen.classList.add('active');
    // Trigger app initialization after auth
    if (window.S.app && window.S.app.onLogin) window.S.app.onLogin(user);
  };

  window.S.auth.logout = logout;
  window.S.auth.getUser = function () { return currentUser; };
  window.S.auth.refreshUser = async function () {
    try {
      var client = getSupabase();
      if (!client) return currentUser;
      var res = await client.auth.getUser();
      if (res.data && res.data.user) currentUser = res.data.user;
    } catch (e) { /* noop */ }
    return currentUser;
  };
})();