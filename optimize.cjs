const fs = require('fs');

let content = fs.readFileSync('src/components/Radar.tsx', 'utf8');

// 1. We need to move passesN8nViral and cleanSubsNum out.
// Let's find them inside Radar and extract them.
const radarStartIdx = content.indexOf('export function Radar');

// find passesN8nViral inside
const n8nMatch = content.match(/  const passesN8nViral = \(v: RadarVideo\) => \{[\s\S]*?  \};/);
if (n8nMatch) {
  content = content.replace(n8nMatch[0], ''); // remove from inside
  // add it before Radar
  content = content.replace('export function Radar', n8nMatch[0].replace(/  const/g, 'const') + '\n\nexport function Radar');
}

// find cleanSubsNum
const cleanSubsMatch = content.match(/  const cleanSubsNum = \(subsStr: string\) => \{[\s\S]*?  \};/);
if (cleanSubsMatch) {
  content = content.replace(cleanSubsMatch[0], ''); // remove from inside
  // add it before Radar
  content = content.replace('export function Radar', cleanSubsMatch[0].replace(/  const/g, 'const') + '\n\nexport function Radar');
}

// 2. Replace `getChannelViralStats` with a useMemo object
const getChannelMatch = content.match(/  const getChannelViralStats = \(channelUrl: string\) => \{[\s\S]*?  \};/);
if (getChannelMatch) {
  content = content.replace(getChannelMatch[0], `  const channelViralStats = useMemo(() => {
    const stats: Record<string, { total: number, viralCount: number, ratio: number }> = {};
    channels.forEach(url => stats[url] = { total: 0, viralCount: 0, ratio: 0, successCount: 0 });
    
    videos.forEach(v => {
      if (!v.channelUrl || !stats[v.channelUrl]) return;
      stats[v.channelUrl].total++;
      if (passesN8nViral(v)) stats[v.channelUrl].viralCount++;
      if (v.isViral === true || v.statusCode === 9 || v.statusCode === 8) stats[v.channelUrl].successCount++;
    });
    
    Object.keys(stats).forEach(url => {
      const s = stats[url];
      s.ratio = s.total > 0 ? Math.round((s.successCount / s.total) * 100) : 0;
    });
    return stats;
  }, [videos, channels]);`);
}

// 3. Update all usages of getChannelViralStats to channelViralStats[url] || {total:0, viralCount:0, ratio:0}
content = content.replace(/getChannelViralStats\((.*?)\)/g, '(channelViralStats[$1] || { total: 0, viralCount: 0, ratio: 0 })');


// 4. Wrap strictlyViralVideos
const strictlyMatch = content.match(/  const strictlyViralVideos = videos\s*\n\s*\.filter\(passesN8nViral\)\s*\n\s*\.sort\(\(a, b\) => \(a\.daysSince \|\| 99999\) - \(b\.daysSince \|\| 99999\)\);/);
if (strictlyMatch) {
  content = content.replace(strictlyMatch[0], `  const strictlyViralVideos = useMemo(() => {
    return videos
      .filter(passesN8nViral)
      .sort((a, b) => (a.daysSince || 99999) - (b.daysSince || 99999));
  }, [videos]);`);
}

// 5. Wrap currentChannelVideos and the totals
const currentChannelMatch = content.match(/  const currentChannelVideos = videos\.filter\(v => \s*\n\s*selectedChannelUrl === 'all' \|\| v\.channelUrl === selectedChannelUrl\s*\n\s*\);/);
if (currentChannelMatch) {
  content = content.replace(currentChannelMatch[0], `  const currentChannelVideos = useMemo(() => {
    return videos.filter(v => selectedChannelUrl === 'all' || v.channelUrl === selectedChannelUrl);
  }, [videos, selectedChannelUrl]);`);
}

content = content.replace(/  const totalStandardVideos = currentChannelVideos\.filter\(v => \{\s*\n\s*if \(v\.formatType\) return v\.formatType === 'videos';\s*\n\s*return \(v\.durationSec \|\| 0\) > 180;\s*\n\s*\}\)\.length;/g, `  const totalStandardVideos = useMemo(() => currentChannelVideos.filter(v => {
    if (v.formatType) return v.formatType === 'videos';
    return (v.durationSec || 0) > 180;
  }).length, [currentChannelVideos]);`);

