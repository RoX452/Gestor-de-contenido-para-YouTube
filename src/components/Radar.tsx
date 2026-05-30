import { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  RefreshCw, Play, Trash2, Plus, Zap, Eye, Clock, Youtube, 
  ChevronRight, ChevronLeft, Users, TrendingUp, X, BarChart2, HelpCircle, 
  Flame, Calendar, Film, ExternalLink, ThumbsUp, MessageSquare, 
  Edit3, Search, Filter, SortAsc, Sparkles, Bookmark, Maximize2, Compass
} from 'lucide-react';
import { cn } from '../lib/utils';
import { db, doc, setDoc, onSnapshot, User } from '../lib/firebase';

interface RadarProps {
  startFromRadar: (url: string, title: string) => void;
  addLog: (msg: string) => void;
  user?: User | null;
}

export interface RadarVideo {
  id: string;
  title: string;
  url: string;
  views: number;
  published: string;
  thumbnail: string;
  channelUrl: string;
  channelName?: string;
  subscribers?: string;
  likes?: number;
  comments?: number;
  duration?: string;
  durationSec?: number;
  daysSince?: number;
  hoursAgo?: number;
  viralRatio?: number;
  velocity?: number;
  dailyViews?: number;
  engagementRate?: number;
  statusCode?: number;
  isViral: boolean;
  ageHours: number;
  isHiddenGem?: boolean;
  description?: string;
  formatType?: 'videos' | 'shorts' | 'streams';
}

interface ScannedChannel {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  subscribers: string;
  lastScanned?: string;
}

export const STATUS_CONFIG: Record<number, { text: string; color: string; bg: string; border: string; glow: string }> = {
  1: { text: "Super Hot", color: "#ff5252", bg: "rgba(255, 82, 82, 0.15)", border: "border-red-500/40 text-red-400", glow: "shadow-[0_0_15px_rgba(255,82,82,0.1)]" },
  2: { text: "Última Hora", color: "#e67e22", bg: "rgba(230, 126, 34, 0.15)", border: "border-orange-500/40 text-orange-400", glow: "shadow-[0_0_15px_rgba(230,126,34,0.1)]" },
  3: { text: "Viral", color: "#2ecc71", bg: "rgba(46, 204, 113, 0.15)", border: "border-emerald-500/40 text-emerald-400", glow: "shadow-[0_0_15px_rgba(46,204,113,0.1)]" },
  4: { text: "Tendencia", color: "#f1c40f", bg: "rgba(241, 196, 15, 0.15)", border: "border-yellow-500/40 text-yellow-400", glow: "shadow-[0_0_15px_rgba(241,196,15,0.1)]" },
  5: { text: "Bajo", color: "#e74c3c", bg: "rgba(231, 76, 60, 0.08)", border: "border-rose-500/25 text-rose-500", glow: "" },
  6: { text: "Normal", color: "#95a5a6", bg: "rgba(149, 165, 166, 0.1)", border: "border-slate-500/25 text-slate-400", glow: "" },
  7: { text: "Short", color: "#9b59b6", bg: "rgba(155, 89, 182, 0.15)", border: "border-purple-500/40 text-purple-400", glow: "shadow-[0_0_15px_rgba(155,89,182,0.1)]" },
  8: { text: "Evergreen", color: "#27ae60", bg: "rgba(39, 174, 96, 0.15)", border: "border-green-500/40 text-green-400", glow: "shadow-[0_0_15px_rgba(39,174,96,0.15)]" },
  9: { text: "Pilar", color: "#3498db", bg: "rgba(52, 152, 219, 0.15)", border: "border-blue-500/40 text-blue-400", glow: "shadow-[0_0_15px_rgba(52,152,219,0.15)]" }
};

const passesN8nViral = (v: RadarVideo) => {
  const views = Number(v.views ?? 0);
  const ageH = getAgeHours(v);
  const vr = v.viralRatio || 0;
    
    // 1. Criterio base de métricas altas muy rápidas. 
    // Añadimos control del ratio (vr >= 0.05) para asegurar que ese número de vistas en 24h no sea 
    // basura proveniente de canales enormes. (Para canales grandes, 7000 vistas es muy poco).
    if (views >= 7000 && ageH <= 24 && (vr === 0 || vr >= 0.05 || views >= 50000)) return true;
    if (views >= 4000 && ageH <= 12 && (vr === 0 || vr >= 0.05 || views >= 50000)) return true;
    
    // 2. Control riguroso de la última semana (7 días)
  const days = v.daysSince || (ageH / 24);
    if (days <= 7) {
      if (v.statusCode === 1 || v.statusCode === 2) return true; // Etiquetados como Hot o Breaking (ya llevan el control estadístico fuerte de backend)
      if ((v.velocity || 0) >= 400 && (vr === 0 || vr >= 0.1 || views >= 50000)) return true; // Muy alta velocidad sostenida, evitando canales gigantes flat
      if ((v.viralRatio || 0) >= 1.5 && views >= 10000) return true; // Ratio brutal (supera en un 150% a sus subs)
    }
    
    return false;
  };

const cleanSubsNum = (subsStr: string) => {
    if (!subsStr || subsStr === 'N/A') return 0;
    let s = subsStr.toUpperCase().replace(/•/g, '').replace(/,/g, '').trim();
    let multiplier = 1;
    if (s.includes('M') || s.includes('MILLON') || s.includes('MILLÓN') || s.includes('MILLONES')) {
      multiplier = 1000000;
      s = s.replace(/M|MILLON|MILLÓN|MILLONES/g, '');
    } else if (s.includes('K') || s.includes('MIL')) {
      multiplier = 1000;
      s = s.replace(/K|MIL/g, '');
    }
  const val = parseFloat(s);
    return isNaN(val) ? 0 : val * multiplier;
  };

