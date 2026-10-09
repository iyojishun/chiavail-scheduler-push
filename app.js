/* No registration backend, remote POST or permission prompt on load. */
(() => {
  'use strict';
  const get = id => document.getElementById(id);
  const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const config = self.CHIAVAIL_PUSH || {};
  let registration, busy = false;
  const supported = window.isSecureContext && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  const configured = /^[A-Za-z0-9_-]{87}={0,2}$/.test(config.vapidPublicKey || '') && /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(config.schedulerUrl || '');
  function show(subscription) {
    get('state').textContent = subscription ? '登録済み' : Notification.permission === 'granted' ? '許可済み' : '未登録';
    get('export').hidden = !subscription;
    if (subscription) get('subscription').value = JSON.stringify(subscription.toJSON(), null, 2);
  }
  function serverKey(value) {
    const raw = atob(value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4));
    return Uint8Array.from(raw, c => c.charCodeAt(0));
  }
  if (!supported || !standalone || !configured) {
    get('message').textContent = !supported ? 'この環境はWeb Pushに対応していません。iOS 16.4以降を使用してください。' : !standalone ? 'ホーム画面に追加し、そのアイコンから開いてください。' : '公開用設定（VAPID公開鍵・スケジューラURL）が未設定です。';
    return;
  }
  const ready = navigator.serviceWorker.register('./sw.js').then(() => navigator.serviceWorker.ready).then(async reg => {
    registration = reg;
    show(await reg.pushManager.getSubscription());
    get('enable').disabled = false;
  }).catch(() => { get('message').textContent = '登録の準備に失敗しました。HTTPS接続を確認して開き直してください。'; });
  get('enable').addEventListener('click', async () => {
    if (busy || !registration) return;
    busy = true; get('enable').disabled = true;
    try {
      // Request immediately inside the explicit tap, before awaiting any other work.
      const permission = await Notification.requestPermission();
      get('state').textContent = permission === 'granted' ? '許可済み' : '未登録';
      if (permission !== 'granted') { get('message').textContent = '通知が許可されていません。iPhoneの設定を確認してください。'; return; }
      const subscription = await registration.pushManager.getSubscription() || await registration.pushManager.subscribe({userVisibleOnly: true, applicationServerKey: serverKey(config.vapidPublicKey)});
      show(subscription);
      get('message').textContent = '購読情報を作成しました';
    } catch (_) { get('message').textContent = '購読情報を作成できませんでした。接続・通知設定を確認してください。'; }
    finally { busy = false; get('enable').disabled = false; }
  });
  get('copy').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(get('subscription').value); get('message').textContent = '購読情報をコピーしました'; }
    catch (_) { get('subscription').select(); get('message').textContent = 'JSONを選択しました。手動でコピーしてください。'; }
  });
  get('download').addEventListener('click', () => {
    const url = URL.createObjectURL(new Blob([get('subscription').value], {type:'application/json'}));
    const link = document.createElement('a'); link.href = url; link.download = 'webpush-subscription.json'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
})();
