/* =====================================================
   SentCor — Authentication Module
   ===================================================== */
window.S = window.S || {};
window.S.auth = window.S.auth || {};

(function () {
  var supabase = null;
  var currentUser = null;
  var currentProfile = null;
  var isLoginMode = true;

  function getSupabase() {
    if (!supabase && window.S && window.S.supabase) supabase = window.S.supabase;
    return supabase;
  }

  var $authScreen, $mainScreen, $email, $password, $username, $authBtn, $authToggleBtn, $authError;

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

  function toggleMode() {
    isLoginMode = !isLoginMode;
    hideAuthError();
    if ($username) $username.style.display = isLoginMode ? 'none' : 'block';
    if ($authBtn) $authBtn.textContent = isLoginMode ? 'Войти' : 'Зарегистрироваться';
    if ($authToggleBtn) {
      $authToggleBtn.innerHTML = isLoginMode
        ? 'Нет аккаунта? <span class="auth-link">Зарегистрироваться</span>'
        : 'Уже есть аккаунт? <span class="auth-link">Войти</span>';
    }
  }

  async function handleSubmit() {
    hideAuthError();
    var email = ($email ? $email.value : '').trim();
    var password = ($password ? $password.value : '').trim();
    var uname = ($username ? $username.value : '').trim();
    if (!email || !password) { showAuthError('Заполните email и пароль'); return; }
    if (!isLoginMode && !uname) { showAuthError('Введите логин'); return; }
    if (password.length < 6) { showAuthError('Пароль должен быть не менее 6 символов'); return; }
    if (!isLoginMode && uname.length < 3) { showAuthError('Логин минимум 3 символа'); return; }

    window.S.ui.showLoading(isLoginMode ? 'Вход...' : 'Регистрация...');
    try {
      var client = getSupabase();
      if (!client) throw new Error('Supabase не инициализирован');
      var result;
      if (isLoginMode) {
        result = await client.auth.signInWithPassword({ email: email, password: password });
      } else {
        result = await client.auth.signUp({ email: email, password: password });
        if (result.data && result.data.user && !result.error) {
          await client.from('profiles').upsert({
            id: result.data.user.id, username: uname, email: email,
            avatar_url: '', status: 'online', bio: '', created_at: new Date().toISOString()
          }, { onConflict: 'id' });
        }
      }
      if (result.error) throw result.error;
      currentUser = result.data.user;
      await fetchProfile();
      window.S.ui.showToast(isLoginMode ? 'Добро пожаловать!' : 'Аккаунт создан!', 'success');
      window.S.auth.onAuthSuccess(currentUser);
    } catch (err) {
      var msg = (err && err.message) ? err.message : 'Ошибка';
      if (msg.includes('Invalid login')) msg = 'Неверный email или пароль';
      if (msg.includes('already registered')) msg = 'Email уже зарегистрирован';
      showAuthError(msg);
    } finally {
      window.S.ui.hideLoading();
    }
  }

  async function fetchProfile() {
    if (!currentUser) return null;
    try {
      var client = getSupabase();
      if (!client) return null;
      var res = await client.from('profiles').select('id, username, avatar_url, status, email, bio').eq('id', currentUser.id).single();
      if (res.data) currentProfile = res.data;
    } catch (e) { console.warn('[SentCor] fetchProfile:', e.message); }
    return currentProfile;
  }

  async function checkSession() {
    try {
      var client = getSupabase();
      if (!client) return null;
      var res = await client.auth.getSession();
      if (res.data && res.data.session && res.data.session.user) {
        currentUser = res.data.session.user;
        await fetchProfile();
        window.S.auth.onAuthSuccess(currentUser);
        return currentUser;
      }
    } catch (e) { console.warn('[SentCor] Session check:', e.message); }
    return null;
  }

  async function logout() {
    try {
      var client = getSupabase();
      if (client && currentUser) {
        await client.from('profiles').upsert({ id: currentUser.id, status: 'offline' }, { onConflict: 'id' });
        await client.auth.signOut();
      }
    } catch (e) { console.warn('[SentCor] Logout:', e.message); }
    currentUser = null;
    currentProfile = null;
    if ($authScreen) $authScreen.classList.add('active');
    if ($mainScreen) $mainScreen.classList.remove('active');
    window.S.ui.showToast('Вы вышли', 'info');
  }

  window.S.auth.init = function () {
    cacheDom();
    if ($authToggleBtn) $authToggleBtn.addEventListener('click', toggleMode);
    if ($authBtn) $authBtn.addEventListener('click', handleSubmit);
    [$password, $email, $username].forEach(function (el) {
      if (el) el.addEventListener('keydown', function (e) { if (e.key === 'Enter') handleSubmit(); });
    });
    if ($username) $username.style.display = 'none';
    toggleMode();
    checkSession();
  };

  window.S.auth.onAuthSuccess = function (user) {
    currentUser = user;
    if ($authScreen) $authScreen.classList.remove('active');
    if ($mainScreen) $mainScreen.classList.add('active');
    if (window.S.app && window.S.app.onLogin) window.S.app.onLogin(user);
  };

  window.S.auth.logout = logout;
  window.S.auth.getUser = function () { return currentUser; };
  window.S.auth.getProfile = function () { return currentProfile; };
  window.S.auth.fetchProfile = fetchProfile;
  window.S.auth.updateProfile = async function (data) {
    if (!currentUser) return { error: 'Не авторизован' };
    try {
      var client = getSupabase();
      if (!client) return { error: 'Supabase не инициализирован' };
      var res = await client.from('profiles').upsert(Object.assign({ id: currentUser.id }, data), { onConflict: 'id' });
      if (res.error) throw res.error;
      await fetchProfile();
      return { success: true };
    } catch (e) { return { error: e.message }; }
  };
})();