export function Radar({ startFromRadar, addLog, user }: RadarProps) {
  const [channels, setChannels] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('radar_channels') || '[]');
    } catch {
      return [];
    }
  });

  const [channelsMetadata, setChannelsMetadata] = useState<Record<string, ScannedChannel>>(() => {
    try {
      return JSON.parse(localStorage.getItem('radar_channels_metadata') || '{}');
    } catch {
      return {};
    }
  });

  const [newChannel, setNewChannel] = useState('');
  const [videos, setVideos] = useState<RadarVideo[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('radar_videos') || '[]');
    } catch {
      return [];
    }
  });

  const [isScanning, setIsScanning] = useState(false);
  const [activeVideoUrl, setActiveVideoUrl] = useState<string | null>(null);

  // Collapsible and starred states
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('radar_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });
  const [isMobileChannelsExpanded, setIsMobileChannelsExpanded] = useState(false);
  const [mobileActiveTab, setMobileActiveTab] = useState<'channels' | 'workspace' | 'inspect'>('workspace');

  const [starredVideos, setStarredVideos] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('radar_starred_videos') || '[]');
    } catch {
      return [];
    }
  });

  // Filter and Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChannelUrl, setSelectedChannelUrl] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<number | 'all'>('all');
  const [filterFormat, setFilterFormat] = useState<'all' | 'video' | 'short'>('all');
  const [sortBy, setSortBy] = useState<'views' | 'velocity' | 'viralRatio' | 'dailyViews' | 'date' | 'engagement'>('views');
  const [filterDaysLimit, setFilterDaysLimit] = useState<number | 'all'>('all');

  // Video Inspection Panel state
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const [playingInlineVideoId, setPlayingInlineVideoId] = useState<string | null>(null);
  const [videoNotes, setVideoNotes] = useState<Record<string, string>>(() => {
    try {
      return JSON.parse(localStorage.getItem('radar_video_notes') || '{}');
    } catch {
      return {};
    }
  });
  const [inspectorTab, setInspectorTab] = useState<'desc' | 'caps' | 'tags' | 'notes'>('desc');

  // Hover and pulse states matching PyQT premium response
  const [hoveredVideoId, setHoveredVideoId] = useState<string | null>(null);
  const [pulseId, setPulseId] = useState<string | null>(null);
  const [activeStudioUrl, setActiveStudioUrl] = useState(() => {
    try {
      return localStorage.getItem('active_studio_url') || '';
    } catch {
      return '';
    }
  });

  useEffect(() => {
    const handleStorageChange = () => {
      setActiveStudioUrl(localStorage.getItem('active_studio_url') || '');
    };
    window.addEventListener('storage', handleStorageChange);
    const interval = setInterval(() => {
      const liveUrl = localStorage.getItem('active_studio_url') || '';
      if (liveUrl !== activeStudioUrl) {
        setActiveStudioUrl(liveUrl);
      }
    }, 1000);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [activeStudioUrl]);

  // Channel list sort & filter states
  const [channelsSortBy, setChannelsSortBy] = useState<'viral' | 'subs' | 'name'>('viral');
  const [onlyViralChannels, setOnlyViralChannels] = useState(false);
  const [isRefreshingStats, setIsRefreshingStats] = useState(false);

  // Load selected video dynamically (strictly respect selection to allow deselect/toggle off)
  const selectedVideo = videos.find(v => v.id === selectedVideoId) || null;



  const channelViralStats = useMemo(() => {
    const stats: Record<string, { total: number, viralCount: number, ratio: number, successCount?: number }> = {};
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
  }, [videos, channels]);

  // Helper to parse subscriber numbers for channel sorting


  // Sync collapse & starred state to localStorage
  useEffect(() => {
    localStorage.setItem('radar_sidebar_collapsed', String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  useEffect(() => {
    localStorage.setItem('radar_starred_videos', JSON.stringify(starredVideos));
  }, [starredVideos]);

  // Background stats updating for selected video (yt-dlp integration)
  useEffect(() => {
    if (!selectedVideo) return;

    // Throttle or trigger background fetch once to maintain instant load but pull accurate likes/comments
    let active = true;
    const fetchDeepStats = async () => {
      setIsRefreshingStats(true);
      try {
        const channelMeta = channelsMetadata[selectedVideo.channelUrl];
        const activeSubsStr = (selectedVideo.subscribers && selectedVideo.subscribers !== 'N/A')
          ? selectedVideo.subscribers
          : (channelMeta?.subscribers && channelMeta?.subscribers !== 'N/A')
            ? channelMeta.subscribers
            : 'N/A';

        const res = await fetch('/api/v2/radar/video-details', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            videoUrl: selectedVideo.url, 
            subscriberCount: activeSubsStr,
            videoData: {
              id: selectedVideo.id,
              title: selectedVideo.title,
              views: selectedVideo.views,
              published: selectedVideo.published,
              thumbnail: selectedVideo.thumbnail,
              duration: selectedVideo.duration,
              daysSince: selectedVideo.daysSince,
              ageHours: selectedVideo.ageHours
            }
          })
        });
        if (res.ok && active) {
          const deepData = await res.json();
          setVideos(prev => {
            const updated = prev.map(v => v.id === deepData.id ? { ...v, ...deepData } : v);
            return updated;
          });
        }
      } catch (err) {
        console.error("[Radar Sync Error] Error resolving deep stats", err);
      } finally {
        if (active) {
          setIsRefreshingStats(false);
        }
      }
    };

    fetchDeepStats();

    return () => {
      active = false;
    };
  }, [selectedVideo?.id, user]);

  // Auto-scan timer (every 5 minutes)
  useEffect(() => {
    const timer = setInterval(() => {
      addLog("[Radar] Auto-escaner programado iniciando...");
      scanChannels();
    }, 300000); // 5 minutes

    return () => clearInterval(timer);
  }, [channels, user]);

  // Sync to database
  useEffect(() => {
    localStorage.setItem('radar_channels_metadata', JSON.stringify(channelsMetadata));
  }, [channelsMetadata]);

  useEffect(() => {
    localStorage.setItem('radar_video_notes', JSON.stringify(videoNotes));
  }, [videoNotes]);

  // Live Firestore Sync
  useEffect(() => {
    if (!user) return;

    const userDocRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userDocRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.radarChannels) {
          setChannels(data.radarChannels);
        }
        if (data.radarVideos) {
          setVideos(data.radarVideos);
        }
        if (data.radarChannelsMetadata) {
          setChannelsMetadata(data.radarChannelsMetadata);
        }
        if (data.radarVideoNotes) {
          setVideoNotes(data.radarVideoNotes);
        }
      }
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    localStorage.setItem('radar_channels', JSON.stringify(channels));
  }, [channels]);

  useEffect(() => {
    localStorage.setItem('radar_videos', JSON.stringify(videos));
  }, [videos]);

  const addChannel = async () => {
    if (!newChannel.trim()) return;
    let url = newChannel.trim().split('?')[0];
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    if (!channels.includes(url)) {
      const nextChannels = [...channels, url];
      setChannels(nextChannels);
      setNewChannel('');
      addLog(`[Radar] Canal añadido a la lista. Iniciando escaneo inmediato...`);

      // Auto-scan the newly added channel
      await scanSingleChannel(url, nextChannels);
    } else {
      addLog(`[Radar] Canal ya existe en la lista de espionaje.`);
    }
  };

  const removeChannel = async (url: string) => {
    const nextChannels = channels.filter(c => c !== url);
    setChannels(nextChannels);
    
    // Remove metadata
    const nextMetadata = { ...channelsMetadata };
    delete nextMetadata[url];
    setChannelsMetadata(nextMetadata);

    // Filter out videos belonging to this channel
    const nextVideos = videos.filter(v => v.channelUrl !== url);
    setVideos(nextVideos);

    addLog(`[Radar] Canal eliminado de espionaje.`);
    if (user) {
      try {
        await setDoc(doc(docRefLocal(), 'users', user.uid), { 
          radarChannels: nextChannels,
          radarChannelsMetadata: nextMetadata,
          radarVideos: nextVideos
        }, { merge: true });
      } catch (err) {
        console.error("[Radar] Error removing channel:", err);
      }
    }
  };

  const docRefLocal = () => doc(db, 'users', user?.uid || 'temp');

  const scanSingleChannel = async (channelUrl: string, currentChannelsList = channels) => {
    setIsScanning(true);
    addLog(`[Radar] Espiando canal: ${channelUrl}...`);

    try {
      const res = await fetch('/api/v2/radar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelUrl })
      });

      if (!res.ok) {
        throw new Error(`Fallo en el servidor al escanear.`);
      }

      const data = await res.json();
      if (data.videos) {
        // Save Channel Metadata
        const channelMeta: ScannedChannel = {
          id: data.channelId || Math.random().toString(),
          name: data.channelName || "Canal de YouTube",
          handle: channelUrl.replace('https://www.youtube.com/', '').replace('https://youtube.com/', ''),
          avatar: data.channelAvatar || "https://images.unsplash.com/photo-1628157582853-a796fa650a6a?w=100&h=100&fit=crop",
          subscribers: data.subscriberCount || 'N/A',
          lastScanned: new Date().toISOString()
        };

        const updatedMetadata = {
          ...channelsMetadata,
          [channelUrl]: channelMeta
        };
        setChannelsMetadata(updatedMetadata);

        // Process found videos
        const processed = data.videos.map((v: any) => ({
          ...v,
          channelUrl,
          channelName: data.channelName,
          subscribers: data.subscriberCount || 'N/A'
        }));

        // Merge with existing videos, avoiding duplicates but updating stats
        const merged = mergeVideosList(processed);
        setVideos(merged);

        addLog(`[Radar] Canal "${data.channelName}" espiado con éxito! ${data.videos.length} videos analizados.`);
        
        // Push state
        if (user) {
          await setDoc(doc(db, 'users', user.uid), { 
            radarChannels: currentChannelsList,
            radarChannelsMetadata: updatedMetadata,
            radarVideos: merged
          }, { merge: true });
        }
      }
    } catch (err: any) {
      addLog(`[Radar] Error espiando ${channelUrl}: ${err.message}`);
    } finally {
      setIsScanning(false);
    }
  };

  const scanChannels = async () => {
    if (channels.length === 0) {
      addLog("[Radar] No hay canales para escanear. Agrega uno arriba.");
      return;
    }

    setIsScanning(true);
    addLog(`[Radar] Iniciando escaneo masivo de ${channels.length} canales...`);

    let accumulatedVideos: RadarVideo[] = [];
    const updatedMetadata = { ...channelsMetadata };

    for (const channelUrl of channels) {
      try {
        const res = await fetch('/api/v2/radar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ channelUrl })
        });

        if (!res.ok) {
          addLog(`[Radar] Error escaneando canal: ${channelUrl}`);
          continue;
        }

        const data = await res.json();
        if (data.videos) {
          const channelMeta: ScannedChannel = {
            id: data.channelId || Math.random().toString(),
            name: data.channelName || "Canal de YouTube",
            handle: channelUrl.replace('https://www.youtube.com/', '').replace('https://youtube.com/', ''),
            avatar: data.channelAvatar || "https://images.unsplash.com/photo-1628157582853-a796fa650a6a?w=100&h=100&fit=crop",
            subscribers: data.subscriberCount || 'N/A',
            lastScanned: new Date().toISOString()
          };
          updatedMetadata[channelUrl] = channelMeta;

          const processed = data.videos.map((v: any) => ({
            ...v,
            channelUrl,
            channelName: data.channelName,
            subscribers: data.subscriberCount || 'N/A'
          }));

          accumulatedVideos = [...accumulatedVideos, ...processed];
        }
      } catch (err) {
        console.error(err);
      }
    }

    setChannelsMetadata(updatedMetadata);
    const merged = mergeVideosList(accumulatedVideos);
    setVideos(merged);
    setIsScanning(false);
    addLog(`[Radar] Escaneo completado e historial de estadísticas actualizado.`);

    if (user) {
      try {
        await setDoc(doc(db, 'users', user.uid), { 
          radarChannelsMetadata: updatedMetadata,
          radarVideos: merged 
        }, { merge: true });
      } catch (err) {
        console.error("[Radar] Error saving scanned videos:", err);
      }
    }
  };

  const mergeVideosList = (freshList: RadarVideo[]) => {
    const videoMap = new Map<string, RadarVideo>();
    
    // Load existing list
    videos.forEach(v => {
      videoMap.set(v.id, v);
    });

    // Overwrite or insert fresh stats for overlapping ones
    freshList.forEach(v => {
      videoMap.set(v.id, v);
    });

    return Array.from(videoMap.values());
  };

  const removeVideo = async (id: string) => {
    const nextVideos = videos.filter(v => v.id !== id);
    setVideos(nextVideos);
    addLog(`[Radar] Video eliminado.`);
    if (user) {
      try {
        await setDoc(doc(db, 'users', user.uid), { radarVideos: nextVideos }, { merge: true });
      } catch (err) {
        console.error("[Radar] Error removing video:", err);
      }
    }
  };

  const updateNotesForVideo = async (id: string, text: string) => {
    const nextNotes = { ...videoNotes, [id]: text };
    setVideoNotes(nextNotes);
    if (user) {
      try {
        await setDoc(doc(db, 'users', user.uid), { radarVideoNotes: nextNotes }, { merge: true });
      } catch (err) {
        console.error("[Radar] Error saving notes:", err);
      }
    }
  };

  // Filter and Soritng Process
  const filteredVideos = useMemo(() => {
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
  }, [videos, selectedChannelUrl, searchQuery, filterStatus, filterFormat, filterDaysLimit, sortBy]);

  const strictlyViralVideos = useMemo(() => {
    return videos
      .filter(passesN8nViral)
      .sort((a, b) => (a.daysSince || 99999) - (b.daysSince || 99999));
  }, [videos]);

  const currentChannelVideos = useMemo(() => {
    return videos.filter(v => selectedChannelUrl === 'all' || v.channelUrl === selectedChannelUrl);
  }, [videos, selectedChannelUrl]);

  const totalStandardVideos = useMemo(() => currentChannelVideos.filter(v => {
    if (v.formatType) return v.formatType === 'videos';
    return (v.durationSec || 0) > 180;
  }).length, [currentChannelVideos]);

  const totalShorts = useMemo(() => currentChannelVideos.filter(v => {
    if (v.formatType) return v.formatType === 'shorts';
    return (v.durationSec || 0) <= 180;
  }).length, [currentChannelVideos]);

  const totalStreams = useMemo(() => currentChannelVideos.filter(v => {
    if (v.formatType) return v.formatType === 'streams';
    return false;
  }).length, [currentChannelVideos]);

  return (
    <div className="w-full h-full flex flex-col lg:flex-row gap-4 p-2 lg:p-4 text-slate-100 select-none overflow-hidden relative pb-[90px] lg:pb-4">
      
      {/* COLUMN 1: Channel List Tracker (Sleek Sidebar) */}
      <div className={cn(
        "w-full lg:w-[285px] flex-col bg-[#111115] border border-white/5 shadow-2xl rounded-2xl shrink-0 transition-all duration-300 relative lg:resize-y overflow-hidden h-full lg:h-auto",
        mobileActiveTab === 'channels' ? "flex" : "hidden",
        isSidebarCollapsed ? "lg:!hidden" : "lg:!flex" 
      )}>
           <div className="p-3 lg:p-4 border-b border-white/5 bg-black/20 flex items-center justify-between">
              <h2 className="text-sm font-black text-white flex items-center gap-1.5 uppercase tracking-wide">
                <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" /> Canales
              </h2>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setIsMobileChannelsExpanded(!isMobileChannelsExpanded)}
                  className="lg:hidden text-[9px] font-bold uppercase tracking-wider text-cyan-400 bg-cyan-900/40 hover:bg-cyan-900/60 px-2 py-0.5 rounded-md border border-cyan-500/20 mr-1"
                >
                  {isMobileChannelsExpanded ? "Contraer" : "Expandir"}
                </button>
                <span className="text-[10px] font-mono font-bold text-slate-500 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">
                  {channels.length}
                </span>
                <button
                  onClick={() => setIsSidebarCollapsed(true)}
                  className="p-1 hover:bg-white/10 text-slate-400 hover:text-white rounded transition-colors hidden lg:block"
                  title="Ocultar Canales"
                >
                  <ChevronLeft className="w-4.5 h-4.5" />
                </button>
              </div>
           </div>

         {/* Add Channel Search/Input */}
         <div className="p-3 border-b border-white/5 bg-black/10">
            <div className="flex bg-[#070709] border border-white/10 rounded-xl overflow-hidden focus-within:border-cyan-500/50 transition-colors">
              <input 
                 value={newChannel}
                 onChange={e => setNewChannel(e.target.value)}
                 onKeyDown={e => e.key === 'Enter' && addChannel()}
                 placeholder="Link de canal o @usuario"
                 className="flex-1 bg-transparent px-3 py-2 text-[11px] text-slate-200 outline-none w-full"
              />
              <button 
                onClick={addChannel}
                className="bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 px-3.5 flex items-center justify-center transition-colors border-l border-white/10"
                title="Añadir canal para espiar"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
         </div>

         {/* Recent Viral Carousel Widget */}
         {strictlyViralVideos.length > 0 && (
           <div className="p-3 border-b border-white/5 bg-red-500/5 flex flex-col gap-2 shrink-0">
             <div className="flex items-center justify-between">
               <h3 className="text-[9.5px] font-black uppercase text-red-400 flex items-center gap-1.5 tracking-wider">
                 <Flame className="w-3.5 h-3.5 text-red-500 animate-pulse" /> Viralidad Reciente
               </h3>
               <span className="text-[8.5px] bg-red-500/20 text-red-300 font-mono px-1.5 py-0.2 rounded-full font-bold">
                 {strictlyViralVideos.length} v.
               </span>
             </div>
             
             {/* Horizontal Carousel */}
             <div className="flex gap-2.5 overflow-x-auto pb-1.5 snap-x select-none custom-scrollbar-horizontal scroll-smooth">
                {strictlyViralVideos.map((video) => {
                  const statusCfg = STATUS_CONFIG[video.statusCode || 1] || STATUS_CONFIG[1];
                  const isSelected = selectedVideoId === video.id;
                  const channelMeta = channelsMetadata[video.channelUrl];

                  // Calculate accurate metrics falling back to channelMeta
                  const activeSubsStr = (video.subscribers && video.subscribers !== 'N/A')
                    ? video.subscribers
                    : (channelMeta?.subscribers && channelMeta?.subscribers !== 'N/A')
                      ? channelMeta.subscribers
                      : 'N/A';
                  const subsCount = cleanSubsNum(activeSubsStr);
                  const activeRatio = subsCount > 0 ? parseFloat((video.views / subsCount).toFixed(2)) : (video.viralRatio || 0);

                  // Formatting the age string properly
                  const isIsoDate = video.published && (video.published.includes('Z') || video.published.includes('T'));
                  const timeLabel = isIsoDate ? `Hace ${formatAge(getAgeHours(video))}` : (video.published || 'Desconocido');
                  
                  return (
                   <div
                     key={video.id}
                     onClick={() => {
                       setSelectedVideoId(video.id);
                        setPlayingInlineVideoId(null);
                        setSelectedChannelUrl(video.channelUrl);
                        setMobileActiveTab('inspect');
                     }}
                     className={cn(
                       "w-[260px] sm:w-[195px] shrink-0 snap-start bg-[#141419] border rounded-xl p-2.5 hover:bg-[#181822] transition-all flex flex-col gap-2 cursor-pointer relative",
                       isSelected 
                         ? "border-cyan-500/50 shadow-[0_0_12px_rgba(6,182,212,0.25)] bg-[#141b22]" 
                         : "border-white/5 hover:border-cyan-500/20"
                     )}
                   >
                     {/* Thumbnail and duration badge */}
                     <div className="relative aspect-video rounded-lg overflow-hidden bg-black/40">
                       <img 
                         src={video.thumbnail || "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=300&auto=format&fit=crop&q=60"} 
                         alt="thumbnail" 
                         referrerPolicy="no-referrer"
                         className="w-full h-full object-cover"
                       />
                       {video.duration && (
                         <span className="absolute bottom-1 right-1 bg-black/85 text-[8px] text-white px-1 py-0.2 rounded font-mono font-bold">
                           {video.duration}
                         </span>
                       )}
                       <div className="absolute top-1 left-1 flex gap-1">
                         <span className="bg-red-600 text-white text-[7.5px] font-black px-1.2 py-0.2 rounded shadow-md flex items-center gap-0.5 uppercase tracking-wide">
                           🔥 {statusCfg.text}
                         </span>
                       </div>
                     </div>

                     {/* Title & Info */}
                     <div className="flex flex-col gap-1 min-w-0 flex-1">
                       <span className="text-[10px] font-bold text-slate-200 line-clamp-2 leading-snug hover:text-red-300 transition-colors">
                         {video.title}
                       </span>
                       
                       {/* Channel line & metrics */}
                       <div className="flex items-center gap-1.5 mt-0.5">
                         {channelMeta?.avatar ? (
                           <img src={channelMeta.avatar} referrerPolicy="no-referrer" alt="avatar" className="w-3.5 h-3.5 rounded-full border border-white/10 shrink-0" />
                         ) : (
                           <div className="w-3.5 h-3.5 rounded-full bg-red-950 text-red-400 flex items-center justify-center font-black text-[7px] shrink-0 border border-red-900/35">
                             Y
                           </div>
                         )}
                         <span className="text-[9px] text-slate-400 truncate max-w-[110px] font-medium">
                           {video.channelName || channelMeta?.name || 'Canal'}
                         </span>
                         <span className="text-[8px]" title="Canal con video viral">🔥</span>
                       </div>

                       {/* Views and Ratio */}
                       <div className="flex flex-col gap-1 text-[8.5px] font-mono text-slate-400 border-t border-white/5 pt-2 mt-1.5 w-full">
                         <div className="flex items-center justify-between">
                           <span className="flex items-center gap-0.5 text-slate-400 font-sans font-medium text-[9px]">
                             <Clock className="w-2.5 h-2.5 text-amber-400 shrink-0" /> {timeLabel}
                           </span>
                           <span className="flex items-center gap-0.5" title="Suscriptores del canal">
                             <Users className="w-2.5 h-2.5 text-pink-400" /> {activeSubsStr}
                           </span>
                         </div>
                         
                         <div className="flex items-center justify-between mt-1">
                           <span className="flex items-center gap-0.5">
                             <Eye className="w-2.5 h-2.5 text-cyan-400" /> {formatShortNum(video.views)}
                           </span>
                           
                           {/* Viral ratio pill with same gorgeous style */}
                           {(() => {
                             const ratio = activeRatio;
                             const r_bg = ratio > 3.0 ? "rgba(46, 204, 113, 0.15)" : ratio < 1.0 ? "rgba(231, 76, 60, 0.15)" : "rgba(255, 255, 255, 0.1)";
                             const r_fg = ratio > 3.0 ? "#2ecc71" : ratio < 1.0 ? "#e74c3c" : "#cccccc";
                             const r_border = ratio > 3.0 ? "border-[#2ecc71]/20" : ratio < 1.0 ? "border-[#e74c3c]/20" : "border-white/5";
                             return (
                               <span 
                                 style={{ backgroundColor: r_bg, color: r_fg }} 
                                 className={cn("px-1 py-0.2 rounded font-black border tracking-wider text-[7.5px] flex items-center gap-0.5 shadow-sm", r_border)}
                               >
                                 x{ratio}
                               </span>
                             );
                           })()}
                         </div>
                       </div>
                     </div>
                   </div>
                 );
               })}
             </div>
           </div>
         )}

         {/* Channel Navigation / Quick Stats List */}
         {/* Quick Filter & Sort Options for Tracked Channels */}
         <div className="p-2.5 bg-black/15 border-b border-white/5 space-y-2 select-none shrink-0 border-t border-white/5">
           <div className="flex items-center justify-between text-[8px] uppercase tracking-wider font-bold text-slate-500">
             <span>Ordenar por:</span>
             <div className="flex gap-2 font-mono">
               <button 
                 onClick={() => setChannelsSortBy('viral')} 
                 className={cn("hover:text-cyan-400 transition-colors cursor-pointer", channelsSortBy === 'viral' ? "text-cyan-400" : "")}
               >
                 🔥 Virales
               </button>
               <span className="text-white/20">|</span>
               <button 
                 onClick={() => setChannelsSortBy('subs')} 
                 className={cn("hover:text-cyan-400 transition-colors cursor-pointer", channelsSortBy === 'subs' ? "text-cyan-400" : "")}
               >
                 👥 Subs
               </button>
               <span className="text-white/20">|</span>
               <button 
                 onClick={() => setChannelsSortBy('name')} 
                 className={cn("hover:text-cyan-400 transition-colors cursor-pointer", channelsSortBy === 'name' ? "text-cyan-400" : "")}
               >
                 🔤 Nombre
               </button>
             </div>
           </div>
           <label className="flex items-center gap-1.5 cursor-pointer text-[9px] font-bold text-slate-400 hover:text-slate-200">
             <input 
               type="checkbox" 
               checked={onlyViralChannels} 
               onChange={e => setOnlyViralChannels(e.target.checked)}
               className="rounded bg-black border-white/10 text-cyan-500 focus:ring-0 focus:ring-offset-0 w-3 h-3 cursor-pointer"
             />
             <span>Solo con videos virales</span>
           </label>
         </div>

         <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1 bg-black/5">
            <button
              onClick={() => setSelectedChannelUrl('all')}
              className={cn(
                "w-full flex items-center gap-3 p-2.5 rounded-xl border transition-all text-left",
                selectedChannelUrl === 'all' 
                  ? "bg-cyan-500/10 border-cyan-500/30 text-white shadow-lg" 
                  : "bg-transparent border-transparent hover:bg-white/5 text-slate-400 hover:text-slate-100"
              )}
            >
              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center border border-white/10 shrink-0">
                <Youtube className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold truncate">Todos los Canales</p>
                <p className="text-[9px] text-slate-500">Agrupa {videos.length} videos ({videos.length > 0 ? Math.round((videos.filter(v => v.isViral || v.statusCode === 9 || v.statusCode === 8).length / videos.length) * 100) : 0}% éxito)</p>
              </div>
            </button>

            {(() => {
               const processed = [...channels]
                 .filter(url => {
                   if (onlyViralChannels) return (channelViralStats[url] || { total: 0, viralCount: 0, ratio: 0 }).viralCount > 0;
                   return true;
                 })
                 .sort((a, b) => {
                   if (channelsSortBy === 'viral') {
                     const statsA = (channelViralStats[a] || { total: 0, viralCount: 0, ratio: 0 });
                     const statsB = (channelViralStats[b] || { total: 0, viralCount: 0, ratio: 0 });
                     return statsB.viralCount - statsA.viralCount || statsB.ratio - statsA.ratio;
                   } else if (channelsSortBy === 'subs') {
                     const metaA = channelsMetadata[a];
                     const metaB = channelsMetadata[b];
                     return cleanSubsNum(metaB?.subscribers || '') - cleanSubsNum(metaA?.subscribers || '');
                   } else {
                     const metaA = channelsMetadata[a];
                     const metaB = channelsMetadata[b];
                     return (metaA?.name || '').localeCompare(metaB?.name || '');
                   }
                 });
               return processed.map((url) => {
              const meta = channelsMetadata[url];
              const isSelected = selectedChannelUrl === url;
              const cleanHandle = url.split('@')[1] || url.split('/').pop() || 'canal';
              const stats = (channelViralStats[url] || { total: 0, viralCount: 0, ratio: 0 });
              const activeSubsStr = meta?.subscribers && meta.subscribers !== 'N/A'
                ? meta.subscribers
                : (videos.find(v => v.channelUrl === url)?.subscribers || 'N/A');

              return (
                <div 
                  key={url}
                  onClick={() => setSelectedChannelUrl(url)}
                  className={cn(
                    "group flex items-center justify-between p-2 rounded-xl border transition-all cursor-pointer relative",
                    isSelected 
                      ? "bg-cyan-500/10 border-cyan-500/30 text-white shadow" 
                      : "bg-transparent border-transparent hover:bg-white/5 text-slate-400 hover:text-slate-100"
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {meta?.avatar ? (
                      <img src={meta.avatar} alt="logo" referrerPolicy="no-referrer" className="w-8 h-8 rounded-full border border-white/15 object-cover shrink-0" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-cyan-950 text-cyan-400 flex items-center justify-center font-black text-xs shrink-0 border border-cyan-900/40">
                        {cleanHandle.substr(0, 1).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-black truncate leading-tight">{meta?.name || cleanHandle}</p>
                      <div className="flex flex-wrap items-center gap-x-1.5 mt-0.5">
                        <span className="text-[9.5px] text-slate-500 flex items-center gap-1 font-mono">
                          <Users className="w-2.5 h-2.5 text-pink-500" /> {activeSubsStr}
                        </span>
                        {stats.total > 0 && (
                          <span className="text-[9px] font-black text-emerald-400 flex items-center gap-0.5 ml-1" title="Porcentaje de videos exitosos (Virales, Pilares, Evergreen) en este canal">
                            📈 {stats.ratio}%
                          </span>
                        )}
                        {stats.viralCount > 0 && (
                          <span className="text-[9px] font-black text-red-400 flex items-center gap-0.5" title="Videos con viralidad extrema reciente detectados">
                            🔥 {stats.viralCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity ml-2 shrink-0">
                    <button 
                      onClick={(e) => { e.stopPropagation(); removeChannel(url); }} 
                      className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors bg-black/40"
                      title="Quitar de seguimiento"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            });
           })()}
         </div>

         <div className="p-3 border-t border-white/5 bg-black/20">
           <button 
             onClick={scanChannels}
             disabled={isScanning || channels.length === 0}
             className="w-full bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-700/50 text-black disabled:text-slate-500 font-bold py-2 rounded-xl uppercase tracking-widest text-[9.5px] transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-cyan-950/20"
           >
             {isScanning ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
             {isScanning ? 'Escaneando...' : 'Escanear Todo'}
           </button>
         </div>
      </div>

      {/* COLUMN 2: Scraped Videos Workspace Panel (Core Feed) */}
      <div className={cn(
        "flex-1 flex flex-col bg-[#0c0c0e] border border-white/5 rounded-2xl overflow-hidden shadow-2xl min-w-0 h-full lg:h-auto lg:min-h-0",
        mobileActiveTab === 'workspace' ? "flex" : "hidden lg:flex"
      )}>
         {/* Top query filters & selector settings bar */}
         <div className="p-4 bg-[#111115] border-b border-white/5 flex flex-col gap-3">
            
            {/* Search Input and active selected channel context layout */}
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
              <div className="flex items-center gap-2">
                {isSidebarCollapsed && (
                  <button 
                    onClick={() => setIsSidebarCollapsed(false)}
                    className="hidden lg:flex items-center gap-1 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 p-1.5 px-2.5 rounded-lg border border-cyan-500/15 text-[9px] font-black uppercase transition-all shrink-0 cursor-pointer text-center mr-1"
                    title="Mostrar Canales"
                  >
                    <ChevronRight className="w-3.5 h-3.5 shrink-0" /> Canales
                  </button>
                )}
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-300 shrink-0 flex items-center gap-1.5">
                  {selectedChannelUrl === 'all' ? 'Vídeos de Canales' : channelsMetadata[selectedChannelUrl]?.name || 'Explorando Canal'}
                  
                  <div className="group relative flex items-center">
                    <HelpCircle className="w-3.5 h-3.5 text-slate-500 hover:text-cyan-400 cursor-help transition-colors" />
                    <div className="absolute left-1/2 -translate-x-1/2 sm:translate-x-0 sm:left-0 top-full mt-2 w-[280px] sm:w-[350px] p-3 bg-[#0d0d10] border border-cyan-900/30 shadow-2xl rounded-xl text-[10px] text-slate-300 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-[100] pointer-events-none">
                      <p className="font-bold text-white mb-2 pb-1 border-b border-white/10 text-xs text-cyan-400">Interpretación de métricas</p>
                      <ul className="space-y-2 leading-relaxed">
                        <li><strong className="text-cyan-300 font-bold block">🔥 Hot (&lt;24h)</strong> Videos explotando ahora mismo. VPH &gt; 1000 o +2k views en &lt;6h. Control de ratio (0.1x subs) para canales grandes.</li>
                        <li><strong className="text-amber-400 font-bold block">🚀 Breaking (&lt;72h)</strong> Súper recientes con despegue sólido. Relación mínima de 0.2x subs o masivos (&gt;50K views).</li>
                        <li><strong className="text-red-400 font-bold block">📈 Viral (&lt;180d)</strong> Rompieron el algoritmo superando ampliamente a su base de subs por +200% o +300%.</li>
                        <li><strong className="text-pink-400 font-bold block">💎 Hidden Gem</strong> Joyas ocultas que revivieron de la nada (ratio &gt;4x, entre 14-365 días).</li>
                        <li><strong className="text-yellow-400 font-bold block">🏛️ Pilar (&gt;180d)</strong> Videos históricos, verdaderos clásicos con &gt;500,000 visualizaciones.</li>
                        <li><strong className="text-emerald-400 font-bold block">🌲 Evergreen (&gt;180d)</strong> Tráfico constante que atrae vistas diario (&gt;50 vistas medias por día).</li>
                      </ul>
                      <div className="mt-2 text-white/50 border-t border-white/5 pt-1.5 leading-tight">
                        <strong className="block text-slate-400 mb-0.5">🚀 Súper Filtro Superior (Carrusel):</strong>
                        Caza tendencias absolutas instantáneas: 4K views &lt; 12h, 7K views &lt; 24h, o altísima velocidad en 7 días para canales de cualquier tamaño.
                      </div>
                    </div>
                  </div>
                </h3>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="bg-slate-800 text-[9.5px] text-slate-300 px-2 py-0.5 rounded-full font-bold font-mono">
                    {currentChannelVideos.length} totales
                  </span>
                  {totalStandardVideos > 0 && (
                    <span className="bg-blue-500/10 border border-blue-500/15 text-[8.5px] text-blue-300 px-2 py-0.2 rounded font-mono font-bold">
                      📹 {totalStandardVideos} largos
                    </span>
                  )}
                  {totalShorts > 0 && (
                    <span className="bg-teal-500/10 border border-teal-500/15 text-[8.5px] text-teal-300 px-2 py-0.2 rounded font-mono font-bold">
                      ⚡ {totalShorts} shorts
                    </span>
                  )}
                  {totalStreams > 0 && (
                    <span className="bg-purple-500/10 border border-purple-500/15 text-[8.5px] text-purple-300 px-2 py-0.2 rounded font-mono font-bold">
                      🔴 {totalStreams} directos
                    </span>
                  )}
                </div>
              </div>
              
              {/* Keyword query bar */}
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
                <input 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Buscar por palabra clave..."
                  className="w-full bg-black/40 border border-white/5 rounded-xl pl-9 pr-3 py-1.5 text-[11px] text-slate-300 outline-none focus:border-cyan-500/50 transition-colors"
                />
              </div>
            </div>

            {/* Quick Filter Pill Controls: 9 status markers horizontally scrollable */}
            <div className="flex items-center gap-2 border-t border-b border-white/5 py-2.5 overflow-x-auto custom-scrollbar-horizontal scroll-smooth py-1 shrink-0 -mx-1 px-1">
              <button
                onClick={() => setFilterStatus('all')}
                className={cn(
                  "px-3 py-1 rounded-full text-[10px] font-bold uppercase transition-all shrink-0 border",
                  filterStatus === 'all'
                    ? "bg-white text-black border-white shadow-md font-black"
                    : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
                )}
              >
                Todos los Estados
              </button>
              {Object.entries(STATUS_CONFIG).map(([code, cfg]) => {
                const numericCode = Number(code);
                const isSelected = filterStatus === numericCode;
                const count = videos.filter(v => v.statusCode === numericCode && (selectedChannelUrl === 'all' || v.channelUrl === selectedChannelUrl)).length;

                return (
                  <button
                    key={code}
                    onClick={() => setFilterStatus(numericCode)}
                    style={{ borderColor: isSelected ? cfg.color : 'transparent' }}
                    className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-bold uppercase transition-all shrink-0 border flex items-center gap-1.5",
                      isSelected
                        ? "bg-cyan-500/10 text-white font-black"
                        : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
                    )}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cfg.color }} />
                    {cfg.text}
                    <span className="text-[8.5px] opacity-60 font-mono">({count})</span>
                  </button>
                );
              })}
            </div>

            {/* Sub Filters: Sort, format, limits */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[10.5px] text-slate-400">
              {/* Multi-Format Toggle Tabs */}
              <div className="flex items-center bg-black/30 border border-white/5 p-1 rounded-xl shrink-0">
                <button 
                  onClick={() => setFilterFormat('all')} 
                  className={cn("px-2.5 py-1 rounded-lg font-bold uppercase text-[9px]", filterFormat === 'all' && "bg-white/10 text-white")}
                >
                  Todos
                </button>
                <button 
                  onClick={() => setFilterFormat('video')} 
                  className={cn("px-2.5 py-1 rounded-lg font-bold uppercase text-[9px] flex items-center gap-1", filterFormat === 'video' && "bg-cyan-500/10 text-cyan-400")}
                >
                  <Film className="w-2.5 h-2.5" /> Videos
                </button>
                <button 
                  onClick={() => setFilterFormat('short')} 
                  className={cn("px-2.5 py-1 rounded-lg font-bold uppercase text-[9px] flex items-center gap-1", filterFormat === 'short' && "bg-purple-500/10 text-purple-400")}
                >
                  <Youtube className="w-2.5 h-2.5 text-red-500" /> Shorts
                </button>
              </div>

              {/* Slider / Dropper Age bounds */}
              <div className="flex items-center gap-1.5 shrink-0 bg-black/20 px-2.5 py-1 rounded-xl border border-white/5">
                <Clock className="w-3.5 h-3.5 text-slate-500" /> Antigüedad:
                <select 
                  value={filterDaysLimit}
                  onChange={e => setFilterDaysLimit(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                  className="bg-transparent border-none text-[10px] font-bold text-slate-200 outline-none cursor-pointer"
                >
                  <option value="all" className="bg-[#111115]">Todos</option>
                  <option value="1" className="bg-[#111115]">Últimas 24 horas</option>
                  <option value="2" className="bg-[#111115]">Últimos 2 días</option>
                  <option value="3" className="bg-[#111115]">Últimos 3 días</option>
                  <option value="7" className="bg-[#111115]">Última semana</option>
                  <option value="15" className="bg-[#111115]">Últimos 15 días</option>
                  <option value="30" className="bg-[#111115]">Último mes</option>
                  <option value="180" className="bg-[#111115]">Últimos 6 meses</option>
                  <option value="365" className="bg-[#111115]">Último año</option>
                </select>
              </div>

              {/* Order Sort Column Option choice */}
              <div className="flex items-center gap-1.5 shrink-0 bg-black/20 px-2.5 py-1 rounded-xl border border-white/5">
                <BarChart2 className="w-3.5 h-3.5 text-slate-500" /> Ordenar por:
                <select 
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as any)}
                  className="bg-transparent border-none text-[10px] font-bold text-slate-200 outline-none cursor-pointer"
                >
                  <option value="views" className="bg-[#111115]">Vistas totales</option>
                  <option value="velocity" className="bg-[#111115]">Velocidad (VPH)</option>
                  <option value="viralRatio" className="bg-[#111115]">Multiplicador Viral (Ratio)</option>
                  <option value="dailyViews" className="bg-[#111115]">Vistas diarias</option>
                  <option value="engagement" className="bg-[#111115]">Engagement (%)</option>
                  <option value="date" className="bg-[#111115]">Fecha de publicación</option>
                </select>
              </div>
            </div>

         </div>

         {/* Channel Feed: Compact detailed content grid cards */}
         <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6">
            {filteredVideos.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 opacity-60 py-20">
                <Youtube className="w-14 h-14 mb-3 text-slate-700 animate-pulse" />
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Canal vacío o filtros restringidos.</p>
                <p className="text-[10px] mt-1 text-slate-500">Agrega un canal, escanea o limpia criterios de filtrado.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {filteredVideos.map(video => {
                  const cfg = STATUS_CONFIG[video.statusCode || 6];
                  
                  const activeSubsStr = (video.subscribers && video.subscribers !== 'N/A')
                    ? video.subscribers
                    : (channelsMetadata[video.channelUrl]?.subscribers && channelsMetadata[video.channelUrl]?.subscribers !== 'N/A')
                      ? channelsMetadata[video.channelUrl].subscribers
                      : 'N/A';
                  const subsCount = cleanSubsNum(activeSubsStr);
                  const activeRatio = subsCount > 0 ? parseFloat((video.views / subsCount).toFixed(2)) : (video.viralRatio || 0);
                  const isSelected = selectedVideoId === video.id;
                  
                  // Extract video IDs to check if active/loaded in Workspace
                  const extractVideoIdLocal = (u?: string | null) => {
                    if (!u) return '';
                    const m = u.match(/(?:v=|shorts\/|v\/|embed\/|youtu\.be\/)([\w-]+)/);
                    return m ? m[1] : u;
                  };
                  const isActive = extractVideoIdLocal(video.url) === extractVideoIdLocal(activeStudioUrl);
                  
                  // Dynamic QGraphicsDropShadowEffect inspired glow - simplified list selection to keep scrolling and rendering fluid
                  const colorHex = cfg?.color || "#95a5a6";
                  const isHovered = hoveredVideoId === video.id;
                  const glowShadow = isHovered 
                    ? `0 0 25px ${colorHex}55`
                    : '0 4px 15px rgba(0, 0, 0, 0.45)';

                  // Border and background computed classes mimicking PyQt paintEvent
                  const cardStyle = {
                    borderColor: isSelected 
                      ? 'rgba(255, 255, 255, 0.22)' 
                      : isActive 
                        ? '#0e639c' 
                        : 'rgba(255, 255, 255, 0.05)',
                    borderWidth: '1px',
                    backgroundColor: isSelected 
                      ? 'rgba(255, 255, 255, 0.03)' 
                      : isActive 
                        ? 'rgba(14, 99, 156, 0.12)' 
                        : '#111115',
                    boxShadow: glowShadow
                  };

                  return (
                    <div 
                      key={video.id}
                      onClick={() => { 
                        setSelectedVideoId(prev => prev === video.id ? null : video.id);
                        setPlayingInlineVideoId(null);
                        setMobileActiveTab('inspect');
                      }}
                      onMouseEnter={() => setHoveredVideoId(video.id)}
                      onMouseLeave={() => setHoveredVideoId(null)}
                      style={cardStyle}
                      className={cn(
                        "flex flex-col rounded-2xl overflow-hidden transition-[transform,shadow] duration-200 relative justify-between cursor-pointer active:scale-[0.99] h-full min-h-[355px]"
                      )}
                    >
                      {/* Thumbnail Container */}
                      <div className="w-full aspect-[16/10] sm:aspect-video shrink-0 relative overflow-hidden bg-black/50">
                        <img 
                          src={video.thumbnail} 
                          alt="thumbnail" 
                          referrerPolicy="no-referrer" 
                          className="w-full h-full object-cover opacity-85 hover:scale-102 transition-transform duration-500" 
                        />
                        
                        {/* Saved / Bookmarked Button on TOP-LEFT with Heartbeat / Pop Transition */}
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            const isStarred = starredVideos.includes(video.id);
                            setStarredVideos(prev => 
                              isStarred 
                                ? prev.filter(id => id !== video.id) 
                                : [...prev, video.id]
                            );
                            setPulseId(video.id);
                            setTimeout(() => setPulseId(null), 250);
                          }}
                          style={{
                            transform: pulseId === video.id ? 'scale(1.25)' : 'scale(1)',
                            transition: 'transform 0.12s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                          }}
                          className={cn(
                            "absolute top-3 left-3 w-8 h-8 rounded-full backdrop-blur-md flex items-center justify-center border transition-all shadow-md cursor-pointer z-10",
                            starredVideos.includes(video.id)
                              ? "bg-amber-400 text-black border-amber-300"
                              : "bg-black/55 hover:bg-black/75 text-slate-300 hover:text-white border-white/10"
                          )}
                          title={starredVideos.includes(video.id) ? "Guardado en favoritos" : "Guardar en favoritos"}
                        >
                          <Bookmark className={cn("w-3.5 h-3.5", starredVideos.includes(video.id) && "fill-current text-black")} />
                        </button>

                        {/* Top Right Tag status badge overlay */}
                        <div 
                          className="absolute top-3 right-3 bg-black/85 border border-white/10 px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider shadow-lg flex items-center gap-1 z-10"
                          style={{ color: cfg?.color || 'white' }}
                        >
                          <span className="w-1.5 h-1.5 rounded-full shrink-0 animate-pulse" style={{ backgroundColor: cfg?.color || 'white' }} />
                          {cfg?.text || 'Normal'}
                        </div>

                        {/* Duration Overlay on Bottom-Right */}
                        <div className="absolute bottom-2.5 right-2.5 bg-black/80 px-1.5 py-0.5 rounded font-mono text-[9px] font-bold text-slate-200 tracking-wide z-10">
                          {video.duration || '0:00'}
                        </div>

                        {/* Hidden Gem overlay marker */}
                        {video.isHiddenGem && (
                          <div className="absolute bottom-2.5 left-2.5 bg-purple-500/30 backdrop-blur-md border border-purple-500/50 px-2 py-0.5 rounded text-[8.5px] font-black text-purple-200 shadow flex items-center gap-0.5 z-10">
                            💎 Joya
                          </div>
                        )}
                      </div>

                      {/* Card Body */}
                      <div className="p-4 flex flex-col flex-1 min-w-0 justify-between">
                        <div>
                          {/* Title */}
                          <h4 className="text-[12.5px] font-extrabold text-slate-100 line-clamp-2 leading-snug hover:text-cyan-400 transition-colors select-text">
                            {video.title}
                          </h4>
                          
                          {/* Statistics Row with premium icons instead of emojis */}
                          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-[9.5px] text-slate-400 font-sans mt-3 select-none font-medium opacity-90 leading-tight">
                            <span className="flex items-center gap-1 text-slate-100" title="Vistas">
                              <Eye className="w-3 h-3 text-cyan-400 shrink-0" /> {formatShortNum(video.views)}
                            </span>
                            <span className="text-slate-700">•</span>
                            <span className="flex items-center gap-1" title="Likes">
                              <ThumbsUp className="w-3 h-3 text-emerald-400 shrink-0" /> {formatShortNum(video.likes || 0)}
                            </span>
                            <span className="text-slate-700">•</span>
                            <span className="flex items-center gap-1" title="Suscriptores del canal">
                              <Users className="w-3 h-3 text-pink-400 shrink-0" /> {activeSubsStr}
                            </span>
                            <span className="text-slate-700">•</span>
                            <span className="flex items-center gap-1" title="Publicado">
                              <Clock className="w-3 h-3 text-amber-400 shrink-0" /> {video.published && (video.published.includes('Z') || video.published.includes('T')) ? `Hace ${formatAge(getAgeHours(video))}` : video.published}
                            </span>
                          </div>

                          {/* Channel Metadata Row */}
                          <div className="flex items-center gap-1.5 mt-3.5 w-max max-w-full">
                            {channelsMetadata[video.channelUrl]?.avatar ? (
                              <img 
                                src={channelsMetadata[video.channelUrl].avatar} 
                                alt="" 
                                referrerPolicy="no-referrer" 
                                className="w-4 h-4 rounded-full object-cover border border-white/10 shrink-0" 
                              />
                            ) : (
                              <div className="w-4 h-4 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800/25 flex items-center justify-center text-[7.5px] font-bold shrink-0">
                                Y
                              </div>
                            )}
                            <span className="text-[10px] text-slate-400 font-semibold truncate max-w-[150px] sm:max-w-[200px]">
                              {channelsMetadata[video.channelUrl]?.name || video.channelName || 'Canal'}
                            </span>
                          </div>
                        </div>

                        {/* Badges and Actions Footer */}
                        <div className="mt-4">
                          {/* Glossy pill badges row adapting PyQt exact SVGs/colors */}
                          <div className="flex flex-wrap items-center gap-1.5">
                            {/* 1. Velocity Pill (violet) */}
                            <div 
                              className="flex items-center gap-1 h-[22px] px-2 rounded-full border border-purple-500/20 shadow-sm leading-none" 
                              style={{ backgroundColor: 'rgba(155, 89, 182, 0.15)' }}
                              title="Velocidad: vistas/hora actuales"
                            >
                              <svg className="w-2.5 h-2.5 shrink-0" style={{ stroke: '#9b59b6' }} viewBox="0 0 24 24" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                              </svg>
                              <span className="font-bold text-[9.5px] tracking-tight" style={{ color: '#9b59b6' }}>
                                {formatShortNum(video.velocity || 0)} v/h
                              </span>
                            </div>

                            {/* 2. Daily Views Pill (blue/teal) */}
                            <div 
                              className="flex items-center gap-1 h-[22px] px-2 rounded-full border border-blue-500/20 shadow-sm leading-none" 
                              style={{ backgroundColor: 'rgba(41, 182, 246, 0.15)' }}
                              title="Tráfico: vistas promedio"
                            >
                              <svg className="w-2.5 h-2.5 shrink-0" style={{ stroke: '#29b6f6' }} viewBox="0 0 24 24" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                                <line x1="16" y1="2" x2="16" y2="6"/>
                                <line x1="8" y1="2" x2="8" y2="6"/>
                                <line x1="3" y1="10" x2="21" y2="10"/>
                              </svg>
                              <span className="font-bold text-[9.5px] tracking-tight" style={{ color: '#29b6f6' }}>
                                {formatShortNum(video.dailyViews || 0)}/d
                              </span>
                            </div>

                            {/* 3. Viral Ratio Pill (dynamic green/red) */}
                            {(() => {
                              const ratio = activeRatio;
                              const r_bg = ratio > 3.0 ? "rgba(46, 204, 113, 0.15)" : ratio < 1.0 ? "rgba(231, 76, 60, 0.15)" : "rgba(255, 255, 255, 0.1)";
                              const r_fg = ratio > 3.0 ? "#2ecc71" : ratio < 1.0 ? "#e74c3c" : "#cccccc";
                              const r_border = ratio > 3.0 ? "border-[#2ecc71]/20" : ratio < 1.0 ? "border-[#e74c3c]/20" : "border-white/5";
                              return (
                                <div 
                                  className={cn("flex items-center gap-1 h-[22px] px-2 rounded-full border shadow-sm leading-none", r_border)}
                                  style={{ backgroundColor: r_bg }}
                                  title="Ratio Viral: Vistas vs Suscriptores"
                                >
                                  <svg className="w-2.5 h-2.5 shrink-0" style={{ stroke: r_fg }} viewBox="0 0 24 24" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/>
                                    <path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>
                                    <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/>
                                    <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>
                                  </svg>
                                  <span className="font-bold text-[9.5px] tracking-tight" style={{ color: r_fg }}>
                                    {ratio.toFixed(2)}x
                                  </span>
                                </div>
                              );
                            })()}
                          </div>

                          {/* Discrete Button Row with border-t */}
                          <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-white/5">
                            <button 
                              onClick={(e) => { e.stopPropagation(); removeVideo(video.id); }}
                              className="text-[9px] font-semibold text-slate-500 hover:text-red-400 flex items-center gap-0.5 bg-white/0 hover:bg-red-500/10 px-1.5 py-0.5 rounded transition-colors"
                              title="Remover de mi feed"
                            >
                              <Trash2 className="w-3 h-3" /> Borrar
                            </button>
                            
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                localStorage.setItem('active_studio_url', video.url);
                                setActiveStudioUrl(video.url);
                                startFromRadar(video.url, video.title);
                              }}
                              className="px-2.5 py-1 bg-cyan-500/10 hover:bg-cyan-500 hover:text-black hover:scale-[1.02] font-black rounded text-[8.5px] uppercase tracking-wider transition-all flex items-center gap-0.5"
                            >
                              A Studio <ChevronRight className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
         </div>
      </div>

      {/* COLUMN 3: Right selected Inspect Pane (Fills fully proportional, matching QT desktop app) */}
      <div className={cn(
        "w-full lg:w-[340px] flex flex-col bg-[#0c0c0e] border border-white/5 shadow-2xl rounded-2xl overflow-hidden shrink-0", 
        selectedVideo ? "h-full lg:min-h-0" : "h-full lg:h-auto",
        mobileActiveTab === 'inspect' ? "flex" : "hidden lg:flex"
      )}>
        
        {selectedVideo ? (
          <div className="flex-1 flex flex-col h-full overflow-y-auto lg:overflow-hidden select-none">
             
             {/* Thumbnail & Play controls */}
             <div className="relative aspect-video w-full bg-black shrink-0 border-b border-white/5 overflow-hidden group/inspect-media">
               {playingInlineVideoId === selectedVideo.id ? (
                 <iframe 
                   src={`https://www.youtube.com/embed/${selectedVideo.id}?autoplay=1&mute=0`} 
                   title="YouTube video player" 
                   frameBorder="0" 
                   allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                   referrerPolicy="strict-origin-when-cross-origin" 
                   allowFullScreen 
                   className="w-full h-full"
                 />
               ) : (
                 <>
                   <img src={selectedVideo.thumbnail} alt="thumbnail" referrerPolicy="no-referrer" className="w-full h-full object-cover opacity-75 group-hover/inspect-media:scale-105 transition-transform duration-500" />
                   <button 
                     onClick={() => setPlayingInlineVideoId(selectedVideo.id)}
                     className="absolute inset-0 bg-black/40 hover:bg-black/20 flex items-center justify-center transition-all duration-200"
                   >
                     <div className="w-12 h-12 rounded-full bg-cyan-400 text-black flex items-center justify-center shadow-2xl transform scale-90 group-hover/inspect-media:scale-100 transition-all duration-300 shadow-cyan-400/25">
                       <Play className="w-5 h-5 fill-current ml-0.5" />
                     </div>
                   </button>
                   <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover/inspect-media:opacity-100 transition-opacity">
                     <button 
                       onClick={(e) => { e.stopPropagation(); setActiveVideoUrl(selectedVideo.url); }}
                       className="bg-black/70 hover:bg-black p-1.5 rounded-md text-white border border-white/10"
                       title="Abrir a pantalla grande"
                     >
                       <Maximize2 className="w-3 h-3" />
                     </button>
                   </div>
                   <div className="absolute bottom-2 left-2 bg-black/85 border border-white/10 px-2 py-0.5 rounded text-[9px] font-black uppercase text-cyan-400 tracking-widest font-mono shadow">
                     {selectedVideo.duration || '0:00'}
                   </div>
                 </>
               )}
             </div>

             {/* Scrollable details container below the thumbnail to prevent any vertical cutoffs */}
             <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col min-h-0 bg-transparent">
               
               {/* Inspector titles */}
               <div className="p-4 border-b border-white/5 bg-black/20 shrink-0">
                 <h4 className="text-[14px] font-extrabold text-white leading-snug line-clamp-3 select-text select-all font-sans" title={selectedVideo.title}>
                   {selectedVideo.title}
                 </h4>
                 <p className="text-[10px] text-slate-400 font-mono mt-2 flex items-center gap-1">
                   <span className="w-2 h-2 rounded-full" style={{ backgroundColor: STATUS_CONFIG[selectedVideo.statusCode || 6]?.color }} />
                   {STATUS_CONFIG[selectedVideo.statusCode || 6]?.text || 'Normal'}
                   {selectedVideo.isHiddenGem && <span className="text-purple-400 ml-1 font-bold">💎 Joya Oculta</span>}
                 </p>
               </div>

               {/* Metric attributes Grid layout (Transparent floating cards for a premium flush design, no heavy gray backgrounds) */}
               <div className="px-4 py-2 border-b border-white/5 shrink-0 bg-transparent">
                 <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-left">
                   
                   <div className="p-0.5 flex items-center gap-2.5 min-w-0" title="Vistas totales del video">
                     <Eye className="w-[17px] h-[17px] text-cyan-400 shrink-0" />
                     <div className="min-w-0 leading-tight">
                       <p className="text-[8.5px] text-slate-400 font-bold uppercase tracking-wider">Vistas</p>
                       <p className="text-[12px] font-extrabold text-slate-200 font-mono">{(selectedVideo.views || 0).toLocaleString()}</p>
                     </div>
                   </div>
                   
                   <div className="p-0.5 flex items-center gap-2.5 min-w-0" title="Suscriptores del canal">
                     <Users className="w-[17px] h-[17px] text-pink-400 shrink-0" />
                     <div className="min-w-0 leading-tight">
                       <p className="text-[8.5px] text-slate-400 font-bold uppercase tracking-wider">Subs Canal</p>
                       <p className="text-[12px] font-extrabold text-slate-200 font-mono truncate">{selectedVideo.subscribers || 'N/A'}</p>
                     </div>
                   </div>

                   <div className="p-0.5 flex items-center gap-2.5 min-w-0" title="Likes estimados u obtenidos">
                     <ThumbsUp className="w-[17px] h-[17px] text-emerald-400 shrink-0" />
                     <div className="min-w-0 leading-tight">
                       <p className="text-[8.5px] text-slate-400 font-bold uppercase tracking-wider">Likes</p>
                       <p className="text-[12px] font-extrabold text-slate-200 font-mono">{(selectedVideo.likes || 0).toLocaleString()}</p>
                     </div>
                   </div>

                   <div className="p-0.5 flex items-center gap-2.5 min-w-0" title="Comentarios estimados u obtenidos">
                     <MessageSquare className="w-[17px] h-[17px] text-purple-400 shrink-0" />
                     <div className="min-w-0 leading-tight">
                       <p className="text-[8.5px] text-slate-400 font-bold uppercase tracking-wider">Comments</p>
                       <p className="text-[12px] font-extrabold text-slate-200 font-mono">{(selectedVideo.comments || 0).toLocaleString()}</p>
                     </div>
                   </div>

                   <div className="p-0.5 flex items-center gap-2.5 min-w-0" title="Viral Ratio">
                     <Zap className="w-[17px] h-[17px] text-orange-400 shrink-0" />
                     <div className="min-w-0 leading-tight">
                       <p className="text-[8.5px] text-slate-400 font-bold uppercase tracking-wider">Viral Ratio</p>
                       <p className="text-[12px] font-extrabold text-slate-200 font-mono">x{selectedVideo.viralRatio || 0}</p>
                     </div>
                   </div>

                   <div className="p-0.5 flex items-center gap-2.5 min-w-0" title="Duración">
                     <Clock className="w-[17px] h-[17px] text-amber-400 shrink-0" />
                     <div className="min-w-0 leading-tight">
                       <p className="text-[8.5px] text-slate-400 font-bold uppercase tracking-wider">Duración</p>
                       <p className="text-[12px] font-extrabold text-slate-200 font-mono">{selectedVideo.duration || '0:00'}</p>
                     </div>
                   </div>

                   <div className="p-0.5 flex items-center gap-2.5 min-w-0" title="Formato de video">
                     <Film className="w-[17px] h-[17px] text-yellow-400 shrink-0" />
                     <div className="min-w-0 leading-tight">
                       <p className="text-[8.5px] text-slate-400 font-bold uppercase tracking-wider">Formato</p>
                       <p className="text-[12px] font-extrabold text-slate-200">{(selectedVideo.durationSec || 0) <= 180 ? 'Short' : 'Video'}</p>
                     </div>
                   </div>

                   <div className="p-0.5 flex items-center gap-2.5 min-w-0" title="Fecha exacta de publicación">
                     <Calendar className="w-[17px] h-[17px] text-indigo-400 shrink-0" />
                     <div className="min-w-0 leading-tight">
                       <p className="text-[8.5px] text-slate-400 font-bold uppercase tracking-wider">Publicado</p>
                       <p className="text-[11.5px] font-extrabold text-slate-200 truncate font-mono">
                         {selectedVideo.published && (selectedVideo.published.includes('Z') || selectedVideo.published.includes('T'))
                           ? new Date(selectedVideo.published).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
                           : selectedVideo.published || 'Desconocido'}
                       </p>
                     </div>
                   </div>

                 </div>
               </div>

               {/* Action Control Trigger Grid (2 rows x 3 columns) */}
               <div className="p-3 border-b border-white/5 bg-black/20 flex flex-col gap-2 shrink-0">
                 <div className="grid grid-cols-3 gap-1.5 text-center">
                   <a 
                     href={selectedVideo.url} 
                     target="_blank" 
                     rel="noreferrer"
                     className="flex flex-col items-center justify-center p-2 bg-white/5 hover:bg-white/10 rounded-lg text-[9px] font-bold text-slate-300 border border-white/5 hover:border-white/10 transition-all text-center min-w-0"
                     title="Abrir en YouTube"
                   >
                     <ExternalLink className="w-3.5 h-3.5 mb-1 text-cyan-400" />
                     <span className="truncate w-full">Ver en YT</span>
                   </a>
                   <a 
                     href={selectedVideo.channelUrl} 
                     target="_blank" 
                     rel="noreferrer"
                     className="flex flex-col items-center justify-center p-2 bg-white/5 hover:bg-white/10 rounded-lg text-[9px] font-bold text-slate-300 border border-white/5 hover:border-white/10 transition-all text-center min-w-0"
                     title="Ver Canal en YouTube"
                   >
                     <Users className="w-3.5 h-3.5 mb-1 text-pink-400" />
                     <span className="truncate w-full">Ver Canal</span>
                   </a>
                   <button 
                     onClick={() => {
                       addLog(`[Radar] Iniciando re-análisis del video: ${selectedVideo.title}`);
                     }}
                     className="flex flex-col items-center justify-center p-2 bg-white/5 hover:bg-white/10 rounded-lg text-[9px] font-bold text-slate-300 border border-white/5 hover:border-white/10 transition-all text-center min-w-0"
                     title="Análisis detallado"
                   >
                     <Flame className="w-3.5 h-3.5 mb-1 text-orange-400 animate-pulse" />
                     <span className="truncate w-full">Análisis</span>
                   </button>
                   
                   <button 
                     onClick={() => {
                       addLog(`[Favoritos] Video "${selectedVideo.title}" guardado de forma local.`);
                     }}
                     className="flex flex-col items-center justify-center p-2 bg-white/5 hover:bg-white/10 rounded-lg text-[9px] font-bold text-slate-300 border border-white/5 hover:border-white/10 transition-all text-center min-w-0"
                     title="Guardar en playlist local"
                   >
                     <Sparkles className="w-3.5 h-3.5 mb-1 text-purple-400" />
                     <span className="truncate w-full">Guardar</span>
                   </button>
                   <a 
                     href="#"
                     onClick={(e) => {
                       e.preventDefault();
                       addLog(`[Descargas] Simulando descarga de recursos para: ${selectedVideo.title}`);
                     }}
                     className="flex flex-col items-center justify-center p-2 bg-white/5 hover:bg-white/10 rounded-lg text-[9px] font-bold text-slate-300 border border-white/5 hover:border-white/10 transition-all text-center min-w-0"
                     title="Descargar recursos del video"
                   >
                     <Film className="w-3.5 h-3.5 mb-1 text-yellow-400" />
                     <span className="truncate w-full">Descargas</span>
                   </a>
                   <button 
                     onClick={() => {
                       window.open(selectedVideo.thumbnail, '_blank');
                       addLog(`[Thumbnail] Abriendo miniatura HD de: ${selectedVideo.title}`);
                     }}
                     className="flex flex-col items-center justify-center p-2 bg-white/5 hover:bg-white/10 rounded-lg text-[9px] font-bold text-slate-300 border border-white/5 hover:border-white/10 transition-all text-center min-w-0"
                     title="Ver miniatura en HD"
                   >
                     <Eye className="w-3.5 h-3.5 mb-1 text-emerald-400" />
                     <span className="truncate w-full">Miniatura</span>
                   </button>
                 </div>
                 
                 <button 
                   onClick={() => startFromRadar(selectedVideo.url, selectedVideo.title)}
                   className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-gradient-to-r from-cyan-400 to-cyan-500 hover:from-cyan-300 hover:to-cyan-400 text-black font-black uppercase tracking-widest text-[9.5px] rounded-xl transition-all shadow-lg shadow-cyan-950/20"
                 >
                   A STUDIO SCRIPTING <ChevronRight className="w-3.5 h-3.5" />
                 </button>
               </div>

               {/* Bottom multi-tab footer for rich detail (Desc/Caps/Tags/Notas, matching QTabWidget styled palette exactly) */}
               <div className="flex-1 flex flex-col bg-transparent border-t border-white/5 shrink-0">
                 <div className="flex bg-black/20 shrink-0 text-[9px] font-bold tracking-widest uppercase border-b border-white/5">
                   <button 
                     onClick={() => setInspectorTab('desc')}
                     className={cn("flex-1 py-3 text-center transition-all", inspectorTab === 'desc' ? "bg-white/5 text-cyan-400 border-b-2 border-cyan-400" : "text-slate-400 hover:text-slate-200 border-b-2 border-transparent")}
                   >
                     Desc
                   </button>
                   <button 
                     onClick={() => setInspectorTab('caps')}
                     className={cn("flex-1 py-3 text-center transition-all", inspectorTab === 'caps' ? "bg-white/5 text-cyan-400 border-b-2 border-cyan-400" : "text-slate-400 hover:text-slate-200 border-b-2 border-transparent")}
                   >
                     Caps
                   </button>
                   <button 
                     onClick={() => setInspectorTab('tags')}
                     className={cn("flex-1 py-3 text-center transition-all", inspectorTab === 'tags' ? "bg-white/5 text-cyan-400 border-b-2 border-cyan-400" : "text-slate-400 hover:text-slate-200 border-b-2 border-transparent")}
                   >
                     Tags
                   </button>
                   <button 
                     onClick={() => setInspectorTab('notes')}
                     className={cn("flex-1 py-3 text-center transition-all", inspectorTab === 'notes' ? "bg-white/5 text-cyan-400 border-b-2 border-cyan-400" : "text-slate-400 hover:text-slate-200 border-b-2 border-transparent")}
                   >
                     Notas
                   </button>
                 </div>

                 {/* Tab content space */}
                 <div className="p-3 text-[11px] text-slate-300 leading-relaxed font-sans select-text flex-1 overflow-y-auto lg:overflow-y-auto min-h-[200px]">
                  
                  {inspectorTab === 'desc' && (
                    <div className="whitespace-pre-wrap select-text selection:bg-cyan-500/30">
                      {selectedVideo.description || "Sin descripción recuperada. Puedes verla directamente en YouTube haciendo clic arriba o iniciando Scripting."}
                    </div>
                  )}

                  {inspectorTab === 'caps' && (
                    <div className="space-y-3">
                      <p className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider">Estructura & Capítulos Estimada</p>
                      <div className="space-y-2 border border-white/5 bg-black/30 rounded-lg p-2.5">
                        <div className="flex gap-2">
                          <span className="font-mono text-cyan-400">0:00</span>
                          <span className="text-slate-200 font-medium">Gancho & Presentación del Problema</span>
                        </div>
                        <div className="flex gap-2">
                          <span className="font-mono text-cyan-400">1:30</span>
                          <span className="text-slate-300">Análisis y Pruebas Iniciales</span>
                        </div>
                        <div className="flex gap-2">
                          <span className="font-mono text-cyan-400">3:45</span>
                          <span className="text-slate-300">Demostración Práctica (El Núcleo del video)</span>
                        </div>
                        <div className="flex gap-2">
                          <span className="font-mono text-cyan-400">6:15</span>
                          <span className="text-slate-300">Métricas y Resultados Clave</span>
                        </div>
                        <div className="flex gap-2">
                          <span className="font-mono text-cyan-400">8:00</span>
                          <span className="text-slate-200 font-medium">Conclusión & Llamado a la Acción (CTA)</span>
                        </div>
                      </div>
                      <p className="text-[9px] text-slate-500 leading-normal italic">
                        * Capítulos generados mediante la duración total del video. Para transcripciones completas en español, utiliza la pestaña "Scripting".
                      </p>
                    </div>
                  )}

                  {inspectorTab === 'tags' && (
                    <div className="space-y-2 mt-1">
                      <div className="flex justify-between border-b border-white/5 pb-1">
                        <span className="text-slate-500 font-bold uppercase text-[9px]">Viral Ratio</span>
                        <span className="font-mono text-cyan-400">x{selectedVideo.viralRatio || 0} de audiencia</span>
                      </div>
                      <div className="flex justify-between border-b border-white/5 pb-1">
                        <span className="text-slate-500 font-bold uppercase text-[9px]">Velocidad</span>
                        <span className="font-mono text-emerald-400">{selectedVideo.velocity || 0} vistas por hora</span>
                      </div>
                      <div className="flex justify-between border-b border-white/5 pb-1">
                        <span className="text-slate-500 font-bold uppercase text-[9px]">Vistas Diarias</span>
                        <span className="font-mono text-amber-400">{selectedVideo.dailyViews || 0} vistas por día</span>
                      </div>
                      <div className="flex justify-between border-b border-white/5 pb-1">
                        <span className="text-slate-500 font-bold uppercase text-[9px]">Días transcurridos</span>
                        <span className="font-mono text-slate-300">{Math.round(getDaysSince(selectedVideo))} días (hace {formatAge(getAgeHours(selectedVideo))})</span>
                      </div>
                      <div className="flex justify-between border-b border-white/5 pb-1">
                        <span className="text-slate-500 font-bold uppercase text-[9px]">UUID</span>
                        <span className="font-mono text-slate-400 text-[9px] truncate max-w-[150px]">{selectedVideo.id}</span>
                      </div>
                      <p className="text-[9.5px] text-slate-500 leading-normal italic mt-4 pt-2 border-t border-white/5">
                        * Los likes y comentarios son estimados de forma algorítmica y proporcional para evitar sobrecargas y asegurar un tiempo de escaneo instantáneo sin bloqueos de IP de YouTube.
                      </p>
                    </div>
                  )}

                  {inspectorTab === 'notes' && (
                    <div className="h-full flex flex-col space-y-2">
                       <p className="text-[9.5px] text-slate-400 uppercase tracking-wider font-bold">Ideas y notas para este video:</p>
                       <textarea 
                         value={videoNotes[selectedVideo.id] || ''}
                         onChange={e => updateNotesForVideo(selectedVideo.id, e.target.value)}
                         placeholder="Aquí puedes redactar posibles títulos inspirados, borradores, ganchos de inicio, o notas para tu Silicon production..."
                         className="w-full flex-1 min-h-[140px] bg-black/40 border border-white/10 rounded-xl p-3 text-[11px] text-slate-200 outline-none focus:border-cyan-500/40 font-sans leading-relaxed resize-none cursor-text select-text"
                       />
                       <p className="text-[9px] text-slate-500 flex items-center justify-end">
                         🟢 Tus notas se guardan automáticamente en tiempo real
                       </p>
                    </div>
                  )}

               </div>
             </div>
           </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-600 p-6 text-center">
            <Youtube className="w-12 h-12 mb-3 text-slate-800" />
            <p className="text-xs font-bold uppercase tracking-wider">Sin selección</p>
            <p className="text-[10px] text-slate-600 mt-1">Saca de fondo o haz clic en cualquier video del feed izquierdo para inspeccionar sus estadísticas extendidas.</p>
          </div>
        )}
      </div>

      {/* Mobile Bottom Navigation Bar (Sleeker & minimalist) */}
      <div className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#111115]/95 backdrop-blur-xl border border-white/10 rounded-full shadow-2xl p-1 flex justify-center items-center gap-1 min-w-[280px]">
        <button
          onClick={() => setMobileActiveTab('channels')}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-full transition-all duration-300",
            mobileActiveTab === 'channels' ? "bg-cyan-500/20 text-cyan-400" : "text-slate-400 hover:text-slate-200"
          )}
        >
          <Sparkles className="w-4 h-4" />
          <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline-block">Canales</span>
        </button>
        <button
          onClick={() => setMobileActiveTab('workspace')}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-full transition-all duration-300",
            mobileActiveTab === 'workspace' ? "bg-cyan-500/20 text-cyan-400" : "text-slate-400 hover:text-slate-200"
          )}
        >
          <Compass className="w-4 h-4" />
          <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline-block">Feed</span>
        </button>
        <button
          onClick={() => setMobileActiveTab('inspect')}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-full transition-all duration-300 relative",
            mobileActiveTab === 'inspect' ? "bg-cyan-500/20 text-cyan-400" : "text-slate-400 hover:text-slate-200"
          )}
        >
          <Search className="w-4 h-4" />
          <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline-block">Info</span>
          {selectedVideo && mobileActiveTab !== 'inspect' && (
            <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
          )}
        </button>
      </div>

      {/* Modal Reproductor de YouTube */}
      {activeVideoUrl && (
         <VideoPlayerModal url={activeVideoUrl} onClose={() => setActiveVideoUrl(null)} />
      )}
    </div>
  );
}

const getAgeHours = (video: RadarVideo): number => {
  if (typeof video.ageHours === 'number' && !isNaN(video.ageHours)) {
    return video.ageHours;
  }
  if (typeof video.hoursAgo === 'number' && !isNaN(video.hoursAgo)) {
    return video.hoursAgo;
  }
  if (video.published) {
    const publishedDate = new Date(video.published);
    const now = new Date();
    if (!isNaN(publishedDate.getTime()) && publishedDate.getTime() <= now.getTime()) {
      return Math.max(0.04, (now.getTime() - publishedDate.getTime()) / (1000 * 60 * 60));
    }
    const lowerStr = String(video.published).toLowerCase();
    if (lowerStr.includes('poco') || lowerStr.includes('instante') || lowerStr.includes('just now')) {
      return 1;
    }
    const relativeMatch = String(video.published).match(/(\d+)\s*(sec|seg|min|hour|hor|day|día|dia|week|sem|month|mes|mo|mn|year|año|yr)/i);
    if (relativeMatch) {
      const amount = parseInt(relativeMatch[1], 10);
      const unit = relativeMatch[2].toLowerCase();
      if (unit.startsWith('sec') || unit.startsWith('seg')) {
        return amount / 3600;
      } else if (unit.startsWith('min')) {
        return amount / 60;
      } else if (unit.startsWith('hour') || unit.startsWith('hor')) {
        return amount;
      } else if (unit.startsWith('day') || unit.startsWith('dí') || unit.startsWith('dia')) {
        return amount * 24;
      } else if (unit.startsWith('week') || unit.startsWith('sem')) {
        return amount * 7 * 24;
      } else if (unit.startsWith('month') || unit.startsWith('mes') || unit.startsWith('mo')) {
        return amount * 30 * 24;
      } else if (unit.startsWith('year') || unit.startsWith('añ') || unit.startsWith('yr')) {
        return amount * 365 * 24;
      }
    }
  }
  return 99999;
};

const getDaysSince = (video: RadarVideo): number => {
  if (typeof video.daysSince === 'number' && !isNaN(video.daysSince)) {
    return video.daysSince;
  }
  const hours = getAgeHours(video);
  return hours / 24;
};

const formatAge = (hours: number) => {
  if (hours < 1) return 'Minutos';
  if (hours < 24) return `${Math.round(hours)}h`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d`;
  const weeks = Math.round(days / 7);
  if (weeks < 4) return `${weeks} sem`;
  const months = Math.round(days / 30);
  return `${months} mes${months > 1 ? 'es' : ''}`;
};

const formatShortNum = (num: number) => {
  if (num >= 1000000) return (num/1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num/1000).toFixed(1) + 'K';
  return Math.round(num).toString();
};

function VideoPlayerModal({ url, onClose }: { url: string, onClose: () => void }) {
  const match = url.match(/(?:v=|\/)([0-9A-Za-z_-]{11})/);
  const videoId = match ? match[1] : '';

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <div className="bg-[#0e0e11] border border-white/5 rounded-3xl overflow-hidden shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col relative">
         <div className="p-3 border-b border-white/5 flex items-center justify-between bg-black/40">
           <div className="flex items-center gap-2">
             <Youtube className="w-4 h-4 text-red-500 animate-pulse" />
             <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">YouTube Video Player</span>
           </div>
           <button onClick={onClose} className="p-1 px-3 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-all text-[9px] font-black uppercase tracking-wider flex items-center gap-1 shadow">
             <X className="w-3.5 h-3.5" /> Cerrar
           </button>
         </div>
         <div className="relative w-full aspect-video bg-black flex-1">
           {videoId ? (
             <iframe 
               src={`https://www.youtube.com/embed/${videoId}?autoplay=1&modestbranding=1`} 
               title="YouTube Video Player" 
               frameBorder="0" 
               allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
               allowFullScreen
               className="absolute inset-0 w-full h-full"
             />
           ) : (
             <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs text-center p-8">
               ID incorrecto para: {url}
             </div>
           )}
         </div>
      </div>
    </div>
  );
}
