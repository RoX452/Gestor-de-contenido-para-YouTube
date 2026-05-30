import http from 'http';

const req = http.request({
  hostname: '127.0.0.1',
  port: 3000,
  path: '/api/v2/transcript',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('STATUS:', res.statusCode);
    console.log('BODY:', data.substring(0, 200));
  });
});

req.on('error', e => console.error('ERROR:', e.message));
req.write(JSON.stringify({ url: 'https://youtube.com/watch?v=123' }));
req.end();
