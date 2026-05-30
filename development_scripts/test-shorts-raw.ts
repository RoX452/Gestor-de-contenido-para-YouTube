import fetch from 'node-fetch';

async function run() {
  const channelUrl = 'https://www.youtube.com/@nanobanana';
  const url = channelUrl + '/shorts';
  
  const res = await fetch(url, { headers: { "Accept-Language": "en-US,en;q=0.9" } });
  const html = await res.text();
  
  let match = html.match(/var ytInitialData = (\{.*?\});/);
  if(!match) return console.log("no data");
  
  const ytData = JSON.parse(match[1]);
  const tabs = ytData.contents?.twoColumnBrowseResultsRenderer?.tabs || [];
  console.log("Tabs:", tabs.map((t: any) => t.tabRenderer?.title));
  const tab = tabs.find((t: any) => t.tabRenderer?.title?.toLowerCase() === 'shorts' || t.tabRenderer?.endpoint?.commandMetadata?.webCommandMetadata?.url?.includes('/shorts'));
  if (!tab) return console.log("no shorts tab");
  
  const grid = tab.tabRenderer.content.richGridRenderer;
  const items = grid.contents || [];
  for(const item of items) {
     if(item.richItemRenderer) {
       console.log(JSON.stringify(item.richItemRenderer.content, null, 2));
       break;
     }
  }
}

run();
