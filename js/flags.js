/* Flip to true when the season app is ready, then redeploy. */
window.APP_LIVE = false;
if (!window.APP_LIVE) { document.documentElement.classList.add('app-offline'); }
