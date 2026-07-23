/* =====================================================
   SentCor — Friends Module
   ===================================================== */
window.S = window.S || {};
window.S.friends = window.S.friends || {};

(function () {
  var supabase = null;
  var friends = [];           // { id, username, avatar_url, status, email }
  var pendingRequests = [];   // { id, from_user, to_user, status, created_at, profile }
  var _subscribed = false;

  function getSupabase() {
    if (!supabase && window.S && window.S.supabase) supabase = window.S.supabase;
    return supabase;
  }

  /* -----------------------------------------------------
     Fetch friends list (accepted requests)
     ----------------------------------------------------- */
  async function fetchFriends() {
    var user = window.S.auth.getUser();
    if (!user) return [];
    try {
      var client = getSupabase();
      if (!client) return [];
      // Get accepted friend requests where current user is either sender or receiver
      var res = await client
        .from('friend_requests')
        .select('id, from_user, to_user, status, created_at')
        .or('from_user.eq.' + user.id + ',to_user.eq.' + user.id)
        .eq('status', 'accepted');
      if (res.error) throw res.error;
      var requestList = res.data || [];
      // Get unique friend IDs
      var friendIds = [];
      requestList.forEach(function (r) {
        var fid = r.from_user === user.id ? r.to_user : r.from_user;
        if (friendIds.indexOf(fid) === -1) friendIds.push(fid);
      });
      if (friendIds.length === 0) { friends = []; return friends; }
      // Fetch profiles
      var profilesRes = await client
        .from('profiles')
        .select('id, username, avatar_url, status, email')
        .in('id', friendIds);
      if (profilesRes.error) throw profilesRes.error;
      friends = profilesRes.data || [];
      return friends;
    } catch (e) {
      console.error('[SentCor] fetchFriends:', e.message);
      friends = [];
      return friends;
    }
  }

  /* -----------------------------------------------------
     Fetch pending friend requests (incoming)
     ----------------------------------------------------- */
  async function fetchPending() {
    var user = window.S.auth.getUser();
    if (!user) return [];
    try {
      var client = getSupabase();
      if (!client) return [];
      var res = await client
        .from('friend_requests')
        .select('id, from_user, to_user, status, created_at')
        .eq('to_user', user.id)
        .eq('status', 'pending');
      if (res.error) throw res.error;
      var requestList = res.data || [];
      // Fetch sender profiles
      var senderIds = requestList.map(function (r) { return r.from_user; });
      if (senderIds.length === 0) { pendingRequests = []; return pendingRequests; }
      var profilesRes = await client
        .from('profiles')
        .select('id, username, avatar_url, status, email')
        .in('id', senderIds);
      if (profilesRes.error) throw profilesRes.error;
      var profilesMap = {};
      (profilesRes.data || []).forEach(function (p) { profilesMap[p.id] = p; });
      pendingRequests = requestList.map(function (r) {
        return { id: r.id, from_user: r.from_user, to_user: r.to_user, status: r.status, created_at: r.created_at, profile: profilesMap[r.from_user] || null };
      });
      return pendingRequests;
    } catch (e) {
      console.error('[SentCor] fetchPending:', e.message);
      pendingRequests = [];
      return pendingRequests;
    }
  }

  /* -----------------------------------------------------
     Search users by username (for add-friend tab)
     ----------------------------------------------------- */
  async function searchUsers(query) {
    var user = window.S.auth.getUser();
    if (!user || !query || query.trim() === '') return [];
    try {
      var client = getSupabase();
      if (!client) return [];
      var res = await client
        .from('profiles')
        .select('id, username, avatar_url, status, email')
        .eq('username', query.trim())
        .neq('id', user.id);
      if (res.error) throw res.error;
      return res.data || [];
    } catch (e) {
      console.error('[SentCor] searchUsers:', e.message);
      return [];
    }
  }

  /* -----------------------------------------------------
     Send friend request
     ----------------------------------------------------- */
  async function sendRequest(toUserId) {
    var user = window.S.auth.getUser();
    if (!user) return { error: 'Не авторизован' };
    try {
      var client = getSupabase();
      if (!client) return { error: 'Supabase не инициализирован' };
      // Check if already friends or request exists
      var existing = await client
        .from('friend_requests')
        .select('id, status')
        .or('and(from_user.eq.' + user.id + ',to_user.eq.' + toUserId + '),and(from_user.eq.' + toUserId + ',to_user.eq.' + user.id + ')');
      if (existing.error) throw existing.error;
      if (existing.data && existing.data.length > 0) {
        var statuses = existing.data.map(function (r) { return r.status; });
        if (statuses.indexOf('accepted') !== -1) return { error: 'Уже в друзьях' };
        if (statuses.indexOf('pending') !== -1) return { error: 'Запрос уже отправлен' };
      }
      var res = await client.from('friend_requests').insert({
        from_user: user.id,
        to_user: toUserId,
        status: 'pending',
        created_at: new Date().toISOString()
      });
      if (res.error) throw res.error;
      return { success: true };
    } catch (e) {
      return { error: e.message };
    }
  }

  /* -----------------------------------------------------
     Accept / decline friend request
     ----------------------------------------------------- */
  async function respondRequest(requestId, accept) {
    var user = window.S.auth.getUser();
    if (!user) return { error: 'Не авторизован' };
    try {
      var client = getSupabase();
      if (!client) return { error: 'Supabase не инициализирован' };
      if (accept) {
        var res = await client
          .from('friend_requests')
          .update({ status: 'accepted' })
          .eq('id', requestId);
        if (res.error) throw res.error;
      } else {
        var res2 = await client
          .from('friend_requests')
          .delete()
          .eq('id', requestId);
        if (res2.error) throw res2.error;
      }
      return { success: true };
    } catch (e) {
      return { error: e.message };
    }
  }

  /* -----------------------------------------------------
     Realtime subscription for friend_requests
     ----------------------------------------------------- */
  function subscribeRealtime() {
    if (_subscribed) return;
    try {
      var client = getSupabase();
      if (!client) return;
      client
        .channel('public:friend_requests')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'friend_requests' }, function (payload) {
          // Refresh friends & pending on any change
          if (window.S.friends.onUpdate) window.S.friends.onUpdate();
        })
        .subscribe();
      _subscribed = true;
    } catch (e) {
      console.warn('[SentCor] friends realtime subscribe:', e.message);
    }
  }

  /* -----------------------------------------------------
     Public API
     ----------------------------------------------------- */
  window.S.friends.fetchFriends = fetchFriends;
  window.S.friends.fetchPending = fetchPending;
  window.S.friends.searchUsers = searchUsers;
  window.S.friends.sendRequest = sendRequest;
  window.S.friends.respondRequest = respondRequest;
  window.S.friends.getFriends = function () { return friends; };
  window.S.friends.getPending = function () { return pendingRequests; };
  window.S.friends.subscribeRealtime = subscribeRealtime;
  window.S.friends.onUpdate = null; // set by app.js
})();