content = content.replace(/  const totalShorts = currentChannelVideos\.filter\(v => \{\s*\n\s*if \(v\.formatType\) return v\.formatType === 'shorts';\s*\n\s*return \(v\.durationSec \|\| 0\) <= 180;\s*\n\s*\}\)\.length;/g, `  const totalShorts = useMemo(() => currentChannelVideos.filter(v => {
    if (v.formatType) return v.formatType === 'shorts';
    return (v.durationSec || 0) <= 180;
  }).length, [currentChannelVideos]);`);

content = content.replace(/  const totalStreams = currentChannelVideos\.filter\(v => \{\s*\n\s*if \(v\.formatType\) return v\.formatType === 'streams';\s*\n\s*return false;\s*\n\s*\}\)\.length;/g, `  const totalStreams = useMemo(() => currentChannelVideos.filter(v => {
    if (v.formatType) return v.formatType === 'streams';
    return false;
  }).length, [currentChannelVideos]);`);


// 6. Wrap filteredVideos
const filteredMatch = content.match(/  const filteredVideos = videos\s*\n\s*\.filter\(v => \{[\s\S]*?\}\)\s*\n\s*\.sort\(\(a, b\) => \{[\s\S]*?\}\);/);
if (filteredMatch) {
  content = content.replace(filteredMatch[0], `  const filteredVideos = useMemo(() => {
    return videos
      .filter(v => {
        // 1. Channel Filter
        if (selectedChannelUrl !== 'all' && v.channelUrl !== selectedChannelUrl) return false;
        
        // 2. Keyword Search
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const titleMatch = v.title.toLowerCase().includes(q);
          const chanMatch = v.channelName?.toLowerCase().includes(q) || false;
          if (!titleMatch && !chanMatch) return false;
        }

        // 3. Status Filter
        if (filterStatus !== 'all' && v.statusCode !== filterStatus) return false;

        // 4. Format Filter
        if (filterFormat === 'short') {
          const isShort = (v.durationSec || 0) <= 180;
          if (!isShort) return false;
        } else if (filterFormat === 'video') {
          const isShort = (v.durationSec || 0) <= 180;
          if (isShort) return false;
        }

        // 5. Days since filter Limit
        if (filterDaysLimit !== 'all') {
          const days = v.daysSince || 1;
          if (days > filterDaysLimit) return false;
        }

        return true;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case 'views':
            return (b.views || 0) - (a.views || 0);
          case 'velocity':
            return (b.velocity || 0) - (a.velocity || 0);
          case 'viralRatio':
            return (b.viralRatio || 0) - (a.viralRatio || 0);
          case 'dailyViews':
            return (b.dailyViews || 0) - (a.dailyViews || 0);
          case 'engagement':
            return (b.engagementRate || 0) - (a.engagementRate || 0);
          case 'date':
          default:
            return (a.daysSince || 99999) - (b.daysSince || 99999);
        }
      });
  }, [videos, selectedChannelUrl, searchQuery, filterStatus, filterFormat, filterDaysLimit, sortBy]);`);
}


// we need to make sure useMemo is imported
if (!content.includes('useMemo')) {
  // It should be imported. If not, add it.
  content = content.replace(/import React, \{([^}]*)\} from 'react';/, "import React, { $1, useMemo } from 'react';");
  // Or:
  content = content.replace(/import \{([^}]*)\} from 'react';/, (match, group1) => {
    if (group1.includes('useMemo')) return match;
    return `import {${group1}, useMemo} from 'react';`;
  });
}

// We need an add type definition for successCount
content = content.replace(/viralCount: number, ratio: number \}> = \{\};/, 'viralCount: number, ratio: number, successCount?: number }> = {};');


fs.writeFileSync('src/components/Radar.tsx', content, 'utf8');
console.log('Optimized successfully');
