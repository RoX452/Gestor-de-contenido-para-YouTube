import fs from 'fs';

async function run() {
  const rs = await fetch('https://www.youtube.com/@XavierMitjana/videos', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9,es;q=0.8'
      }
  });
  const html = await rs.text();
  const match = html.match(/ytInitialData\s*=\s*({.+?});/);
  const data = JSON.parse(match[1]);
  let keyMatch = html.match(/"INNERTUBE_API_KEY":"([^"]+)"/);
  const apiKey = keyMatch?.[1];
  
  function findContinuationToken(obj: any): string | null {
    if (!obj || typeof obj !== 'object') return null;
    if (obj.continuationEndpoint && obj.continuationEndpoint.continuationCommand && obj.continuationEndpoint.continuationCommand.token) {
        return obj.continuationEndpoint.continuationCommand.token;
    }
    for (const k of Object.keys(obj)) {
        const res = findContinuationToken(obj[k]);
        if (res) return res;
    }
    return null;
  }
  const token = findContinuationToken(data);
  const response = await fetch(`https://www.youtube.com/youtubei/v1/browse?key=${apiKey}`, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
    body: JSON.stringify({
      context: { client: { clientName: 'WEB', clientVersion: '2.20240321.01.00' } },
      continuation: token
    })
  });
  
  const nextData = await response.json();
  let items = [];
  const actions = nextData.onResponseReceivedActions;
  if (actions) {
      for (const action of actions) {
          if (action.appendContinuationItemsAction && action.appendContinuationItemsAction.continuationItems) {
              items.push(...action.appendContinuationItemsAction.continuationItems);
          }
      }
  }
  const lockup = items[0]?.richItemRenderer?.content?.lockupViewModel;
  console.log("lockup:", JSON.stringify(lockup, null, 2));
}
run();
