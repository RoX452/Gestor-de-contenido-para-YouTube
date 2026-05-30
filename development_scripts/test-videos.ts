import fetch from 'node-fetch';

async function run() {
  const channelUrl = 'https://www.youtube.com/@LaPsicologiaInvisible';
  const url = channelUrl + '/videos';
  
  const res = await fetch(url, { headers: { "Accept-Language": "en-US,en;q=0.9" } });
  const html = await res.text();
  
  let match = html.match(/var ytInitialData = (\{.*?\});/);
  if(!match) return console.log("no data");
  
  const ytData = JSON.parse(match[1]);
  const tabs = ytData.contents?.twoColumnBrowseResultsRenderer?.tabs || [];
  const tab = tabs.find((t: any) => t.tabRenderer?.title?.toLowerCase() === 'videos' || t.tabRenderer?.endpoint?.commandMetadata?.webCommandMetadata?.url?.includes('/videos'));
  if (!tab) return console.log("no videos tab");
  
  console.log("Found tab:", tab.tabRenderer.title);
  const grid = tab.tabRenderer.content.richGridRenderer;
  if(!grid) {
     console.log("No rich grid!");
     console.log(JSON.stringify(tab.tabRenderer.content, null, 2).substring(0, 500));
     return;
  }
  const items = grid.contents || [];
  console.log("Items length:", items.length);
  for(const item of items) {
     if(item.richItemRenderer) {
       console.log(JSON.stringify(item.richItemRenderer.content, null, 2).substring(0, 200));
       break;
     }
  }
}

run();
