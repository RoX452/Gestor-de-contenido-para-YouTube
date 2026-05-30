import { ApifyClient } from 'apify-client';

const client = new ApifyClient({ token: 'YOUR_APIFY_TOKEN' });

async function check() {
  try {
    const list = await client.runs().list();
    const lastRunId = list.items[0].id;
    const run = await client.run(lastRunId).get();
    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    const item = items[0] as any;
    console.log(Object.keys(item));
    if (item.transcript_text) console.log(String(item.transcript_text).substring(0, 100));
    if (item.text) console.log(String(item.text).substring(0, 100));
    if (item.transcript) console.log(typeof item.transcript);
  } catch(e) {
    console.error(e.message);
  }
}
check();
