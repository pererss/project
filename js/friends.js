/* =====================================================
   SentCor — Friends Module
   ===================================================== */
window.S = window.S || {};
window.S.friends = window.S.friends || {};

(function () {
  var supabase = null;
  var friends = [];
  var pendingRequests = [];
  var _subscribed = false;

  function getSupabase() {
    if (!supabase && window.S && window.S.supabase) supabase = window.S.supabase;
    return supabase;
  }

  var PROFILE_FIELDS = 'id, username, avatar_url, status, email, bio';

  async function fetchFriends() {
    var user = window.S.auth.getUser();
    if (!user) return [];
    try {
      var client = getSupabase();
      if (!client) return [];
      var res = await client
        .from('friend_requests')
        .select('id, from_user, to_user, status, created_at')
        .or('from_user.eq.' + user.id + ',to_user.eq.' + user.id)
        .eq('status', 'accepted');
      if (res.error) throw res.error;
      var reqs = res.data || [];
      var ids = [];
      reqs.forEach(function (r) { var fid = r.from_user === user.id ? r.to_user : r.from_user; if (ids.indexOf(fid) === -1) ids.push(fid); });
      if (ids.length === 0) { friends = []; return friends; }
      var pRes = await client.from('profiles').select(PROFILE_FIELDS).in('id', ids);
      if (pRes.error) throw pRes.error;
      friends = pRes.data || [];
      return friends;
    } catch (e) { console.error('[SentCor] fetchFriends:', e.message); friends = []; return friends; }
  }

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
      var reqs = res.data || [];
      var sids = reqs.map(function (r) { return r.from_user; });
      if (sids.length === 0) { pendingRequests = []; return pendingRequests; }
      var pRes = await client.from('profiles').select(PROFILE_FIELDS).in('id', sids);
      if (pRes.error) throw pRes.error;
      var pMap = {};
      (pRes.data || []).forEach(function (p) { pMap[p.id] = p; });
      pendingRequests = reqs.map(function (r) {
        return { id: r.id, from_user: r.from_user, to_user: r.to_user, status: r.status, created_at: r.created_at, profile: pMap[r.from_user] || null };
      });
      return pendingRequests;
    } catch (e) { console.error('[SentCor] fetchPending:', e.message); pendingRequests = []; return pendingRequests; }
  }

  async function searchUsers(query) {
    var user = window.S.auth.getUser();
    if (!user || !query || query.trim() === '') return [];
    try {
      var client = getSupabase();
      if (!client) return [];
      var res = await client.from('profiles').select(PROFILE_FIELDS).eq('username', query.trim()).neq('id', user.id);
      if (res.error) throw res.error;
      return res.data || [];
    } catch (e) { console.error('[SentCor] searchUsers:', e.message); return []; }
  }

  async function sendRequest(toUserId) {
    var user = window.S.auth.getUser();
    if (!user) return { error: 'Не авторизован' };
    try {
      var client = getSupabase();
      if (!client) return { error: 'Supabase не инициализирован' };
      var existing = await client
        .from('friend_requests')
        .select('id, status')
        .or('and(from_user.eq.' + user.id + ',to_user.eq.' + toUserId + '),and(from_user.eq.' + toUserId + ',to_user.eq.' + user.id + ')');
      if (existing.error) throw existing.error;
      if (existing.data && existing.data.length > 0) {
        var sts = existing.data.map(function (r) { return r.status; });
        if (sts.indexOf('accepted') !== -1) return { error: 'Уже в друзьях' };
        if (sts.indexOf('pending') !== -1) return { error: 'Запрос уже отправлен' };
      }
      var res = await client.from('friend_requests').insert({
        from_user: user.id, to_user: toUserId, status: 'pending', created_at: new Date().toISOString()
      });
      if (res.error) throw res.error;
      return { success: true };
    } catch (e) { return { error: e.message }; }
  }

  async function respondRequest(requestId, accept) {
    var user = window.S.auth.getUser();
    if (!user) return { error: 'Не авторизован' };
    try {
      var client = getSupabase();
      if (!client) return { error: 'Supabase не инициализирован' };
      if (accept) {
        var res = await client.from('friend_requests').update({ status: 'accepted' }).eq('id', requestId);
        if (res.error) throw res.error;
      } else {
        var res2 = await client.from('friend_requests').delete().eq('id', requestId);
        if (res2.error) throw res2.error;
      }
      return { success: true };
    } catch (e) { return { error: e.message }; }
  }

  async function removeFriend(friendId) {
    var user = window.S.auth.getUser();
    if (!user) return { error: 'Не авторизован' };
    try {
      var client = getSupabase();
      if (!client) return { error: 'Supabase не инициализирован' };
      var res = await client.from('friend_requests').delete()
        .or('and(from_user.eq.' + user.id + ',to_user.eq.' + friendId + '),and(from_user.eq.' + friendId + ',to_user.eq.' + user.id + ')');
      if (res.error) throw res.error;
      return { success: true };
    } catch (e) { return { error: e.message }; }
  }

  function subscribeRealtime() {
    if (_subscribed) return;
    try {
      var client = getSupabase();
      if (!client) return;
      client.channel('public:friend_requests')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'friend_requests' }, function () {
          if (window.S.friends.onUpdate) window.S.friends.onUpdate();
        }).subscribe();
      _subscribed = true;
    } catch (e) { console.warn('[SentCor] friends realtime:', e.message); }
  }

  window.S.friends.fetchFriends = fetchFriends;
  window.S.friends.fetchPending = fetchPending;
  window.S.friends.searchUsers = searchUsers;
  window.S.friends.sendRequest = sendRequest;
  window.S.friends.respondRequest = respondRequest;
  window.S.friends.removeFriend = removeFriend;
  window.S.friends.getFriends = function () { return friends; };
  window.S.friends.getPending = function () { return pendingRequests; };
  window.S.friends.subscribeRealtime = subscribeRealtime;
  window.S.friends.onUpdate = null;
})();