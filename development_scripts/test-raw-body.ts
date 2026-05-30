import fetch from 'node-fetch';

async function run() {
  const req = await fetch('http://localhost:3000/api/v2/radar', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({ channelUrl: "https://www.youtube.com/@nanobanana" })
  });
  const text = await req.text();
  console.log(text.substring(0, 500));
}

run();
